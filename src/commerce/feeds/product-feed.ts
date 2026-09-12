/**
 * Gerador dos feeds de produto para o Google Merchant Center e para o
 * catálogo da Meta.
 *
 * O feed atual do WooCommerce tem três problemas que reprovam ofertas:
 *   1. envia o preço como "BRL760.00"; a especificação exige "760.00 BRL";
 *   2. tem itens com preço zero, que o Google só aceita em assinatura;
 *   3. não envia `brand`, `multipack` nem prazo de manuseio.
 *
 * Aqui o preço vem do motor de lote, então nunca é zero nem digitado errado.
 * Cada oferta representa um aroma no LOTE MÍNIMO, com `multipack` informando
 * quantas peças vão na embalagem e `unit_pricing_measure` mostrando o preço
 * por peça, que é a forma oficial de comunicar "R$ 38 a unidade" sem violar
 * a regra de enviar o preço do lote mínimo.
 */

import { formatFeedPrice, lotPrice, type LotPricingConfig } from '../pricing/lot-pricing.ts'
import { productionDaysFor, type ProductionRule } from '../shipping/business-days.ts'
import { toPricingConfig, type PricingProduct } from '../cart/price-line.ts'
import { ofertaId } from './oferta-id.ts'

export type FeedChannel = 'google' | 'meta'

// `variants` é substituído (e não somado) porque o feed precisa de campos
// extras na variação; uma interseção deixaria o tipo do item ambíguo.
export type FeedProduct = Omit<PricingProduct, 'variants'> & {
  shortDescription?: string | null
  description?: string | null
  brand?: string | null
  googleProductCategory?: string | null
  productType?: string | null
  occasions?: string[] | null
  images?: string[] | null
  productionRules?: ProductionRule[] | null
  unitCost?: number | null
  preserveLegacyFeedId?: boolean | null
  variants?: Array<{
    key?: string | null
    label?: string | null
    sku?: string | null
    active?: boolean | null
    image?: string | null
    legacyWooVariationId?: number | null
  }> | null
}

export type FeedSettings = {
  /** Base do site, sem barra no final. Ex.: https://luminiaromas.com.br */
  siteUrl: string
  brand?: string
  /** Parcelas sem juros oferecidas, para o atributo `installment`. */
  installments?: number
}

export type FeedItem = {
  id: string
  itemGroupId: string
  title: string
  description: string
  link: string
  imageLink: string | null
  additionalImageLinks: string[]
  availability: 'in stock' | 'out of stock'
  condition: 'new'
  price: string
  brand: string
  mpn: string | null
  multipack: number
  unitPricingMeasure: string
  unitPricingBaseMeasure: string
  googleProductCategory: string | null
  productType: string | null
  customLabel0: string | null
  customLabel1: string | null
  minHandlingTime: number | null
  maxHandlingTime: number | null
  costOfGoodsSold: string | null
  installmentMonths: number | null
  installmentAmount: string | null
  /** Só no feed da Meta: descreve o aroma como dimensão de variação. */
  variantAttribute: string | null
}

/** Monta as ofertas de um produto: uma por aroma, no lote mínimo. */
export function buildFeedItems(product: FeedProduct, settings: FeedSettings): FeedItem[] {
  // Rascunho e arquivado não vão para o Google nem para a Meta.
  if (product.status !== 'published' || product.archived) return []
  if (!product.unitPrice || product.unitPrice <= 0) return []

  const config = toPricingConfig(product)
  const minQty = config.lotSizes[0]
  if (!minQty) return []

  const price = lotPrice(config, minQty)
  if (price <= 0) return []

  const brand = product.brand ?? settings.brand ?? 'Lumini Aromas'
  const images = product.images ?? []
  const production = product.productionRules?.length
    ? productionDaysFor(product.productionRules, minQty)
    : null

  const variants = (product.variants ?? []).filter(
    (variant) => variant?.key && variant.active !== false,
  )

  const groupId = String(product.id)

  // Produto sem aroma (ex.: pote de mel) gera uma única oferta.
  const rows = variants.length > 0 ? variants : [null]

  return rows.map((variant) => {
    const suffix = variant?.label ? ` ${variant.label}` : ''

    return {
      id: ofertaId({
        produtoId: groupId,
        loteMinimo: minQty,
        sku: variant?.sku,
        legacyWooVariationId: variant?.legacyWooVariationId,
        preservarIdAntigo: product.preserveLegacyFeedId,
      }),
      itemGroupId: groupId,
      title: truncate(`${product.name}${suffix} - lote ${minQty} peças`, 150),
      description: truncate(
        product.shortDescription ?? stripHtml(product.description ?? '') ?? product.name,
        5000,
      ),
      link: buildLink(settings.siteUrl, product.slug ?? groupId, variant?.key ?? null, minQty),
      imageLink: variant?.image ?? images[0] ?? null,
      additionalImageLinks: images.slice(1, 11),
      availability: 'in stock',
      condition: 'new',
      price: formatFeedPrice(price),
      brand,
      mpn: variant?.sku ?? null,
      multipack: minQty,
      unitPricingMeasure: `${minQty} ct`,
      unitPricingBaseMeasure: '1 ct',
      googleProductCategory: product.googleProductCategory ?? null,
      productType: product.productType ?? null,
      customLabel0: product.occasions?.[0] ?? null,
      customLabel1: `lote ${minQty}`,
      minHandlingTime: production?.minDays ?? null,
      maxHandlingTime: production?.maxDays ?? null,
      costOfGoodsSold:
        product.unitCost && product.unitCost > 0 ? formatFeedPrice(product.unitCost * minQty) : null,
      installmentMonths: settings.installments ?? null,
      installmentAmount: settings.installments
        ? formatFeedPrice(Math.round(price / settings.installments))
        : null,
      variantAttribute: variant?.label ? `Scent:${variant.label}` : null,
    }
  })
}

