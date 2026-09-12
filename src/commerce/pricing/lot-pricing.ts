/**
 * Motor de preço por lote da Lumini Aromas.
 *
 * REGRA INVARIÁVEL: o preço de um lote NUNCA é digitado à mão.
 * Ele é sempre derivado de `unitPrice` (preço unitário) x quantidade.
 * Foi o preço de lote digitado variação por variação no WooCommerce que
 * produziu 8 preços errados e 21 variações sem preço (invisíveis na loja).
 *
 * Todos os valores monetários são inteiros em CENTAVOS. Nunca use float
 * para dinheiro: 0.1 + 0.2 nao da 0.3 em ponto flutuante.
 */

/** Faixa de desconto progressivo: a partir de `fromQty` peças, o preço unitário passa a ser `unitPrice`. */
export type VolumeDiscount = {
  /** Quantidade mínima de peças para esta faixa valer. */
  fromQty: number
  /** Preço unitário em centavos nesta faixa. */
  unitPrice: number
}

/** Configuração de precificação de um produto. */
export type LotPricingConfig = {
  /** Preço unitário base em centavos (ex.: 3800 = R$ 38,00). */
  unitPrice: number
  /** Quantidade mínima vendável (padrão da Lumini: 20). */
  minQty: number
  /** Incremento entre faixas, usado para gerar `lotSizes` quando não informado. */
  qtyStep: number
  /** Quantidade máxima vendável pelo site; acima disso o cliente pede orçamento. */
  maxQty: number
  /**
   * Faixas oferecidas ao cliente, em ordem crescente.
   * É a lista AUTORITATIVA: só estas quantidades podem ser compradas.
   */
  lotSizes: number[]
  /** Desconto progressivo por volume (opcional; hoje desligado por decisão do dono). */
  volumeDiscounts?: VolumeDiscount[]
}

/** Add-on cobrado por peça (laço, caixa de acetato, flores secas...) ou valor fixo por pedido. */
export type Addon = {
  id: string
  name: string
  /** Preço em centavos por peça do lote. */
  pricePerUnit?: number
  /** Preço fixo em centavos, independente da quantidade. */
  flatPrice?: number
}

export type LotTableRow = {
  qty: number
  /** Preço unitário aplicado nesta faixa, em centavos. */
  unitPrice: number
  /** Preço total do lote, em centavos. */
  lotPrice: number
  /** Economia por peça em relação ao preço unitário base, em centavos (0 quando não há desconto). */
  savingsPerUnit: number
  /** Economia total do lote em relação ao preço base, em centavos. */
  savingsTotal: number
}

export type GuardErrorCode =
  | 'QTY_INVALID'
  | 'QTY_BELOW_MIN'
  | 'QTY_ABOVE_MAX'
  | 'QTY_NOT_OFFERED'
  | 'CONFIG_INVALID'

export type GuardResult = { ok: true } | { ok: false; code: GuardErrorCode; message: string }

/** Faixas padrão da loja, iguais às do atributo `pa_quantidade` do WooCommerce atual. */
export const DEFAULT_LOT_SIZES: readonly number[] = [
  20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150, 200,
]

/**
 * Gera as faixas a partir de mínimo/passo/máximo, para quando o produto
 * não define uma lista própria. Sempre inclui o mínimo e o máximo.
 */
export function generateLotSizes(minQty: number, qtyStep: number, maxQty: number): number[] {
  if (!Number.isInteger(minQty) || minQty <= 0) throw new Error('minQty deve ser inteiro positivo')
  if (!Number.isInteger(qtyStep) || qtyStep <= 0) throw new Error('qtyStep deve ser inteiro positivo')
  if (!Number.isInteger(maxQty) || maxQty < minQty) throw new Error('maxQty deve ser inteiro maior ou igual a minQty')

  const sizes: number[] = []
  for (let qty = minQty; qty <= maxQty; qty += qtyStep) sizes.push(qty)
  if (sizes[sizes.length - 1] !== maxQty) sizes.push(maxQty)
  return sizes
}

