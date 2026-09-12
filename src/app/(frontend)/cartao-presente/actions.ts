'use server'

import { getPayloadClient } from '../../../lib/payload.ts'
import { LIMITE_DA_MENSAGEM } from '../../../commerce/orders/presente.ts'

/**
 * Compra de cartão-presente.
 *
 * Caminho próprio, curto, sem carrinho e sem frete. O cartão não é uma peça
 * que se produz nem se despacha: pedir CEP, calcular entrega e falar em
 * prazo de produção seria inventar etapas que não existem, e cada etapa
 * inventada é uma chance de desistir.
 *
 * O cartão em si não nasce aqui. Aqui nasce o pedido; o cartão só é criado
 * quando o pagamento entra, pela caixa de saída. Pedido que nunca for pago
 * não deixa vale solto no sistema.
 */

export type CompraDeCartao = {
  valorCentavos: number
  de: string
  para: string
  emailDoDestinatario: string
  mensagem: string
  /** ISO, só a data. Vazio significa enviar assim que o pagamento entrar. */
  enviarEm: string
  comprador: { nome: string; email: string; telefone: string; documento: string }
  aceitouTermos: boolean
}

export type ResultadoDaCompra =
  | { ok: true; numero: string; total: number }
  | { ok: false; mensagem: string; campo?: string }

export async function comprarCartaoPresente(dados: CompraDeCartao): Promise<ResultadoDaCompra> {
  const valor = Math.trunc(dados.valorCentavos)

  // O valor é conferido contra a tabela de lotes do catálogo, e não aceito
  // como veio: o navegador não escolhe quanto vale um cartão.
  const permitidos = await valoresPermitidos()
  if (!permitidos.includes(valor)) {
    return { ok: false, mensagem: 'Escolha um dos valores disponíveis.', campo: 'valor' }
  }

  if (!dados.comprador.nome.trim()) {
    return { ok: false, mensagem: 'Escreva o seu nome.', campo: 'nome' }
  }
  if (!dados.comprador.email.includes('@')) {
    return { ok: false, mensagem: 'Confira o seu e-mail.', campo: 'email' }
  }
  if (!dados.para.trim()) {
    return { ok: false, mensagem: 'Escreva para quem é o presente.', campo: 'para' }
  }
  if (!dados.emailDoDestinatario.includes('@')) {
    return {
      ok: false,
      mensagem: 'Confira o e-mail de quem vai receber. É para lá que o cartão vai.',
      campo: 'emailDoDestinatario',
    }
  }
  if (dados.mensagem.length > LIMITE_DA_MENSAGEM) {
    return {
      ok: false,
      mensagem: `O recado cabe em ${LIMITE_DA_MENSAGEM} caracteres.`,
      campo: 'mensagem',
    }
  }
  if (!dados.aceitouTermos) {
    return { ok: false, mensagem: 'Aceite os termos para continuar.', campo: 'termos' }
  }

  const payload = await getPayloadClient()
  const numero = await proximoNumero(payload)

  await payload.create({
    collection: 'orders',
    overrideAccess: true,
    data: {
      number: numero,
      status: 'pending',
      channel: 'site',
      customerName: dados.comprador.nome,
      email: dados.comprador.email.trim().toLowerCase(),
      phone: dados.comprador.telefone,
      personType: 'PF',
      document: dados.comprador.documento,
      items: [
        {
          productName: 'Cartão-presente',
          qty: 1,
          unitPrice: valor,
          lotPrice: valor,
          lineTotal: valor,
        },
      ],
      subtotal: valor,
      // Cartão não tem frete: é entregue por e-mail.
      shippingTotal: 0,
      discountTotal: 0,
      total: valor,
      cartaoPresenteAEmitir: {
        valorCentavos: valor,
        de: dados.de.trim() || dados.comprador.nome,
        para: dados.para.trim(),
        emailDoDestinatario: dados.emailDoDestinatario.trim().toLowerCase(),
        mensagem: dados.mensagem.trim() || null,
        enviarEm: dados.enviarEm ? new Date(`${dados.enviarEm}T09:00:00`).toISOString() : null,
        emitido: false,
      },
      events: [
        {
          at: new Date().toISOString(),
          type: 'pedido_criado',
          message: 'Compra de cartão-presente pelo site.',
          actor: 'cliente',
        },
      ],
    },
  })

  return { ok: true, numero, total: valor }
}

/** Os valores oferecidos saem dos lotes reais do catálogo. */
async function valoresPermitidos(): Promise<number[]> {
  const { valoresDisponiveis } = await import('../../../commerce/giftcards/gift-card.ts')
  const { precosDeLoteDoCatalogo } = await import('./valores.ts')
  return valoresDisponiveis(await precosDeLoteDoCatalogo())
}

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
