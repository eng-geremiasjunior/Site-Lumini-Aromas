// Este módulo só roda no servidor: escreve no banco e fecha o carrinho.

import { getPayloadClient } from '../../lib/payload.ts'
import { getCart } from '../cart/cart-service.ts'
import { cotarFreteDoCarrinho, FRETE_A_COMBINAR_ID } from '../shipping/quote-cart.ts'
import { formatIsoDate, addBusinessDays } from '../shipping/business-days.ts'
import { totalComCupom } from '../coupons/coupon.ts'
import { montarCartao, nomeParaEntrega } from './presente.ts'
import { usarCartao } from '../giftcards/gift-card-service.ts'

/**
 * Criação do pedido.
 *
 * O pedido é uma fotografia da venda: nome do produto, preço da peça,
 * custo e personalização ficam gravados como estavam no momento da compra.
 * O produto pode mudar depois; o pedido não.
 *
 * Nada aqui confia no que veio do navegador. O carrinho é lido do banco,
 * os preços são recalculados e o frete é cotado de novo, para o valor
 * cobrado ser sempre o valor verdadeiro.
 */

export type DadosDoCliente = {
  nome: string
  email: string
  telefone: string
  tipoPessoa: 'PF' | 'PJ'
  documento: string
}

export type EnderecoEntrega = {
  cep: string
  rua: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  estado: string
}

export type DadosDoPedido = {
  cliente: DadosDoCliente
  endereco: EnderecoEntrega
  /** Identificador do serviço de frete escolhido na tela. */
  servicoFreteId: number | null
  tipoEvento?: string
  dataEvento?: string
  observacao?: string
  aceitouTermos: boolean
  optInWhatsapp?: boolean
  optInMarketing?: boolean
  /** Preenchido quando a compra é para presentear outra pessoa. */
  presente?: { de: string; para: string; mensagem: string } | null
}

export type ResultadoPedido =
  | { ok: true; numero: string; total: number }
  | { ok: false; mensagem: string; campo?: string }

/**
 * Número do pedido.
 *
 * Continua de onde o WooCommerce parou, começando em 5000, para não
 * colidir com os 237 pedidos históricos quando eles forem migrados.
 */
async function proximoNumero(): Promise<string> {
  const payload = await getPayloadClient()

  const ultimos = await payload.find({
    collection: 'orders',
    limit: 1,
    sort: '-createdAt',
    depth: 0,
    overrideAccess: true,
  })

  const ultimo = Number(ultimos.docs[0]?.number ?? 0)
  const proximo = Number.isFinite(ultimo) && ultimo >= 5000 ? ultimo + 1 : 5000
  return String(proximo)
}

function validar(dados: DadosDoPedido): { campo: string; mensagem: string } | null {
  const { cliente, endereco } = dados

  if (!cliente.nome?.trim()) return { campo: 'nome', mensagem: 'Informe o seu nome completo.' }
  if (!cliente.email?.includes('@')) return { campo: 'email', mensagem: 'Informe um e-mail válido.' }
  if (cliente.telefone?.replace(/\D/g, '').length < 10)
    return { campo: 'telefone', mensagem: 'Informe um WhatsApp com DDD.' }

  const documento = cliente.documento?.replace(/\D/g, '') ?? ''
  if (cliente.tipoPessoa === 'PF' && documento.length !== 11)
    return { campo: 'documento', mensagem: 'Informe um CPF com 11 números.' }
  if (cliente.tipoPessoa === 'PJ' && documento.length !== 14)
    return { campo: 'documento', mensagem: 'Informe um CNPJ com 14 números.' }

  if (endereco.cep?.replace(/\D/g, '').length !== 8)
    return { campo: 'cep', mensagem: 'Informe um CEP válido.' }
  if (!endereco.rua?.trim()) return { campo: 'rua', mensagem: 'Informe a rua.' }
  if (!endereco.numero?.trim()) return { campo: 'numero', mensagem: 'Informe o número.' }
  if (!endereco.bairro?.trim()) return { campo: 'bairro', mensagem: 'Informe o bairro.' }
  if (!endereco.cidade?.trim()) return { campo: 'cidade', mensagem: 'Informe a cidade.' }
  if (!endereco.estado?.trim()) return { campo: 'estado', mensagem: 'Informe o estado.' }

  // Exigido pelo Decreto 7.962: o aceite tem que ser um ato do cliente.
  if (!dados.aceitouTermos)
    return {
      campo: 'termos',
      mensagem: 'É preciso aceitar os termos e a política de trocas para finalizar.',
    }

  return null
}

