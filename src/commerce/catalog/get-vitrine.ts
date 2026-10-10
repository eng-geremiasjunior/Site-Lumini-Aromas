import { cache } from 'react'

import { getPayloadClient } from '../../lib/payload.ts'
import { toPricingConfig, type PricingProduct } from '../cart/price-line.ts'
import { buildLotTable } from '../pricing/lot-pricing.ts'

/**
 * O que a página inicial precisa saber do catálogo.
 *
 * Separado de `get-product.ts` de propósito: aquele carrega *um* produto
 * com tudo (ficha técnica, personalização, acabamentos, prazo), e a
 * vitrine mostra *vinte* produtos com seis campos. Reaproveitar o outro
 * significaria vinte vezes o trabalho de uma página de produto para
 * desenhar um cartão.
 *
 * O preço do cartão é derivado da mesma tabela de lotes do resto da loja
 * (`buildLotTable`), nunca de um campo digitado. É a regra que impediu os
 * 8 preços errados do WooCommerce de se repetirem.
 */

export type FotoDaVitrine = { url: string; alt: string }

export type PecaDaVitrine = {
  slug: string
  nome: string
  /** A linha de materiais do cartão. Vem do resumo escrito no painel. */
  resumo: string | null
  foto: FotoDaVitrine | null
  /** A segunda foto, para quando a vitrine ganhar troca no hover. */
  foto2: FotoDaVitrine | null
  ocasioes: string[]
  minQty: number
  maxQty: number
  /** Preço do menor lote, em centavos. */
  precoMinimo: number
  /** Preço do maior lote, em centavos. */
  precoMaximo: number
  unitPrice: number
}

export type OcasiaoDaVitrine = {
  nome: string
  slug: string
  /** Quantas peças publicadas atendem a ocasião. */
  pecas: number
  /** Até três fotos para o slide do cartão. */
  fotos: string[]
}

type MediaLike = {
  url?: string | null
  alt?: string | null
  sizes?: Record<string, { url?: string | null } | undefined>
}

function foto(valor: unknown, tamanho = 'card'): FotoDaVitrine | null {
  if (!valor || typeof valor !== 'object') return null
  const m = valor as MediaLike
  const url = m.sizes?.[tamanho]?.url ?? m.url
  if (!url) return null
  return { url, alt: m.alt ?? '' }
}

/**
 * As fotos que o design entregou para cada ocasião.
 *
 * Enquanto o painel não tiver foto nas ocasiões, o cartão usa estas — são
 * as mesmas escolhidas no handoff, não enfeite inventado aqui. Assim que
 * uma ocasião ganhar foto no painel, a dela passa à frente.
 */
const FOTOS_DO_DESIGN: Record<string, string[]> = {
  casamento: ['tronco-tag', 'agenda-1', 'caixa-bege'],
  '15-anos': ['domo-rosa', 'vela-concha', 'frasco-coracao-rosa'],
  batizado: ['bomboniere-cristal', 'vela-cimento-branca', 'agenda-3'],
  bodas: ['caixa-bege', 'agenda-5', 'tronco-mao'],
  maternidade: ['vela-concha', 'frasco-coracao-rosa', 'agenda-6'],
  aniversario: ['vela-gel-graos-de-cafe', 'domo-rosa', 'agenda-4'],
  corporativo: ['caixa-branca-fita-oliva', 'vela-cimento-branca', 'vela-gel-graos-de-cafe'],
}

function fotosDoDesign(slug: string): string[] {
  return (FOTOS_DO_DESIGN[slug] ?? []).map((nome) => `/home/fotos/${nome}.jpg`)
}

/**
 * As peças publicadas, uma vez por requisição.
 *
 * O `cache` do React guarda o resultado dentro de um mesmo desenho: o
 * cabeçalho (que vive no layout e precisa das contagens do menu) e a
 * vitrine (que vive na página) pedem a mesma lista e o banco é consultado
 * uma vez. Sem isso seriam duas consultas iguais por visita, em um
 * Supabase que só dá 15 conexões para a loja inteira.
 */
