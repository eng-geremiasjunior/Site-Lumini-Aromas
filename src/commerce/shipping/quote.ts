/**
 * Tratamento da resposta de cotação do Melhor Envio.
 *
 * A resposta bruta traz serviços indisponíveis (com o campo `error`),
 * serviços cujo seguro não cobre o pedido e prazos que ainda não incluem a
 * produção artesanal. Esta camada limpa tudo isso antes de a vitrine mostrar
 * qualquer opção ao cliente, porque prazo anunciado é promessa que vincula
 * a loja (CDC art. 35).
 */

import { addBusinessDays, type IsoDate } from './business-days.ts'
import { coversInsurance } from './packaging.ts'

/** Recorte do que o Melhor Envio devolve em /shipment/calculate. */
export type MelhorEnvioService = {
  id: number
  name: string
  price?: string | number
  custom_price?: string | number
  discount?: string | number
  currency?: string
  delivery_time?: number
  delivery_range?: { min: number; max: number }
  custom_delivery_time?: number
  custom_delivery_range?: { min: number; max: number }
  company?: { id: number; name: string; picture?: string }
  error?: string
}

export type ShippingOption = {
  serviceId: number
  serviceName: string
  carrier: string
  /** Preço cobrado do cliente, em centavos. */
  priceCents: number
  /** Prazo só da transportadora, em dias úteis. */
  carrierMinDays: number
  carrierMaxDays: number
  /** Produção + transportadora, que é o que o cliente lê. */
  totalMinDays: number
  totalMaxDays: number
  deliveryBy: IsoDate
  label: string
}

export type QuoteInput = {
  services: MelhorEnvioService[]
  /** Valor dos produtos, para conferir o limite de seguro do serviço. */
  orderTotalCents: number
  productionMinDays: number
  productionMaxDays: number
  orderedOn: IsoDate
  extraHolidays?: IsoDate[]
  /** Acima deste valor o frete sai de graça. Zero ou ausente desliga a regra. */
  freeShippingFromCents?: number | null
}

export type RejectedService = {
  serviceName: string
  reason: 'indisponivel' | 'seguro_insuficiente' | 'sem_preco' | 'sem_prazo'
  detail?: string
}

/**
 * Identificador da opção "frete a combinar".
 *
 * Fica aqui, e não no módulo que fala com o Melhor Envio, porque as telas
 * precisam dele. Importar um valor de um módulo de servidor faria o Next
 * tentar levar o banco de dados para dentro do navegador.
 */
export const FRETE_A_COMBINAR_ID = -1

export type QuoteResult = {
  options: ShippingOption[]
  /** Serviços descartados, para o admin entender por que sumiram. */
  rejected: RejectedService[]
}

function toCents(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === '') return null
  const numeric = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
  if (!Number.isFinite(numeric) || numeric < 0) return null
  return Math.round(numeric * 100)
}

/**
 * Converte a resposta bruta em opções que podem ser mostradas.
 *
 * Usa `custom_price` e `custom_delivery_range`, e não `price`/`delivery_range`,
 * porque são eles que já refletem os ajustes feitos no painel do Melhor Envio.
 */
export function buildShippingOptions(input: QuoteInput): QuoteResult {
  const options: ShippingOption[] = []
  const rejected: RejectedService[] = []

  for (const service of input.services) {
    const carrier = service.company?.name ?? ''
    const fullName = [carrier, service.name].filter(Boolean).join(' ').trim()

    if (service.error) {
      rejected.push({ serviceName: fullName, reason: 'indisponivel', detail: service.error })
      continue
    }

    const priceCents = toCents(service.custom_price ?? service.price)
    if (priceCents === null) {
      rejected.push({ serviceName: fullName, reason: 'sem_preco' })
      continue
    }

    const range = service.custom_delivery_range ?? service.delivery_range
    const fallback = service.custom_delivery_time ?? service.delivery_time
    const carrierMinDays = range?.min ?? fallback ?? null
    const carrierMaxDays = range?.max ?? fallback ?? null

    if (carrierMinDays === null || carrierMaxDays === null) {
      rejected.push({ serviceName: fullName, reason: 'sem_prazo' })
      continue
    }

    const insurance = coversInsurance(fullName, input.orderTotalCents)
    if (!insurance.ok) {
      rejected.push({
        serviceName: fullName,
        reason: 'seguro_insuficiente',
        detail: `indeniza até ${(insurance.capCents / 100).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}`,
      })
      continue
    }

    const totalMinDays = input.productionMinDays + carrierMinDays
    const totalMaxDays = input.productionMaxDays + carrierMaxDays
    const deliveryBy = addBusinessDays(input.orderedOn, totalMaxDays, {
      extraHolidays: input.extraHolidays,
    })

    const isFree =
      Boolean(input.freeShippingFromCents) &&
      input.orderTotalCents >= (input.freeShippingFromCents ?? Number.POSITIVE_INFINITY)

    options.push({
      serviceId: service.id,
      serviceName: service.name,
      carrier,
      priceCents: isFree ? 0 : priceCents,
      carrierMinDays,
      carrierMaxDays,
      totalMinDays,
      totalMaxDays,
      deliveryBy,
      label: buildLabel(fullName, isFree ? 0 : priceCents, totalMinDays, totalMaxDays, deliveryBy),
    })
  }

  // Mais barato primeiro; empate desempata pelo mais rápido.
  options.sort((a, b) => a.priceCents - b.priceCents || a.totalMaxDays - b.totalMaxDays)

  return { options, rejected }
}

function buildLabel(
  name: string,
  priceCents: number,
  minDays: number,
  maxDays: number,
  deliveryBy: IsoDate,
): string {
  const preco =
    priceCents === 0
      ? 'frete grátis'
      : (priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const prazo = minDays === maxDays ? `${maxDays} dias úteis` : `${minDays} a ${maxDays} dias úteis`
  const [year, month, day] = deliveryBy.split('-')

  return `${name}: ${preco} — ${prazo}, chega até ${day}/${month}/${year}`
}

/**
 * Quando nenhuma opção sobra, a loja não trava o checkout: oferece combinar
 * o frete pelo WhatsApp. Perder a venda por causa da cotação seria pior.
 */
export function fallbackOption(whatsappNumber: string, productName?: string): {
  label: string
  whatsappUrl: string
} {
  const texto = productName
    ? `Olá! Quero fechar um pedido de ${productName} e preciso combinar o frete.`
    : 'Olá! Quero fechar um pedido e preciso combinar o frete.'

  return {
    label: 'Frete a combinar pelo WhatsApp',
    whatsappUrl: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(texto)}`,
  }
}
