// Só roda no servidor.

import { getPayloadClient } from '../../lib/payload.ts'
import { getProductBySlug } from './get-product.ts'
import { legendaDaFoto } from './prova-social.ts'

export type ProdutoDaOcasiao = {
  slug: string
  nome: string
  resumo: string | null
  imagem: { url: string; alt: string } | null
  precoDoMenorLote: number
  menorLote: number
}

export type OcasiaoView = {
  slug: string
  nome: string
  headline: string | null
  descricao: string | null
  heroImage: { url: string; alt: string } | null
  lotesSugeridos: string | null
  inspiracoes: Array<{ url: string; alt: string }>
  faq: Array<{ pergunta: string; resposta: string }>
  produtos: ProdutoDaOcasiao[]
  /** Eventos reais deste tipo, autorizados. */
  eventos: Array<{ foto: { url: string; alt: string }; legenda: string | null }>
}

/**
 * A página de um tipo de evento.
 *
 * Existe para quem ainda não sabe o que quer. Quem chega de um anúncio de
 * casamento cai numa página que fala de casamento — com as composições que
 * já foram para casamentos e as dúvidas que noiva costuma ter — em vez de
 * numa vitrine geral onde ela precisa adivinhar o que serve para ela.
 *
 * As fotos de clientes vêm sozinhas dos eventos cadastrados, filtradas pelo
 * tipo. Nada é cadastrado duas vezes.
 */
export async function getOcasiao(slug: string): Promise<OcasiaoView | null> {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'occasions',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })

  const doc = docs[0]
  if (!doc) return null

  const { docs: produtosDoc } = await payload.find({
    collection: 'products',
    where: {
      and: [
        { _status: { equals: 'published' } },
        { archived: { not_equals: true } },
        { occasions: { contains: doc.id } },
      ],
    },
    limit: 24,
    depth: 0,
    overrideAccess: true,
  })

  const produtos: ProdutoDaOcasiao[] = []

  for (const item of produtosDoc) {
    if (!item.slug) continue
    const produto = await getProductBySlug(item.slug)
    if (!produto) continue

    const menor = produto.lotTable[0]

    produtos.push({
      slug: produto.slug,
      nome: produto.name,
      resumo: produto.shortDescription ?? null,
      imagem: produto.images[0] ? { url: produto.images[0].url, alt: produto.images[0].alt } : null,
      precoDoMenorLote: menor?.lotPrice ?? 0,
      menorLote: menor?.qty ?? produto.minQty,
    })
  }

  return {
    slug: doc.slug ?? slug,
    nome: doc.name,
    headline: doc.headline ?? null,
    descricao: doc.description ?? null,
    heroImage: paraImagem(doc.heroImage),
    lotesSugeridos: doc.suggestedLots ?? null,
    inspiracoes: (Array.isArray(doc.galeria) ? doc.galeria : [])
      .map(paraImagem)
      .filter((imagem): imagem is { url: string; alt: string } => imagem !== null),
    faq: (doc.faq ?? []).map((linha) => ({
      pergunta: linha.pergunta,
      resposta: linha.resposta,
    })),
    produtos,
    eventos: await eventosDoTipo(doc.eventType ?? null),
  }
}

/** Todas as ocasiões cadastradas, para o índice e o menu. */
export async function listarOcasioes(): Promise<
  Array<{ slug: string; nome: string; headline: string | null; imagem: { url: string; alt: string } | null }>
> {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'occasions',
    limit: 20,
    sort: 'sortOrder',
    depth: 1,
    overrideAccess: true,
  })

  return docs
    .filter((doc) => doc.slug)
    .map((doc) => ({
      slug: doc.slug as string,
      nome: doc.name,
      headline: doc.headline ?? null,
      imagem: paraImagem(doc.heroImage),
    }))
}

async function eventosDoTipo(tipo: string | null): Promise<OcasiaoView['eventos']> {
  if (!tipo) return []

  const payload = await getPayloadClient()

  const { docs } = await payload
    .find({
      collection: 'events',
      where: { and: [{ autorizado: { equals: true } }, { tipo: { equals: tipo } }] },
      sort: '-quando',
      limit: 6,
      depth: 1,
      overrideAccess: true,
    })
    .catch(() => ({ docs: [] as Array<Record<string, unknown>> }))

  const saida: OcasiaoView['eventos'] = []

  for (const evento of docs as Array<{
    tipo?: string | null
    cidade?: string | null
    quando?: string | null
    fotos?: unknown
  }>) {
    const fotos = Array.isArray(evento.fotos) ? evento.fotos : []
    const primeira = paraImagem(fotos[0])
    if (!primeira) continue

    saida.push({ foto: primeira, legenda: legendaDaFoto(evento) })
  }

  return saida
}

function paraImagem(valor: unknown): { url: string; alt: string } | null {
  if (!valor || typeof valor !== 'object') return null
  const midia = valor as { url?: string | null; alt?: string | null }
  if (!midia.url) return null
  return { url: midia.url, alt: midia.alt ?? '' }
}

/** As ocasiões ligadas a um produto, para a seção "para qual evento". */
export async function ocasioesDoProduto(
  produtoId: string | number,
): Promise<Array<{ slug: string; nome: string }>> {
  const payload = await getPayloadClient()

  const doc = await payload
    .findByID({ collection: 'products', id: produtoId, depth: 1, overrideAccess: true })
    .catch(() => null)

  // Com profundidade 1 o relacionamento vem preenchido; sem ela, viria só
  // o identificador. Os dois casos cabem no tipo, então a checagem fica.
  const ocasioes = Array.isArray(doc?.occasions) ? doc.occasions : []
  const saida: Array<{ slug: string; nome: string }> = []

  for (const item of ocasioes) {
    if (typeof item !== 'object' || item === null) continue
    if (!item.slug) continue
    saida.push({ slug: item.slug, nome: item.name })
  }

  return saida
}