export const listarPecasDaVitrine = cache(carregarPecas)

async function carregarPecas(limite = 60): Promise<PecaDaVitrine[]> {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'products',
    where: {
      and: [{ _status: { equals: 'published' } }, { archived: { not_equals: true } }],
    },
    limit: limite,
    depth: 1,
    overrideAccess: true,
    sort: '-featured',
  })

  const pecas: PecaDaVitrine[] = []

  for (const doc of docs) {
    if (!doc.slug) continue

    const pricing: PricingProduct = {
      id: doc.id,
      name: doc.name,
      slug: doc.slug,
      status: 'published',
      archived: false,
      unitPrice: doc.unitPrice ?? 0,
      minQty: doc.minQty ?? 20,
      qtyStep: doc.qtyStep ?? 10,
      maxQty: doc.maxQty ?? 200,
      lotSizes: (doc.lotSizes as number[] | null) ?? null,
      volumeDiscounts:
        (doc.volumeDiscounts as Array<{ fromQty: number; unitPrice: number }> | null) ?? null,
    }

    const tabela = buildLotTable(toPricingConfig(pricing))
    const menor = tabela[0]
    const maior = tabela[tabela.length - 1]

    // Produto sem preço não entra na vitrine. Foi assim que o WooCommerce
    // deixou 22 variações a R$ 0 visíveis na loja.
    if (!menor || !maior || menor.lotPrice <= 0) continue

    const galeria = Array.isArray(doc.gallery) ? doc.gallery : []

    pecas.push({
      slug: doc.slug,
      nome: doc.name,
      resumo: doc.shortDescription ?? null,
      foto: foto(galeria[0]),
      foto2: foto(galeria[1]) ?? foto(galeria[0]),
      ocasioes: (Array.isArray(doc.occasions) ? doc.occasions : [])
        .map((o) => (o && typeof o === 'object' ? ((o as { name?: string }).name ?? null) : null))
        .filter((nome): nome is string => Boolean(nome)),
      minQty: menor.qty,
      maxQty: maior.qty,
      precoMinimo: menor.lotPrice,
      precoMaximo: maior.lotPrice,
      unitPrice: doc.unitPrice ?? 0,
    })
  }

  return pecas
}

/**
 * As ocasiões, com a contagem de peças de cada uma.
 *
 * A contagem vem das peças já carregadas, e não de uma consulta por
 * ocasião: sete consultas para escrever sete números seria sete idas ao
 * banco por visita na página inicial, e o banco é um Supabase com 15
 * conexões no total.
 */
export const listarOcasioes = cache(carregarOcasioes)

async function carregarOcasioes(pecas: PecaDaVitrine[]): Promise<OcasiaoDaVitrine[]> {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'occasions',
    limit: 30,
    depth: 1,
    overrideAccess: true,
    sort: 'sortOrder',
  })

  const contagem = new Map<string, number>()
  for (const peca of pecas) {
    for (const ocasiao of peca.ocasioes) {
      contagem.set(ocasiao, (contagem.get(ocasiao) ?? 0) + 1)
    }
  }

  return docs
    .filter((doc) => doc.slug && doc.name)
    .map((doc) => {
      const doPainel = [
        foto(doc.heroImage, 'card'),
        ...(Array.isArray(doc.galeria) ? doc.galeria : []).map((item: unknown) =>
          foto(
            item && typeof item === 'object' && 'image' in (item as object)
              ? (item as { image?: unknown }).image
              : item,
            'card',
          ),
        ),
      ]
        .filter((f): f is FotoDaVitrine => f !== null)
        .map((f) => f.url)

      return {
        nome: doc.name as string,
        slug: doc.slug as string,
        pecas: contagem.get(doc.name as string) ?? 0,
        fotos: doPainel.length > 0 ? doPainel.slice(0, 3) : fotosDoDesign(doc.slug as string),
      }
    })
}
