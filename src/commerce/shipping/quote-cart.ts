// Este módulo só roda no servidor: fala com a API do Melhor Envio.

import { getPayloadClient } from '../../lib/payload.ts'
import { getCart } from '../cart/cart-service.ts'
import { cotarFrete, normalizarCep } from './melhor-envio-client.ts'
import { buildVolumes, mergeVolumes, type PackagingRule } from './packaging.ts'
import { buildShippingOptions, fallbackOption, type ShippingOption } from './quote.ts'
import { productionDaysFor, formatIsoDate, type ProductionRule } from './business-days.ts'

export type FreteResultado =
  | { ok: true; opcoes: ShippingOption[]; descartados: string[] }
  | {
      ok: false
      mensagem: string
      /** Quando não dá para cotar, a loja oferece combinar pelo WhatsApp. */
      alternativa?: { label: string; whatsappUrl: string }
    }

/**
 * Cota o frete do carrinho inteiro.
 *
 * Junta as caixas de todos os itens numa remessa só, soma o prazo de
 * produção mais longo entre eles (a encomenda sai quando a última peça
 * ficar pronta) e devolve apenas as opções que cobrem o valor do pedido.
 */
export async function cotarFreteDoCarrinho(cepDestino: string): Promise<FreteResultado> {
  const cep = normalizarCep(cepDestino)
  if (!cep) {
    return { ok: false, mensagem: 'Informe um CEP válido, com 8 números.' }
  }

  const carrinho = await getCart()
  if (carrinho.isEmpty) {
    return { ok: false, mensagem: 'Seu carrinho está vazio.' }
  }

  const payload = await getPayloadClient()

  const volumesPorItem = []
  let producaoMin = 0
  let producaoMax = 0
  let faltaEmbalagem = false

  for (const linha of carrinho.lines) {
    const produto = await payload
      .findByID({ collection: 'products', id: linha.productId, depth: 0, overrideAccess: true })
      .catch(() => null)

    if (!produto) continue

    const embalagens = (produto.packaging ?? []) as PackagingRule[]
    if (embalagens.length === 0) {
      faltaEmbalagem = true
      continue
    }

    volumesPorItem.push(buildVolumes(embalagens, linha.qty, linha.total))

    // O pedido só é postado quando a peça mais demorada fica pronta.
    const regras = (produto.productionDays ?? []) as ProductionRule[]
    if (regras.length > 0) {
      const prazo = productionDaysFor(regras, linha.qty)
      producaoMin = Math.max(producaoMin, prazo.minDays)
      producaoMax = Math.max(producaoMax, prazo.maxDays)
    }
  }

  const volumes = mergeVolumes(volumesPorItem)

  if (volumes.length === 0) {
    return {
      ok: false,
      mensagem: faltaEmbalagem
        ? 'Ainda não conseguimos calcular o frete deste item automaticamente.'
        : 'Não foi possível montar a remessa.',
      alternativa: fallbackOption(
        process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '5533999478774',
        carrinho.lines[0]?.productName,
      ),
    }
  }

  const cotacao = await cotarFrete({
    cepDestino: cep,
    volumes,
    valorTotalCents: carrinho.subtotal,
  })

  if (!cotacao.ok) {
    return {
      ok: false,
      mensagem: cotacao.mensagem,
      alternativa: fallbackOption(
        process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '5533999478774',
        carrinho.lines[0]?.productName,
      ),
    }
  }

  const { options, rejected } = buildShippingOptions({
    services: cotacao.servicos,
    orderTotalCents: carrinho.subtotal,
    productionMinDays: producaoMin,
    productionMaxDays: producaoMax,
    orderedOn: formatIsoDate(new Date()),
    freeShippingFromCents: await lerFreteGratis(),
  })

  if (options.length === 0) {
    return {
      ok: false,
      mensagem:
        'Nenhuma transportadora atende este endereço com segurança para o valor do pedido.',
      alternativa: fallbackOption(
        process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '5533999478774',
        carrinho.lines[0]?.productName,
      ),
    }
  }

  return {
    ok: true,
    opcoes: options,
    descartados: rejected.map((item) =>
      item.detail ? `${item.serviceName}: ${item.detail}` : item.serviceName,
    ),
  }
}

/** Valor a partir do qual o frete sai de graça, definido nas configurações. */
async function lerFreteGratis(): Promise<number | null> {
  try {
    const payload = await getPayloadClient()
    const settings = await payload.findGlobal({ slug: 'store-settings', depth: 0 })
    const valor = (settings as { freeShippingFrom?: number | null })?.freeShippingFrom
    return valor && valor > 0 ? valor : null
  } catch {
    return null
  }
}