/** Valida a configuração do produto. Lança se estiver inconsistente. */
export function assertValidConfig(config: LotPricingConfig): void {
  const { unitPrice, minQty, maxQty, lotSizes, volumeDiscounts } = config

  if (!Number.isInteger(unitPrice) || unitPrice <= 0)
    throw new Error('unitPrice deve ser inteiro positivo em centavos')
  if (!Number.isInteger(minQty) || minQty <= 0) throw new Error('minQty deve ser inteiro positivo')
  if (!Number.isInteger(maxQty) || maxQty < minQty)
    throw new Error('maxQty deve ser inteiro maior ou igual a minQty')
  if (!Array.isArray(lotSizes) || lotSizes.length === 0) throw new Error('lotSizes nao pode ser vazio')

  for (const qty of lotSizes) {
    if (!Number.isInteger(qty) || qty <= 0) throw new Error(`faixa invalida em lotSizes: ${qty}`)
    if (qty < minQty) throw new Error(`faixa ${qty} e menor que o minimo ${minQty}`)
    if (qty > maxQty) throw new Error(`faixa ${qty} e maior que o maximo ${maxQty}`)
  }

  const sorted = lotSizes.every((qty, i, arr) => i === 0 || arr[i - 1] < qty)
  if (!sorted) throw new Error('lotSizes deve estar em ordem crescente e sem repeticoes')

  if (volumeDiscounts) {
    for (const tier of volumeDiscounts) {
      if (!Number.isInteger(tier.fromQty) || tier.fromQty <= 0)
        throw new Error(`fromQty invalido: ${tier.fromQty}`)
      if (!Number.isInteger(tier.unitPrice) || tier.unitPrice <= 0)
        throw new Error(`unitPrice invalido na faixa ${tier.fromQty}`)
      if (tier.unitPrice > unitPrice)
        throw new Error(
          `desconto por volume na faixa ${tier.fromQty} (${tier.unitPrice}) e maior que o preco base (${unitPrice})`,
        )
    }
    const ordered = volumeDiscounts.every((t, i, arr) => i === 0 || arr[i - 1].fromQty < t.fromQty)
    if (!ordered) throw new Error('volumeDiscounts deve estar em ordem crescente de fromQty')
  }
}

/**
 * Preço unitário aplicável a uma quantidade: o da maior faixa de desconto
 * cujo `fromQty` seja menor ou igual a qty; sem faixa aplicável, o preço base.
 */
export function unitPriceFor(config: LotPricingConfig, qty: number): number {
  const tiers = config.volumeDiscounts ?? []
  let price = config.unitPrice
  for (const tier of tiers) {
    if (qty >= tier.fromQty) price = tier.unitPrice
  }
  return price
}

/** Preço total do lote em centavos. Sempre derivado, nunca digitado. */
export function lotPrice(config: LotPricingConfig, qty: number): number {
  return unitPriceFor(config, qty) * qty
}

/** Soma dos add-ons escolhidos para um lote de `qty` peças, em centavos. */
export function addonsTotal(addons: Addon[], qty: number): number {
  return addons.reduce(
    (sum, addon) => sum + (addon.pricePerUnit ?? 0) * qty + (addon.flatPrice ?? 0),
    0,
  )
}

/** Preço final da linha do pedido: lote + add-ons. */
export function lineTotal(config: LotPricingConfig, qty: number, addons: Addon[] = []): number {
  return lotPrice(config, qty) + addonsTotal(addons, qty)
}

/**
 * Tabela exibida na página do produto e no admin.
 * É gerada, nunca editada: é o que o dono vê ao digitar UM preço unitário.
 */
export function buildLotTable(config: LotPricingConfig): LotTableRow[] {
  assertValidConfig(config)
  return config.lotSizes.map((qty) => {
    const applied = unitPriceFor(config, qty)
    const savingsPerUnit = config.unitPrice - applied
    return {
      qty,
      unitPrice: applied,
      lotPrice: applied * qty,
      savingsPerUnit,
      savingsTotal: savingsPerUnit * qty,
    }
  })
}

/**
 * ÚNICO ponto de validação de quantidade da plataforma.
 * Chamado por: adicionar ao carrinho, atualizar carrinho, checkout,
 * orçamento e lançamento de venda manual. Regra duplicada por rota é
 * exatamente como o WooCommerce deixou passar variações inválidas.
 */
