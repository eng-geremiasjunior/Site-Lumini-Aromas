/**
 * Montagem das caixas enviadas ao Melhor Envio na cotação.
 *
 * A cotação é feita por `volumes[]` já embalados, e não por `products[]`
 * com a quantidade de peças. Dois motivos:
 *
 *   1. Existe relato na comunidade oficial, sem resposta até hoje, de que
 *      a cotação falha com quantidade acima de 100 peças, devolvendo
 *      "Serviço indisponível no momento" em todos os serviços. Os lotes da
 *      Lumini chegam a 200 peças, então cotar por peça é arriscado.
 *   2. A Lumini já sabe quantas peças cabem em cada caixa. Informar a caixa
 *      real dá frete mais próximo do que será pago na etiqueta.
 */

export type PackagingRule = {
  /** A partir de quantas peças esta embalagem vale. */
  fromQty: number
  /** Quantas caixas o lote ocupa. */
  boxes: number
  /** Peso de UMA caixa, em quilos. */
  weightKg: number
  widthCm: number
  heightCm: number
  lengthCm: number
}

/** Formato aceito pelo endpoint de cotação do Melhor Envio. */
export type MelhorEnvioVolume = {
  width: number
  height: number
  length: number
  weight: number
  insurance_value: number
}

/** Medidas mínimas aceitas pelas transportadoras (Correios e Loggi). */
export const MIN_DIMENSIONS = { width: 11, height: 2, length: 16 } as const

/**
 * Limite de indenização por transportadora, em centavos.
 *
 * A comparação é por palavra inteira, e não por trecho de texto: o serviço
 * "Jadlog .Package" contém as letras "pac", e uma busca solta o trataria
 * com o limite do PAC (R$ 3.000 em vez de R$ 29.900).
 */
export const INSURANCE_CAPS: ReadonlyArray<{ label: string; pattern: RegExp; capCents: number }> = [
  { label: 'Mini Envios', pattern: /\bmini\s*envios?\b/i, capCents: 10_000 }, // R$ 100
  { label: 'Jadlog', pattern: /\bjadlog\b/i, capCents: 2_990_000 }, // R$ 29.900
  { label: 'SEDEX', pattern: /\bsedex\b/i, capCents: 1_000_000 }, // R$ 10.000
  { label: 'Loggi', pattern: /\bloggi\b/i, capCents: 300_000 }, // R$ 3.000
  { label: 'PAC', pattern: /\bpac\b/i, capCents: 300_000 }, // R$ 3.000
]

/** Embalagem aplicável a uma quantidade: a maior faixa atingida. */
export function packagingFor(rules: PackagingRule[], qty: number): PackagingRule | null {
  if (rules.length === 0) return null

  const sorted = [...rules].sort((a, b) => a.fromQty - b.fromQty)
  const applicable = sorted.filter((rule) => qty >= rule.fromQty).pop()
  return applicable ?? sorted[0] ?? null
}

/**
 * Monta os volumes da cotação.
 *
 * O valor declarado é dividido entre as caixas, porque o seguro do Melhor
 * Envio é por volume. Sem isso, um pedido de R$ 7.600 em três caixas seria
 * declarado como R$ 7.600 em cada uma.
 */
export function buildVolumes(
  rules: PackagingRule[],
  qty: number,
  orderTotalCents: number,
): MelhorEnvioVolume[] {
  const rule = packagingFor(rules, qty)
  if (!rule) return []

  const boxes = Math.max(1, Math.round(rule.boxes))
  const perBox = Math.floor(orderTotalCents / boxes)
  const remainder = orderTotalCents - perBox * boxes

  return Array.from({ length: boxes }, (_, index) => ({
    width: Math.max(MIN_DIMENSIONS.width, Math.ceil(rule.widthCm)),
    height: Math.max(MIN_DIMENSIONS.height, Math.ceil(rule.heightCm)),
    length: Math.max(MIN_DIMENSIONS.length, Math.ceil(rule.lengthCm)),
    weight: Number(rule.weightKg.toFixed(3)),
    // A primeira caixa absorve os centavos que sobraram da divisão.
    insurance_value: Number(((perBox + (index === 0 ? remainder : 0)) / 100).toFixed(2)),
  }))
}

/** Soma os volumes de várias linhas do carrinho em uma única cotação. */
export function mergeVolumes(volumeGroups: MelhorEnvioVolume[][]): MelhorEnvioVolume[] {
  return volumeGroups.flat()
}

/** Peso total da remessa, em quilos. */
export function totalWeight(volumes: MelhorEnvioVolume[]): number {
  return Number(volumes.reduce((sum, volume) => sum + volume.weight, 0).toFixed(3))
}

/** Valor declarado total, em centavos. */
export function totalInsuranceCents(volumes: MelhorEnvioVolume[]): number {
  return volumes.reduce((sum, volume) => sum + Math.round(volume.insurance_value * 100), 0)
}

/**
 * Diz se um serviço cobre o valor declarado do pedido.
 *
 * Pedidos da Lumini passam de R$ 5.000 com frequência, e já houve venda de
 * R$ 11.000. Oferecer Loggi (indeniza até R$ 3.000) nesse caso é vender um
 * frete que não cobre o prejuízo se a mercadoria sumir.
 */
export function coversInsurance(
  carrierOrService: string,
  orderTotalCents: number,
): { ok: true } | { ok: false; capCents: number; carrier: string } {
  const name = carrierOrService.trim()

  const matched = INSURANCE_CAPS.find((entry) => entry.pattern.test(name))
  // Transportadora que ainda não conhecemos não é bloqueada: o Melhor Envio
  // adiciona serviços novos sem aviso, e travar a venda seria pior.
  if (!matched) return { ok: true }

  return orderTotalCents <= matched.capCents
    ? { ok: true }
    : { ok: false, capCents: matched.capCents, carrier: matched.label }
}
