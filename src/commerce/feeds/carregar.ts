import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import type { SerializedEditorState } from 'lexical'

import { getPayloadClient } from '../../lib/payload.ts'
import type { FeedProduct, FeedSettings } from './product-feed.ts'

/**
 * Traz do banco o que os feeds precisam.
 *
 * A montagem do XML já existe e tem teste em `product-feed.ts`. O que
 * faltava era a ponte: ler o catálogo publicado e entregá-lo no formato
 * que o montador espera. A regra fica lá; aqui é só leitura.
 *
 * O feed do WooCommerce que está no ar hoje manda 861 itens com o preço no
 * formato errado (`BRL760.00` em vez de `760.00 BRL`) e 28 itens com preço
 * zero. É isso que este caminho substitui.
 */

type MediaLike = { url?: string | null; sizes?: { card?: { url?: string | null } } }

function urlDaImagem(media: unknown): string | null {
  if (!media || typeof media !== 'object') return null
  const m = media as MediaLike
  // No feed vai a imagem maior: o Google exige pelo menos 1500 × 1500 e
  // recorta por conta própria. O tamanho "card" é para a vitrine.
  return m.url ?? m.sizes?.card?.url ?? null
}

/**
 * A descrição do produto como texto corrido.
 *
 * No painel ela é texto formatado; no feed tem de ser texto puro. O Google
 * recusa HTML em `g:description`, e o que chega escapado vira
 * `&lt;p&gt;` na vitrine do Shopping — exatamente o tipo de defeito que
 * ninguém vê porque ninguém abre o XML.
 */
function textoCorrido(valor: unknown): string | null {
  if (!valor) return null
  if (typeof valor === 'string') return valor

  try {
    const texto = convertLexicalToPlaintext({ data: valor as SerializedEditorState }).trim()
    return texto.length > 0 ? texto : null
  } catch {
    return null
  }
}

function nomeDoRelacionamento(valor: unknown): string | null {
  if (!valor || typeof valor !== 'object') return null
  const doc = valor as { name?: string | null; nome?: string | null; title?: string | null }
  return doc.name ?? doc.nome ?? doc.title ?? null
}

export async function carregarProdutosDoFeed(limite = 500): Promise<FeedProduct[]> {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'products',
    where: {
      and: [{ _status: { equals: 'published' } }, { archived: { not_equals: true } }],
    },
    limit: limite,
    // Profundidade 2 para a galeria vir com a URL do arquivo e a categoria
    // e as ocasiões virem com o nome, não só com o id.
    depth: 2,
    overrideAccess: true,
    sort: 'name',
  })

  return docs.map((doc) => {
    const imagens = (Array.isArray(doc.gallery) ? doc.gallery : [])
      .map((item: unknown) => {
        // A galeria pode ser um array de mídias ou de linhas com `image`.
        if (item && typeof item === 'object' && 'image' in (item as object)) {
          return urlDaImagem((item as { image?: unknown }).image)
        }
        return urlDaImagem(item)
      })
      .filter((url): url is string => Boolean(url))

    const ocasioes = (Array.isArray(doc.occasions) ? doc.occasions : [])
      .map(nomeDoRelacionamento)
      .filter((nome): nome is string => Boolean(nome))

    return {
      id: doc.id,
      name: doc.name,
      slug: doc.slug ?? null,
      status: 'published',
      archived: doc.archived ?? false,
      unitPrice: doc.unitPrice ?? 0,
      minQty: doc.minQty ?? 20,
      qtyStep: doc.qtyStep ?? 10,
      maxQty: doc.maxQty ?? 200,
      lotSizes: (doc.lotSizes as number[] | null) ?? null,
      volumeDiscounts:
        (doc.volumeDiscounts as Array<{ fromQty: number; unitPrice: number }> | null) ?? null,
      shortDescription: doc.shortDescription ?? null,
      description: textoCorrido(doc.description),
      googleProductCategory: doc.googleProductCategory ?? null,
      productType: nomeDoRelacionamento(doc.category),
      occasions: ocasioes,
      images: imagens,
      productionRules: (doc.productionDays ?? []).map((r) => ({
        fromQty: r.fromQty,
        minDays: r.minDays,
        maxDays: r.maxDays,
      })),
      unitCost: doc.unitCost ?? null,
      preserveLegacyFeedId: doc.preserveLegacyFeedId ?? null,
      variants: (doc.variants ?? []).map((v) => ({
        key: v.key ?? null,
        label: v.label ?? null,
        sku: v.sku ?? null,
        active: v.active ?? true,
        image: urlDaImagem(v.image),
        legacyWooVariationId: v.legacyWooVariationId ?? null,
      })),
    } satisfies FeedProduct
  })
}

export async function configuracoesDoFeed(): Promise<FeedSettings> {
  const payload = await getPayloadClient()

  const config = await payload
    .findGlobal({ slug: 'store-settings', depth: 0, overrideAccess: true })
    .catch(() => null)

  return {
    siteUrl: (process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://luminiaromas.com.br').replace(
      /\/$/,
      '',
    ),
    // A marca é obrigatória no feed da Meta e recomendada no do Google. O
    // feed atual não manda nenhuma.
    brand: config?.tradeName ?? 'Lumini Aromas',
    // O parcelamento anunciado tem de ser o mesmo que o checkout pratica,
    // senão o Merchant reprova por divergência de preço.
    installments: config?.maxInterestFreeInstallments ?? 3,
  }
}
