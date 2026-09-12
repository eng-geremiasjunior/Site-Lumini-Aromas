import { getPayloadClient } from '../../lib/payload.ts'
import { buildLotTable, type LotTableRow } from '../pricing/lot-pricing.ts'
import { toPricingConfig, type PricingProduct } from '../cart/price-line.ts'
import { estimateDelivery, formatIsoDate, type ProductionRule } from '../shipping/business-days.ts'

/** Tudo que a página de produto precisa, já pronto para exibir. */
export type ProductView = {
  id: string
  name: string
  slug: string
  /** Categoria, usada pelo cupom restrito a uma linha de produtos. */
  categoryId: string | null
  shortDescription: string | null
  description: unknown
  images: Array<{ url: string; alt: string; width?: number | null; height?: number | null }>
  variants: Array<{ key: string; label: string; sku: string | null; imageUrl: string | null }>
  lotTable: LotTableRow[]
  minQty: number
  maxQty: number
  unitPrice: number
  personalizationFields: Array<{
    label: string
    type: string
    required: boolean
    maxChars: number | null
    placeholder: string | null
    options: string[]
  }>
  addons: Array<{ id: string; name: string; pricePerUnit: number; description: string | null }>
  techSheet: Array<{ rotulo: string; valor: string }>
  productionRules: ProductionRule[]
  /** Prazo estimado para o lote mínimo, sem contar o frete. */
  deadlineHint: string | null
  pricing: PricingProduct
}

type MediaLike = {
  url?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
  sizes?: Record<string, { url?: string | null; width?: number | null; height?: number | null }>
}

function toImage(media: unknown): ProductView['images'][number] | null {
  if (!media || typeof media !== 'object') return null
  const m = media as MediaLike
  const url = m.sizes?.card?.url ?? m.url
  if (!url) return null
  return { url, alt: m.alt ?? '', width: m.width, height: m.height }
}

/**
 * Carrega um produto publicado pelo endereço na web.
 *
 * A tabela de lotes é recalculada aqui, em vez de ler o valor gravado:
 * assim a página nunca mostra um preço defasado se alguém alterou o
 * produto direto no banco.
 */
export async function getProductBySlug(slug: string): Promise<ProductView | null> {
  const payload = await getPayloadClient()

  const resultado = await payload.find({
    collection: 'products',
    where: {
      and: [
        { slug: { equals: slug } },
        { _status: { equals: 'published' } },
        { archived: { not_equals: true } },
      ],
    },
    limit: 1,
    depth: 2,
  })

  const doc = resultado.docs[0]
  if (!doc) return null

  const pricing: PricingProduct = {
    id: doc.id,
    name: doc.name,
    slug: doc.slug ?? slug,
    status: 'published',
    archived: doc.archived ?? false,
    unitPrice: doc.unitPrice ?? 0,
    minQty: doc.minQty ?? 20,
    qtyStep: doc.qtyStep ?? 10,
    maxQty: doc.maxQty ?? 200,
    lotSizes: (doc.lotSizes as number[] | null) ?? null,
    volumeDiscounts:
      (doc.volumeDiscounts as Array<{ fromQty: number; unitPrice: number }> | null) ?? null,
    variants: (doc.variants ?? []).map((v) => ({
      key: v.key ?? null,
      label: v.label ?? null,
      sku: v.sku ?? null,
      active: v.active ?? true,
    })),
    personalizationFields: (doc.personalizationFields ?? []).map((f) => ({
      label: f.label,
      type: f.type,
      required: f.required ?? false,
      maxChars: f.maxChars ?? null,
    })),
  }

  const lotTable = buildLotTable(toPricingConfig(pricing))

  const productionRules: ProductionRule[] = (doc.productionDays ?? []).map((r) => ({
    fromQty: r.fromQty,
    minDays: r.minDays,
    maxDays: r.maxDays,
  }))

  const techSheet = buildTechSheet(doc.techSheet)

  return {
    id: String(doc.id),
    name: doc.name,
    slug: doc.slug ?? slug,
    categoryId: idDoRelacionamento(doc.category),
    shortDescription: doc.shortDescription ?? null,
    description: doc.description ?? null,
    images: (Array.isArray(doc.gallery) ? doc.gallery : [])
      .map(toImage)
      .filter((image): image is ProductView['images'][number] => image !== null),
    variants: (doc.variants ?? [])
      .filter((v) => v.key && v.active !== false)
      .map((v) => ({
        key: v.key as string,
        label: v.label ?? (v.key as string),
        sku: v.sku ?? null,
        imageUrl: toImage(v.image)?.url ?? null,
      })),
    lotTable,
    minQty: pricing.minQty ?? 20,
    maxQty: pricing.maxQty ?? 200,
    unitPrice: pricing.unitPrice ?? 0,
    personalizationFields: (doc.personalizationFields ?? []).map((f) => ({
      label: f.label,
      type: f.type,
      required: f.required ?? false,
      maxChars: f.maxChars ?? null,
      placeholder: f.placeholder ?? null,
      options: (f.options ?? '')
        .split(',')
        .map((o: string) => o.trim())
        .filter(Boolean),
    })),
    // O relacionamento volta como identificador ou documento completo,
    // conforme a profundidade da consulta; aqui só interessam os completos.
    addons: (Array.isArray(doc.addons) ? doc.addons : [])
      .filter((a): a is Exclude<typeof a, number> => typeof a === 'object' && a !== null)
      .map((a) => ({
        id: String(a.id),
        name: a.name ?? '',
        pricePerUnit: a.pricePerUnit ?? 0,
        description: a.description ?? null,
      })),
    techSheet,
    productionRules,
    deadlineHint: buildDeadlineHint(productionRules, pricing.minQty ?? 20),
    pricing,
  }
}

