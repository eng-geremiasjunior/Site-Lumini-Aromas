/**
 * Precificação de uma linha do pedido.
 *
 * É a autoridade de preço da loja. Carrinho, checkout, orçamento e
 * lançamento manual de venda chamam esta função. O navegador nunca envia
 * valor: ele envia produto, aroma, quantidade e acabamentos, e o servidor
 * calcula. Assim o preço mostrado, o cobrado e o do feed são sempre o mesmo.
 */

import {
  DEFAULT_LOT_SIZES,
  addonsTotal,
  guardLot,
  guardNegociado,
  unitPriceFor,
  type Addon,
  type GuardErrorCode,
  type LotPricingConfig,
} from '../pricing/lot-pricing.ts'

/** Recorte do produto que interessa ao cálculo, como vem do banco. */
export type PricingProduct = {
  id: string | number
  name: string
  slug?: string | null
  /** Vem do `_status` do Payload: 'draft' ou 'published'. */
  status?: string | null
  /** Produto tirado da loja sem ser apagado. */
  archived?: boolean | null
  unitPrice?: number | null
  minQty?: number | null
  qtyStep?: number | null
  maxQty?: number | null
  lotSizes?: number[] | null
  volumeDiscounts?: Array<{ fromQty: number; unitPrice: number }> | null
  variants?: Array<{
    key?: string | null
    label?: string | null
    sku?: string | null
    active?: boolean | null
  }> | null
  personalizationFields?: Array<{
    label: string
    type: string
    required?: boolean | null
    maxChars?: number | null
  }> | null
}

export type PricingAddon = Addon & { id: string }

export type PriceLineInput = {
  product: PricingProduct
  /** Chave da variação escolhida, ex.: "lavanda". Obrigatória quando o produto tem variações. */
  variantKey?: string | null
  qty: number
  /** Acabamentos escolhidos, já carregados do banco. */
  addons?: PricingAddon[]
  /** Respostas dos campos de personalização, no formato { "Frase ou nome": "Ana e João" }. */
  personalization?: Record<string, string | null | undefined>
  /**
   * Venda negociada: preço por peça combinado na conversa, com quantidade
   * livre. Só o painel manda isto — a vitrine nunca. É o que permite lançar
   * as 21 ou 28 peças que se vendem no WhatsApp sem afrouxar a tabela de
   * faixas fechadas que o site pratica.
   */
  negociado?: { unitPriceCents: number } | null
}

export type PricedLine = {
  productId: string
  productName: string
  productSlug: string | null
  variantKey: string | null
  variantLabel: string | null
  sku: string | null
  qty: number
  /** Preço de uma peça aplicado a esta quantidade, em centavos. */
  unitPrice: number
  /** Preço do lote (quantidade x preço da peça), em centavos. */
  lotPrice: number
  addons: Array<{ id: string; name: string; total: number }>
  addonsTotal: number
  /** Lote + acabamentos, em centavos. */
  total: number
  /** A quantidade e o preço foram combinados, não vieram da tabela. */
  negociado?: boolean
  personalization: Record<string, string>
}

export type PriceLineErrorCode =
  | GuardErrorCode
  | 'PRODUCT_UNAVAILABLE'
  | 'VARIANT_REQUIRED'
  | 'VARIANT_UNAVAILABLE'
  | 'PERSONALIZATION_REQUIRED'
  | 'PERSONALIZATION_TOO_LONG'

export type PriceLineResult =
  | { ok: true; line: PricedLine }
  | { ok: false; code: PriceLineErrorCode; message: string; field?: string }

/** Extrai do produto a configuração usada pelo motor de preço. */
export function toPricingConfig(product: PricingProduct): LotPricingConfig {
  return {
    unitPrice: product.unitPrice ?? 0,
    minQty: product.minQty ?? 20,
    qtyStep: product.qtyStep ?? 10,
    maxQty: product.maxQty ?? 200,
    lotSizes:
      Array.isArray(product.lotSizes) && product.lotSizes.length > 0
        ? [...product.lotSizes].sort((a, b) => a - b)
        : [...DEFAULT_LOT_SIZES],
    volumeDiscounts: product.volumeDiscounts?.length ? product.volumeDiscounts : undefined,
  }
}

