'use server'

import { getPayloadClient } from '../lib/payload.ts'
import { lerMensagem, type Leitura } from '../commerce/orders/ler-mensagem.ts'
import { priceLine } from '../commerce/cart/price-line.ts'
import { getProductBySlug } from '../commerce/catalog/get-product.ts'

/**
 * O que a tela de "Novo pedido" precisa do servidor.
 *
 * Duas coisas: entender a mensagem que você colou e lançar a venda. O preço
 * nunca chega daqui do navegador — é recalculado no servidor pela mesma
 * função que o carrinho usa, que por sua vez chama o `guardLot`. Venda
 * lançada à mão e venda do site passam pela mesma régua.
 */

export async function lerMensagemColada(texto: string, aromas: string[]): Promise<Leitura> {
  // O `interpretador` entra aqui quando você ligar a IA: a leitura
  // determinística continua valendo e o modelo preenche só o que sobrou.
  return lerMensagem(texto, { aromas })
}

export type ItemDaVenda = {
  productSlug: string
  variantKey: string | null
  qty: number
  personalization: Record<string, string>
}

export type DadosDaVenda = {
  cliente: {
    nome: string
    email: string
    telefone: string
    tipoPessoa: 'PF' | 'PJ'
    documento: string
  }
  endereco: {
    cep: string
    rua: string
    numero: string
    complemento: string
    bairro: string
    cidade: string
    estado: string
  }
  itens: ItemDaVenda[]
  freteCentavos: number
  transportadora: string
  tipoEvento: string
  dataEvento: string
  observacao: string
  canal: 'whatsapp' | 'instagram_dm' | 'admin'
  formaDePagamento: 'pix' | 'credit_card' | 'debit_card' | 'mp_link' | 'external'
  /** Marcar como já pago: é o caso normal de venda fechada no WhatsApp. */
  jaPago: boolean
  /** Data real da venda, quando não foi hoje. ISO, opcional. */
  dataDaVenda?: string | null
  /** Identificador da mídia do comprovante, quando houver. */
  comprovanteId?: number | null
  /** A mensagem original, guardada junto do pedido. */
  mensagemOriginal?: string | null
}

export type ResultadoDaVenda =
  | { ok: true; numero: string; total: number; urlDoPedido: string }
  | { ok: false; mensagem: string }

export async function lancarVenda(dados: DadosDaVenda): Promise<ResultadoDaVenda> {
  if (!dados.cliente.nome.trim()) return { ok: false, mensagem: 'Falta o nome da cliente.' }
  if (!dados.itens.length) return { ok: false, mensagem: 'Escolha pelo menos um produto.' }

  const payload = await getPayloadClient()
  const itens = []
  let subtotal = 0

  for (const item of dados.itens) {
    const produto = await getProductBySlug(item.productSlug)
    if (!produto) return { ok: false, mensagem: `Produto "${item.productSlug}" não encontrado.` }

    // Mesma validação do carrinho: mínimo, faixa, aroma ativo, campos
    // obrigatórios. Lançar à mão não é motivo para furar a regra.
    const calculado = priceLine({
      product: produto.pricing,
      variantKey: item.variantKey,
      qty: item.qty,
      personalization: item.personalization,
      addons: [],
    })

    if (!calculado.ok) return { ok: false, mensagem: calculado.message }

    const linha = calculado.line
    subtotal += linha.total

    itens.push({
      product: Number(produto.id),
      productName: linha.productName,
      variantLabel: linha.variantLabel,
      sku: linha.sku,
      qty: linha.qty,
      unitPrice: linha.unitPrice,
      lotPrice: linha.lotPrice,
      lineTotal: linha.total,
      personalization: linha.personalization,
      unitCost: 0,
    })
  }

  const total = subtotal + dados.freteCentavos
  const numero = await proximoNumero(payload)
  const agora = dados.dataDaVenda ?? new Date().toISOString()

  const pedido = await payload.create({
    collection: 'orders',
    overrideAccess: true,
    data: {
      number: numero,
      // Venda fechada no WhatsApp já nasce paga: é isso que faz a conversão
      // voltar para a Meta e o valor entrar no faturamento do mês.
      status: dados.jaPago ? 'processing' : 'pending',
      channel: dados.canal,
      customerName: dados.cliente.nome,
      email: dados.cliente.email || null,
      phone: dados.cliente.telefone,
      personType: dados.cliente.tipoPessoa,
      document: dados.cliente.documento,
      items: itens,
      shippingAddress: {
        postalCode: dados.endereco.cep,
        street: dados.endereco.rua,
        number: dados.endereco.numero,
        complement: dados.endereco.complemento,
        district: dados.endereco.bairro,
        city: dados.endereco.cidade,
        state: dados.endereco.estado,
      },
      shippingService: dados.transportadora || null,
      eventType: dados.tipoEvento || null,
      eventDate: dados.dataEvento || null,
      customerNote: dados.observacao || null,
      subtotal,
      shippingTotal: dados.freteCentavos,
      discountTotal: 0,
      total,
      paymentMethod: dados.formaDePagamento,
      paymentReceipt: dados.comprovanteId ?? null,
      datePaid: dados.jaPago ? agora : null,
      notes: dados.mensagemOriginal
        ? [{ visibleToCustomer: false, text: `Mensagem da cliente:\n\n${dados.mensagemOriginal}` }]
        : [],
      events: [
        {
          at: agora,
          type: 'pedido_lancado',
          message: `Venda lançada no painel (${rotuloDoCanal(dados.canal)}).`,
          actor: 'equipe',
        },
      ],
    },
  })

  const loja = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'

  return {
    ok: true,
    numero: String(pedido.number ?? numero),
    total,
    urlDoPedido: `${loja.replace(/\/$/, '')}/admin/collections/orders/${pedido.id}`,
  }
}

/**
 * Guarda o comprovante que a cliente mandou.
 *
 * Vem como arquivo do formulário e vira uma mídia comum, que o pedido
 * referencia. Assim ele aparece no pedido e continua lá daqui a um ano,
 * quando a conversa do WhatsApp já se perdeu.
 */
export async function guardarComprovante(formData: FormData): Promise<{ id: number } | null> {
  const arquivo = formData.get('arquivo')
  if (!(arquivo instanceof File) || arquivo.size === 0) return null

  const payload = await getPayloadClient()
  const bytes = Buffer.from(await arquivo.arrayBuffer())

  const midia = await payload.create({
    collection: 'media',
    overrideAccess: true,
    data: { alt: 'Comprovante de pagamento' },
    file: {
      data: bytes,
      mimetype: arquivo.type || 'image/jpeg',
      name: arquivo.name || 'comprovante.jpg',
      size: bytes.length,
    },
  })

  return { id: Number(midia.id) }
}

function rotuloDoCanal(canal: DadosDaVenda['canal']): string {
  if (canal === 'whatsapp') return 'WhatsApp'
  if (canal === 'instagram_dm') return 'Instagram'
  return 'lançamento direto'
}

/**
 * Próximo número.
 *
 * Começa em 5000 para não colidir com os 237 pedidos que vêm do
 * WooCommerce, que mantêm o número antigo na migração.
 */
async function proximoNumero(payload: Awaited<ReturnType<typeof getPayloadClient>>): Promise<string> {
  const { docs } = await payload.find({
    collection: 'orders',
    sort: '-createdAt',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })

  const maior = docs.reduce((maximo, pedido) => {
    const numero = Number(pedido.number)
    return Number.isFinite(numero) && numero > maximo ? numero : maximo
  }, 4999)

  return String(maior + 1)
}