function buildTechSheet(ficha: unknown): Array<{ rotulo: string; valor: string }> {
  if (!ficha || typeof ficha !== 'object') return []
  const f = ficha as Record<string, unknown>

  const linhas: Array<[string, unknown, string]> = [
    ['Duração aproximada', f.durationHours, 'h'],
    ['Peso / volume', f.weight, ''],
    ['Altura', f.height, ''],
    ['Largura', f.width, ''],
    ['Recipiente', f.container, ''],
    ['Acompanha', f.includes, ''],
    ['Validade', f.shelfLifeMonths, ' meses'],
  ]

  return linhas
    .filter(([, valor]) => valor !== null && valor !== undefined && valor !== '')
    .map(([rotulo, valor, sufixo]) => ({ rotulo, valor: `${valor}${sufixo}` }))
}

/** Texto curto de prazo para o lote mínimo, exibido antes de o cliente informar o CEP. */
function buildDeadlineHint(rules: ProductionRule[], minQty: number): string | null {
  if (rules.length === 0) return null

  const hoje = formatIsoDate(new Date())
  const prazo = estimateDelivery({
    orderedOn: hoje,
    qty: minQty,
    productionRules: rules,
    carrierMinDays: 0,
    carrierMaxDays: 0,
  })

  return prazo.productionMinDays === prazo.productionMaxDays
    ? `Produção artesanal em ${prazo.productionMaxDays} dias úteis`
    : `Produção artesanal em ${prazo.productionMinDays} a ${prazo.productionMaxDays} dias úteis`
}

/** Lista de produtos publicados, para a vitrine e o mapa do site. */
export async function listPublishedProducts(limit = 100) {
  const payload = await getPayloadClient()

  const resultado = await payload.find({
    collection: 'products',
    where: {
      and: [{ _status: { equals: 'published' } }, { archived: { not_equals: true } }],
    },
    limit,
    depth: 1,
    sort: 'name',
  })

  return resultado.docs
}

/** O relacionamento volta como id ou como documento, conforme a profundidade. */
function idDoRelacionamento(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null
  if (typeof valor === 'object') {
    const doc = valor as { id?: string | number }
    return doc.id === undefined ? null : String(doc.id)
  }
  return String(valor)
}
