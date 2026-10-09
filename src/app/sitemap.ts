import type { MetadataRoute } from 'next'

import { getPayloadClient } from '../lib/payload.ts'

/**
 * O mapa do site para o Google.
 *
 * Hoje o site antigo não tem mapa nenhum que funcione: o `robots.txt`
 * aponta para `/wp-sitemap.xml`, que devolve XML válido com código 404, e
 * o Search Console registra isso como erro. Ou seja, o Google descobre as
 * páginas por conta própria. Começar a loja nova com um mapa correto é
 * ganho imediato, sem depender de conta nenhuma.
 *
 * O mapa é montado a partir do banco: produto publicado e não arquivado
 * entra, rascunho não. Assim o dono nunca precisa lembrar de atualizar o
 * mapa ao cadastrar um produto.
 */

export const dynamic = 'force-dynamic'

const BASE = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://luminiaromas.com.br').replace(
  /\/$/,
  '',
)

/** As páginas que existem independentemente do catálogo. */
const FIXAS: Array<{
  caminho: string
  prioridade: number
  frequencia: MetadataRoute.Sitemap[number]['changeFrequency']
}> = [
  { caminho: '/', prioridade: 1, frequencia: 'weekly' },
  { caminho: '/para-seu-evento/', prioridade: 0.8, frequencia: 'monthly' },
  { caminho: '/cartao-presente/', prioridade: 0.5, frequencia: 'yearly' },
  { caminho: '/contato/', prioridade: 0.5, frequencia: 'yearly' },
  { caminho: '/termos-de-uso/', prioridade: 0.3, frequencia: 'yearly' },
  { caminho: '/politica-de-reembolso/', prioridade: 0.3, frequencia: 'yearly' },
  { caminho: '/politica-de-privacidade/', prioridade: 0.3, frequencia: 'yearly' },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixas: MetadataRoute.Sitemap = FIXAS.map((p) => ({
    url: `${BASE}${p.caminho}`,
    lastModified: new Date(),
    changeFrequency: p.frequencia,
    priority: p.prioridade,
  }))

  // Banco fora do ar não pode derrubar o mapa inteiro: sem este catch o
  // Search Console passaria a registrar erro, que é exatamente o problema
  // que esta rota existe para resolver.
  const doBanco = await paginasDoCatalogo().catch(() => [])

  return [...fixas, ...doBanco]
}

async function paginasDoCatalogo(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayloadClient()

  const [produtos, ocasioes] = await Promise.all([
    payload.find({
      collection: 'products',
      where: {
        and: [{ _status: { equals: 'published' } }, { archived: { not_equals: true } }],
      },
      limit: 500,
      depth: 0,
      overrideAccess: true,
      select: { slug: true, updatedAt: true },
    }),
    payload.find({
      collection: 'occasions',
      limit: 50,
      depth: 0,
      overrideAccess: true,
      select: { slug: true, updatedAt: true },
    }),
  ])

  const paginas: MetadataRoute.Sitemap = []

  for (const doc of produtos.docs) {
    if (!doc.slug) continue
    paginas.push({
      url: `${BASE}/product/${doc.slug}/`,
      lastModified: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    })
  }

  for (const doc of ocasioes.docs) {
    if (!doc.slug) continue
    paginas.push({
      url: `${BASE}/para-seu-evento/${doc.slug}/`,
      lastModified: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    })
  }

  return paginas
}
