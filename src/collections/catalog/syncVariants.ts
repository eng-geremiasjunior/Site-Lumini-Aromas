import type { CollectionBeforeChangeHook, PayloadRequest } from 'payload'

import { slugify } from '../../fields/slug.ts'

type OptionGroup = {
  attribute?: string | number | { id: string | number }
  terms?: Array<string | number | { id: string | number; slug?: string; name?: string }>
}

type Variant = {
  key: string
  label: string
  termIds: string
  sku?: string | null
  image?: unknown
  active?: boolean
  legacyWooVariationId?: number | null
  [k: string]: unknown
}

function idOf(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object' && 'id' in (value as Record<string, unknown>)) {
    return String((value as { id: string | number }).id)
  }
  return null
}

/** Produto cartesiano das opções escolhidas: 6 aromas = 6 variações. */
function cartesian<T>(groups: T[][]): T[][] {
  return groups.reduce<T[][]>((acc, group) => acc.flatMap((combo) => group.map((item) => [...combo, item])), [
    [],
  ])
}

/**
 * Mantém a lista de variações em dia com as opções marcadas no produto.
 *
 * No WooCommerce o dono gera 60 variações por produto (6 aromas x 10 faixas)
 * e digita preço em cada uma. Aqui a quantidade não é variação: só o aroma é.
 * São 6 linhas, sem preço, e elas nascem e somem sozinhas conforme os aromas
 * marcados. O que o dono escreveu (SKU, foto) é preservado.
 */
export const syncVariants: CollectionBeforeChangeHook = async ({ data, req }) => {
  const groups = Array.isArray(data.optionGroups) ? (data.optionGroups as OptionGroup[]) : []

  if (groups.length === 0) {
    data.variants = []
    return data
  }

  const termIds = groups.flatMap((group) =>
    (group.terms ?? []).map(idOf).filter((id): id is string => id !== null),
  )

  if (termIds.length === 0) {
    data.variants = []
    return data
  }

  const terms = await loadTerms(req, termIds)

  const groupedTerms = groups
    .map((group) =>
      (group.terms ?? [])
        .map(idOf)
        .filter((id): id is string => id !== null)
        .map((id) => terms.get(id))
        .filter((term): term is { id: string; slug: string; name: string } => Boolean(term)),
    )
    .filter((group) => group.length > 0)

  if (groupedTerms.length === 0) {
    data.variants = []
    return data
  }

  const existing = new Map<string, Variant>(
    (Array.isArray(data.variants) ? (data.variants as Variant[]) : []).map((variant) => [
      variant.key,
      variant,
    ]),
  )

  const productSlug = typeof data.slug === 'string' ? data.slug : slugify(String(data.name ?? ''))
  const skuPrefix = productSlug
    .split('-')
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.slice(0, 3).toUpperCase())
    .join('-')

  data.variants = cartesian(groupedTerms).map((combo) => {
    const key = combo.map((term) => term.slug).join('__')
    const label = combo.map((term) => term.name).join(' / ')
    const previous = existing.get(key)

    return {
      ...previous,
      key,
      label,
      termIds: combo.map((term) => term.id).join(','),
      sku:
        previous?.sku ??
        [skuPrefix, ...combo.map((term) => term.slug.slice(0, 3).toUpperCase())]
          .filter(Boolean)
          .join('-'),
      active: previous?.active ?? true,
    }
  })

  return data
}

async function loadTerms(
  req: PayloadRequest,
  ids: string[],
): Promise<Map<string, { id: string; slug: string; name: string }>> {
  const map = new Map<string, { id: string; slug: string; name: string }>()
  if (!req?.payload) return map

  const result = await req.payload.find({
    collection: 'attribute-terms',
    where: { id: { in: ids } },
    limit: 200,
    depth: 0,
    req,
  })

  for (const doc of result.docs as Array<{ id: string | number; slug?: string; name?: string }>) {
    const id = String(doc.id)
    map.set(id, {
      id,
      slug: doc.slug ?? slugify(doc.name ?? id),
      name: doc.name ?? id,
    })
  }

  return map
}