export async function criarPedido(dados: DadosDoPedido): Promise<ResultadoPedido> {
  const erro = validar(dados)
  if (erro) return { ok: false, mensagem: erro.mensagem, campo: erro.campo }

  const carrinho = await getCart()
  if (carrinho.isEmpty) return { ok: false, mensagem: 'Seu carrinho está vazio.' }

  // O frete é cotado de novo aqui. O valor que veio da tela serve só para
  // saber qual serviço o cliente escolheu, nunca para definir o preço.
  const frete = await cotarFreteDoCarrinho(dados.endereco.cep)

  let freteEscolhido = null
  if (frete.ok) {
    freteEscolhido =
      frete.opcoes.find((opcao) => opcao.serviceId === dados.servicoFreteId) ?? frete.opcoes[0]
  }

  if (!freteEscolhido) {
    return {
      ok: false,
      campo: 'frete',
      mensagem:
        'Não conseguimos confirmar o frete para este endereço. Fale com a gente pelo WhatsApp para combinar a entrega.',
    }
  }

  const payload = await getPayloadClient()

  // Um cliente por e-mail. Se já comprou antes, o pedido novo entra na
  // mesma conta, e o histórico dele fica junto na Minha Conta.
  const clienteId = await garantirCliente(dados)

  const itens = await Promise.all(
    carrinho.lines.map(async (linha) => {
      const produto = await payload
        .findByID({ collection: 'products', id: linha.productId, depth: 0, overrideAccess: true })
        .catch(() => null)

      return {
        product: Number(linha.productId),
        productName: linha.productName,
        variantLabel: linha.variantLabel,
        sku: linha.sku,
        qty: linha.qty,
        unitPrice: linha.unitPrice,
        lotPrice: linha.lotPrice,
        lineTotal: linha.total,
        personalization: linha.personalization,
        addons: linha.addons,
        // Custo congelado: o lucro deste pedido não muda se o custo subir depois.
        unitCost: produto?.unitCost ?? 0,
      }
    }),
  )

  // O cupom é revalidado aqui, no servidor, junto com o preço e o frete.
  // O navegador não manda desconto: manda, no máximo, um código.
  const totais = totalComCupom(carrinho.subtotal, freteEscolhido.priceCents, carrinho.cupom)
  const total = totais.total

  // O cartão é conferido aqui, no servidor, como tudo o mais: recado longo
  // demais para caber impresso não deve virar pedido e só aparecer como
  // problema na hora de embalar.
  let cartaoImpresso = null
  if (dados.presente) {
    const conferido = montarCartao(dados.presente)
    if (!conferido.ok) {
      return { ok: false, mensagem: conferido.mensagem, campo: conferido.campo }
    }
    cartaoImpresso = conferido.cartao
  }

  const numero = await proximoNumero()

  // O cartão-presente é debitado aqui, uma vez só, com o número do pedido
  // já em mãos. Antes disso nada é abatido: carrinho abandonado com cartão
  // aplicado não pode consumir saldo de ninguém.
  let pagoComCartao = 0
  if (carrinho.cartaoPresente) {
    const uso = await usarCartao(carrinho.cartaoPresente.codigo, total, numero)
    if (uso.ok) pagoComCartao = uso.abatido
  }
  const agora = new Date().toISOString()

  const prazo = addBusinessDays(formatIsoDate(new Date()), freteEscolhido.totalMaxDays)

  const pedido = await payload.create({
    collection: 'orders',
    data: {
      number: numero,
      status: 'pending',
      channel: 'site',
      customer: clienteId,
      customerName: dados.cliente.nome,
      email: dados.cliente.email,
      phone: dados.cliente.telefone,
      personType: dados.cliente.tipoPessoa,
      document: dados.cliente.documento,
      items: itens,
      shippingAddress: {
        recipientName: nomeParaEntrega(cartaoImpresso, dados.cliente.nome),
        postalCode: dados.endereco.cep,
        street: dados.endereco.rua,
        number: dados.endereco.numero,
        complement: dados.endereco.complemento,
        district: dados.endereco.bairro,
        city: dados.endereco.cidade,
        state: dados.endereco.estado,
      },
      shippingService:
        freteEscolhido.serviceId === FRETE_A_COMBINAR_ID
          ? 'A combinar'
          : `${freteEscolhido.carrier} ${freteEscolhido.serviceName}`.trim(),
      eventType: dados.tipoEvento,
      eventDate: dados.dataEvento,
      productionDeadline: prazo,
      customerNote: dados.observacao,
      presente: cartaoImpresso
        ? {
            ehPresente: true,
            de: cartaoImpresso.de,
            para: cartaoImpresso.para,
            mensagem: cartaoImpresso.mensagem,
          }
        : { ehPresente: false },
      subtotal: carrinho.subtotal,
      shippingTotal: totais.frete,
      discountTotal: totais.desconto,
      couponCode: carrinho.cupom?.codigo ?? null,
      giftCardCode: pagoComCartao > 0 ? (carrinho.cartaoPresente?.codigo ?? null) : null,
      giftCardTotal: pagoComCartao,
      total,
      events: [
        {
          at: agora,
          type: 'pedido_criado',
          message: `Pedido feito no site. Frete: ${freteEscolhido.label}`,
          actor: 'cliente',
        },
      ],
    },
    overrideAccess: true,
  })

  await fecharCarrinho(carrinho.token, numero)

  return { ok: true, numero: String(pedido.number ?? numero), total }
}