export function priceLine(input: PriceLineInput): PriceLineResult {
  const { product, qty } = input

  if ((product.status && product.status !== 'published') || product.archived) {
    return {
      ok: false,
      code: 'PRODUCT_UNAVAILABLE',
      message: 'Este produto não está disponível no momento.',
    }
  }

  const config = toPricingConfig(product)

  // Duas portas, nunca uma com exceção dentro: a da vitrine confere as
  // faixas fechadas; a do painel aceita a quantidade combinada.
  const guard = input.negociado
    ? guardNegociado(qty, input.negociado.unitPriceCents)
    : guardLot(config, qty)

  if (!guard.ok) return { ok: false, code: guard.code, message: guard.message }

  // Variação (aroma). Só é exigida quando o produto tem variações cadastradas.
  const variants = (product.variants ?? []).filter((variant) => variant?.key)
  let variantKey: string | null = null
  let variantLabel: string | null = null
  let sku: string | null = null

  if (variants.length > 0) {
    if (!input.variantKey) {
      return {
        ok: false,
        code: 'VARIANT_REQUIRED',
        message: 'Escolha o aroma antes de continuar.',
      }
    }

    const variant = variants.find((candidate) => candidate.key === input.variantKey)
    if (!variant) {
      return {
        ok: false,
        code: 'VARIANT_UNAVAILABLE',
        message: 'A opção escolhida não está mais disponível.',
      }
    }
    if (variant.active === false) {
      return {
        ok: false,
        code: 'VARIANT_UNAVAILABLE',
        message: `A opção ${variant.label ?? variant.key} está indisponível no momento.`,
      }
    }

    variantKey = variant.key ?? null
    variantLabel = variant.label ?? null
    sku = variant.sku ?? null
  }

  // Personalização: obrigatórios preenchidos e limite de caracteres respeitado.
  const personalization: Record<string, string> = {}
  for (const field of product.personalizationFields ?? []) {
    const raw = input.personalization?.[field.label]
    const value = typeof raw === 'string' ? raw.trim() : ''

    if (field.required && value === '') {
      return {
        ok: false,
        code: 'PERSONALIZATION_REQUIRED',
        message: `Preencha o campo "${field.label}".`,
        field: field.label,
      }
    }

    // O limite de caracteres é para texto. Num campo de arquivo o valor é
    // o nome do que foi enviado, e cortar isso não faz sentido nenhum.
    if (field.type !== 'file' && field.maxChars && value.length > field.maxChars) {
      return {
        ok: false,
        code: 'PERSONALIZATION_TOO_LONG',
        message: `"${field.label}" pode ter no máximo ${field.maxChars} caracteres.`,
        field: field.label,
      }
    }

    if (value !== '') personalization[field.label] = value
  }

  const addons = input.addons ?? []
  const addonLines = addons.map((addon) => ({
    id: addon.id,
    name: addon.name,
    total: (addon.pricePerUnit ?? 0) * qty + (addon.flatPrice ?? 0),
  }))

  const addonsSum = addonsTotal(addons, qty)

  // O total do lote nunca é digitado, nem aqui: é sempre quantidade × peça.
  const precoDaPeca = input.negociado ? input.negociado.unitPriceCents : unitPriceFor(config, qty)
  const lot = precoDaPeca * qty

  return {
    ok: true,
    line: {
      productId: String(product.id),
      productName: product.name,
      productSlug: product.slug ?? null,
      variantKey,
      variantLabel,
      sku,
      qty,
      unitPrice: precoDaPeca,
      lotPrice: lot,
      negociado: Boolean(input.negociado),
      addons: addonLines,
      addonsTotal: addonsSum,
      total: lot + addonsSum,
      personalization,
    },
  }
}

/** Soma das linhas já precificadas, em centavos. */
export function cartSubtotal(lines: PricedLine[]): number {
  return lines.reduce((sum, line) => sum + line.total, 0)
}

/**
 * Verifica o pedido mínimo quando ele vale para o total do produto
 * e não para cada aroma, permitindo misturar aromas no mesmo lote.
 */
export function checkOrderScopedMinimum(
  product: PricingProduct,
  lines: PricedLine[],
): PriceLineResult | { ok: true } {
  const productLines = lines.filter((line) => line.productId === String(product.id))
  if (productLines.length === 0) return { ok: true }

  const total = productLines.reduce((sum, line) => sum + line.qty, 0)
  const minQty = product.minQty ?? 20

  if (total < minQty) {
    return {
      ok: false,
      code: 'QTY_BELOW_MIN',
      message: `Some ao menos ${minQty} peças de ${product.name}. Você tem ${total}.`,
    }
  }

  return { ok: true }
}
