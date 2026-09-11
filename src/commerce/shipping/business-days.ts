/**
 * Contagem de dias úteis e prazo prometido ao cliente.
 *
 * Importa porque o prazo anunciado é promessa que vincula a loja (CDC art. 35):
 * se a página diz "chega até 20/11", a data precisa ser real. O prazo mostrado
 * soma a produção artesanal com o prazo da transportadora, e o mesmo número
 * alimenta a entrega estimada no feed do Google (handling time).
 *
 * O Melhor Envio conta o prazo da transportadora em dias úteis a partir do
 * primeiro dia útil DEPOIS da postagem: o dia da postagem não conta.
 */

/** Data no formato AAAA-MM-DD, sem fuso, para não escorregar um dia. */
export type IsoDate = string

const MS_PER_DAY = 86_400_000

function toUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function parseIsoDate(iso: IsoDate): Date {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) throw new Error(`Data inválida: ${iso}`)
  return new Date(Date.UTC(year, month - 1, day))
}

export function formatIsoDate(date: Date): IsoDate {
  return toUTC(date).toISOString().slice(0, 10)
}

/** Domingo de Páscoa do ano, algoritmo de Meeus/Jones/Butcher. */
export function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, day))
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY)
}

/**
 * Feriados nacionais do ano, incluindo os que dependem da Páscoa.
 * Carnaval e Corpus Christi são ponto facultativo federal, mas na prática
 * transportadora e ateliê não operam: entram na conta para o prazo não estourar.
 */
export function nationalHolidays(year: number): Set<IsoDate> {
  const easter = easterSunday(year)

  const dates: Date[] = [
    new Date(Date.UTC(year, 0, 1)), // Confraternização Universal
    addDays(easter, -48), // Segunda de Carnaval
    addDays(easter, -47), // Terça de Carnaval
    addDays(easter, -2), // Sexta-feira Santa
    new Date(Date.UTC(year, 3, 21)), // Tiradentes
    new Date(Date.UTC(year, 4, 1)), // Dia do Trabalho
    addDays(easter, 60), // Corpus Christi
    new Date(Date.UTC(year, 8, 7)), // Independência
    new Date(Date.UTC(year, 9, 12)), // Nossa Senhora Aparecida
    new Date(Date.UTC(year, 10, 2)), // Finados
    new Date(Date.UTC(year, 10, 15)), // Proclamação da República
    new Date(Date.UTC(year, 10, 20)), // Consciência Negra
    new Date(Date.UTC(year, 11, 25)), // Natal
  ]

  return new Set(dates.map(formatIsoDate))
}

export type BusinessDayOptions = {
  /** Feriados extras: municipais, recesso do ateliê. Formato AAAA-MM-DD. */
  extraHolidays?: IsoDate[]
}

function isBusinessDay(date: Date, holidays: Set<IsoDate>): boolean {
  const weekday = date.getUTCDay()
  if (weekday === 0 || weekday === 6) return false
  return !holidays.has(formatIsoDate(date))
}

function holidaysFor(from: Date, to: Date, options?: BusinessDayOptions): Set<IsoDate> {
  const holidays = new Set<IsoDate>()
  for (let year = from.getUTCFullYear(); year <= to.getUTCFullYear() + 1; year++) {
    for (const iso of nationalHolidays(year)) holidays.add(iso)
  }
  for (const iso of options?.extraHolidays ?? []) holidays.add(iso)
  return holidays
}

/**
 * Soma dias úteis a uma data.
 *
 * O dia de partida nunca conta, seguindo a regra do Melhor Envio: a contagem
 * começa no primeiro dia útil seguinte.
 */
export function addBusinessDays(
  start: IsoDate,
  days: number,
  options?: BusinessDayOptions,
): IsoDate {
  if (!Number.isInteger(days) || days < 0) throw new Error('days deve ser inteiro maior ou igual a zero')

  let current = parseIsoDate(start)
  const horizon = addDays(current, days * 3 + 30)
  const holidays = holidaysFor(current, horizon, options)

  let remaining = days
  while (remaining > 0) {
    current = addDays(current, 1)
    if (isBusinessDay(current, holidays)) remaining -= 1
  }

  // Se o prazo for zero, ainda assim a data precisa cair em dia útil.
  while (!isBusinessDay(current, holidays)) current = addDays(current, 1)

  return formatIsoDate(current)
}