export function guardLot(config: LotPricingConfig, qty: number): GuardResult {
  try {
    assertValidConfig(config)
  } catch (error) {
    return {
      ok: false,
      code: 'CONFIG_INVALID',
      message: `Configuracao de preco invalida: ${(error as Error).message}`,
    }
  }

  if (!Number.isInteger(qty) || qty <= 0) {
    return { ok: false, code: 'QTY_INVALID', message: 'Informe uma quantidade valida de pecas.' }
  }

  if (qty < config.minQty) {
    return {
      ok: false,
      code: 'QTY_BELOW_MIN',
      message: `O pedido minimo e de ${config.minQty} pecas.`,
    }
  }

  if (qty > config.maxQty) {
    return {
      ok: false,
      code: 'QTY_ABOVE_MAX',
      message: `Para mais de ${config.maxQty} pecas, fale com a gente pelo WhatsApp para um orcamento personalizado.`,
    }
  }

  if (!config.lotSizes.includes(qty)) {
    return {
      ok: false,
      code: 'QTY_NOT_OFFERED',
      message: `Escolha uma das quantidades disponiveis: ${config.lotSizes.join(', ')} pecas.`,
    }
  }

  return { ok: true }
}

/**
 * Venda negociada: quantidade e preço por peça combinados na conversa.
 *
 * A vitrine vende em faixas fechadas — 20, 30, 40 — e isso é decisão de
 * negócio, não limitação: foi testado nos anúncios e qualifica melhor quem
 * chega. Mas no WhatsApp a conversa é outra: vende-se 21, 28, 33, porque a
 * cliente contou os convidados e é esse o número dela.
 *
 * Então existe este caminho, e ele é explícito. Não é o `guardLot` com uma
 * exceção escondida dentro: é uma porta separada, que só o painel abre, com
 * as suas próprias regras.
 *
 * O que continua igual, e não se negocia: **o preço do lote não é digitado**.
 * Digita-se o preço da peça, e o total é sempre `quantidade × preço`. Foi o
 * total digitado à mão que gerou os oito preços errados no WooCommerce.
 */
export function guardNegociado(qty: number, unitPriceCents: number): GuardResult {
  if (!Number.isInteger(qty) || qty <= 0) {
    return { ok: false, code: 'QTY_INVALID', message: 'Informe uma quantidade válida de peças.' }
  }

  if (!Number.isInteger(unitPriceCents) || unitPriceCents <= 0) {
    return { ok: false, code: 'CONFIG_INVALID', message: 'Informe o preço por peça.' }
  }

  return { ok: true }
}

/**
 * O que merece um segundo olhar antes de lançar.
 *
 * Nada aqui impede a venda — quem está digitando é o dono, e ele sabe o que
 * combinou. Mas um preço dez vezes menor que o de tabela quase nunca é
 * desconto: é a vírgula no lugar errado, e vira um lote de 100 peças vendido
 * por trinta e oito reais.
 */
export function avisosDaNegociacao(
  config: LotPricingConfig,
  qty: number,
  unitPriceCents: number,
): string[] {
  const avisos: string[] = []

  if (qty < config.minQty) {
    avisos.push(`São ${qty} peças, abaixo do mínimo de ${config.minQty} que o site pratica.`)
  }

  if (qty > config.maxQty) {
    avisos.push(`São ${qty} peças, acima das ${config.maxQty} que o site oferece sozinho.`)
  }

  const deTabela = unitPriceFor(config, Math.max(qty, config.minQty))

  if (deTabela > 0 && unitPriceCents !== deTabela) {
    const proporcao = unitPriceCents / deTabela

    if (proporcao <= 0.5 || proporcao >= 2) {
      avisos.push(
        `O preço por peça está muito longe da tabela (${formatBRL(deTabela)}). Confira a vírgula.`,
      )
    } else {
      avisos.push(`A tabela cobraria ${formatBRL(deTabela)} por peça neste tamanho.`)
    }
  }

  return avisos
}

/** Formata centavos como moeda brasileira (para e-mails, PDFs e telas). */
export function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

/**
 * Formata centavos para os feeds do Google Merchant e da Meta: "760.00 BRL".
 * O feed atual do WooCommerce envia "BRL760.00", formato que a especificação
 * do Google não aceita.
 */
export function formatFeedPrice(cents: number): string {
  return `${(cents / 100).toFixed(2)} BRL`
}