/** Cria a conta do cliente na primeira compra, ou reaproveita a existente. */
async function garantirCliente(dados: DadosDoPedido): Promise<number | null> {
  const payload = await getPayloadClient()
  const email = dados.cliente.email.trim().toLowerCase()

  const existentes = await payload.find({
    collection: 'customers',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const consentimento = {
    whatsappStatus: Boolean(dados.optInWhatsapp),
    marketing: Boolean(dados.optInMarketing),
    log: [
      {
        at: new Date().toISOString(),
        origem: 'checkout',
        whatsapp: Boolean(dados.optInWhatsapp),
        marketing: Boolean(dados.optInMarketing),
      },
    ],
  }

  if (existentes.docs[0]) {
    const cliente = existentes.docs[0]
    await payload.update({
      collection: 'customers',
      id: cliente.id,
      data: {
        name: dados.cliente.nome,
        phone: dados.cliente.telefone,
        personType: dados.cliente.tipoPessoa,
        document: dados.cliente.documento,
        optIns: consentimento,
      },
      overrideAccess: true,
    })
    return Number(cliente.id)
  }

  // Sem senha: a conta nasce do pedido, e o cliente define senha depois,
  // se quiser acompanhar a produção pela Minha Conta.
  const criado = await payload.create({
    collection: 'customers',
    data: {
      email,
      password: crypto.randomUUID(),
      name: dados.cliente.nome,
      phone: dados.cliente.telefone,
      personType: dados.cliente.tipoPessoa,
      document: dados.cliente.documento,
      optIns: consentimento,
    },
    overrideAccess: true,
  })

  return Number(criado.id)
}

async function fecharCarrinho(token: string, numeroDoPedido: string): Promise<void> {
  if (!token) return

  const payload = await getPayloadClient()
  const carrinhos = await payload.find({
    collection: 'carts',
    where: { token: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const carrinho = carrinhos.docs[0]
  if (!carrinho) return

  await payload.update({
    collection: 'carts',
    id: carrinho.id,
    data: { status: 'converted', convertedOrderNumber: numeroDoPedido, items: [] },
    overrideAccess: true,
  })
}