/** Conta quantos dias úteis existem entre duas datas, sem contar a inicial. */
export function countBusinessDays(
  start: IsoDate,
  end: IsoDate,
  options?: BusinessDayOptions,
): number {
  const from = parseIsoDate(start)
  const to = parseIsoDate(end)
  if (to <= from) return 0

  const holidays = holidaysFor(from, to, options)
  let count = 0
  let current = from
  while (current < to) {
    current = addDays(current, 1)
    if (isBusinessDay(current, holidays)) count += 1
  }
  return count
}

export type ProductionRule = { fromQty: number; minDays: number; maxDays: number }

/** Prazo de produção aplicável a uma quantidade, pela maior faixa atingida. */
export function productionDaysFor(
  rules: ProductionRule[],
  qty: number,
): { minDays: number; maxDays: number } {
  const applicable = [...rules]
    .filter((rule) => qty >= rule.fromQty)
    .sort((a, b) => a.fromQty - b.fromQty)
    .pop()

  if (!applicable) {
    const first = [...rules].sort((a, b) => a.fromQty - b.fromQty)[0]
    return first ? { minDays: first.minDays, maxDays: first.maxDays } : { minDays: 0, maxDays: 0 }
  }

  return { minDays: applicable.minDays, maxDays: applicable.maxDays }
}

export type DeliveryEstimate = {
  productionMinDays: number
  productionMaxDays: number
  carrierMinDays: number
  carrierMaxDays: number
  /** Produção + transportadora. É o número que o cliente lê. */
  totalMinDays: number
  totalMaxDays: number
  /** Data prevista mais cedo e mais tarde, já em dia útil. */
  earliest: IsoDate
  latest: IsoDate
  /** Texto pronto para a página do produto e o checkout. */
  label: string
}

/**
 * Monta o prazo completo mostrado ao cliente.
 *
 * O prazo adicional do painel do Melhor Envio fica em zero de propósito:
 * a soma é feita aqui, senão o prazo de produção entraria duas vezes.
 */
export function estimateDelivery(input: {
  orderedOn: IsoDate
  qty: number
  productionRules: ProductionRule[]
  carrierMinDays: number
  carrierMaxDays: number
  options?: BusinessDayOptions
}): DeliveryEstimate {
  const production = productionDaysFor(input.productionRules, input.qty)

  const totalMinDays = production.minDays + input.carrierMinDays
  const totalMaxDays = production.maxDays + input.carrierMaxDays

  const earliest = addBusinessDays(input.orderedOn, totalMinDays, input.options)
  const latest = addBusinessDays(input.orderedOn, totalMaxDays, input.options)

  return {
    productionMinDays: production.minDays,
    productionMaxDays: production.maxDays,
    carrierMinDays: input.carrierMinDays,
    carrierMaxDays: input.carrierMaxDays,
    totalMinDays,
    totalMaxDays,
    earliest,
    latest,
    label: buildLabel(production, input.carrierMinDays, input.carrierMaxDays, latest),
  }
}

function buildLabel(
  production: { minDays: number; maxDays: number },
  carrierMin: number,
  carrierMax: number,
  latest: IsoDate,
): string {
  const producao =
    production.minDays === production.maxDays
      ? `${production.maxDays} dias úteis`
      : `${production.minDays} a ${production.maxDays} dias úteis`

  const entrega =
    carrierMin === carrierMax ? `${carrierMax} dias úteis` : `${carrierMin} a ${carrierMax} dias úteis`

  const [year, month, day] = latest.split('-')
  return `Produção artesanal em ${producao} + entrega em ${entrega}. Chega até ${day}/${month}/${year}.`
}