/**
 * O link precisa abrir a página já com o aroma e a quantidade escolhidos.
 * O feed atual usa `?attribute_pa_aroma=`, formato do WooCommerce; o novo
 * usa parâmetros próprios, e o redirecionamento traduz os links antigos
 * para não quebrar os anúncios que já estão no ar.
 */
export function buildLink(
  siteUrl: string,
  slug: string,
  variantKey: string | null,
  qty: number,
): string {
  const base = `${siteUrl.replace(/\/$/, '')}/product/${slug}/`
  const params = new URLSearchParams()
  if (variantKey) params.set('aroma', variantKey)
  params.set('quantidade', String(qty))
  return `${base}?${params.toString()}`
}

function truncate(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ')
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function tag(name: string, value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  return `    <g:${name}>${escapeXml(String(value))}</g:${name}>\n`
}

/** Renderiza um item no formato RSS 2.0 com o namespace do Google. */
export function renderFeedItem(item: FeedItem, channel: FeedChannel): string {
  let xml = '  <item>\n'
  xml += tag('id', item.id)
  xml += tag('item_group_id', item.itemGroupId)
  xml += tag('title', item.title)
  xml += tag('description', item.description)
  xml += tag('link', item.link)
  xml += tag('image_link', item.imageLink)
  for (const image of item.additionalImageLinks) xml += tag('additional_image_link', image)
  xml += tag('availability', item.availability)
  xml += tag('condition', item.condition)
  xml += tag('price', item.price)
  xml += tag('brand', item.brand)
  xml += tag('mpn', item.mpn)

  if (channel === 'google') {
    xml += tag('multipack', item.multipack)
    xml += tag('unit_pricing_measure', item.unitPricingMeasure)
    xml += tag('unit_pricing_base_measure', item.unitPricingBaseMeasure)
    xml += tag('google_product_category', item.googleProductCategory)
    xml += tag('min_handling_time', item.minHandlingTime)
    xml += tag('max_handling_time', item.maxHandlingTime)
    xml += tag('cost_of_goods_sold', item.costOfGoodsSold)
    if (item.installmentMonths && item.installmentAmount) {
      xml += '    <g:installment>\n'
      xml += `      <g:months>${item.installmentMonths}</g:months>\n`
      xml += `      <g:amount>${escapeXml(item.installmentAmount)}</g:amount>\n`
      xml += '    </g:installment>\n'
    }
  } else {
    // A Meta usa `additional_variant_attribute` para dimensões próprias,
    // como o aroma, que não existe na lista padrão (cor, tamanho, material).
    xml += tag('additional_variant_attribute', item.variantAttribute)
  }

  xml += tag('product_type', item.productType)
  xml += tag('custom_label_0', item.customLabel0)
  xml += tag('custom_label_1', item.customLabel1)
  xml += '  </item>\n'
  return xml
}

export function renderFeed(
  items: FeedItem[],
  channel: FeedChannel,
  settings: FeedSettings & { title?: string },
): string {
  const title = settings.title ?? 'Lumini Aromas'
  const link = settings.siteUrl.replace(/\/$/, '')

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n'
  xml += '<channel>\n'
  xml += `  <title>${escapeXml(title)}</title>\n`
  xml += `  <link>${escapeXml(link)}</link>\n`
  xml += `  <description>${escapeXml('Lembrancinhas personalizadas de luxo')}</description>\n`
  for (const item of items) xml += renderFeedItem(item, channel)
  xml += '</channel>\n</rss>\n'
  return xml
}

/** Atalho: produtos -> XML pronto para publicar. */
export function buildFeed(
  products: FeedProduct[],
  channel: FeedChannel,
  settings: FeedSettings,
): string {
  const items = products.flatMap((product) => buildFeedItems(product, settings))
  return renderFeed(items, channel, settings)
}

/** Reexportado para quem só precisa da configuração de preço. */
export type { LotPricingConfig }
