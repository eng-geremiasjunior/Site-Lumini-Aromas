import { carregarProdutosDoFeed, configuracoesDoFeed } from '../../../../commerce/feeds/carregar.ts'
import { buildFeed, type FeedChannel } from '../../../../commerce/feeds/product-feed.ts'

/**
 * Os feeds de catálogo: `/feed/google.xml` e `/feed/meta.xml`.
 *
 * São a fonte que o Google Merchant e o Commerce Manager leem por conta
 * própria, em horário programado. Ter os dois saindo do mesmo código é o
 * que garante o que o Merchant exige e o que hoje não acontece: o `g:id`
 * do feed e o `content_id` do Pixel sendo o mesmo texto. Quando divergem,
 * o anúncio dinâmico recebe o evento e não encontra o produto — e o
 * remarketing simplesmente não mostra a vela que a pessoa olhou, sem dar
 * erro em lugar nenhum.
 *
 * Uma rota só para os dois canais porque a diferença entre eles é um
 * punhado de atributos, já tratada em `product-feed.ts`.
 */

export const dynamic = 'force-dynamic'

const CANAIS: Record<string, FeedChannel> = {
  'google.xml': 'google',
  'meta.xml': 'meta',
  // Sem a extensão também responde: o endereço é digitado à mão na conta
  // do Merchant e da Meta, e errar a extensão não deveria custar uma hora.
  google: 'google',
  meta: 'meta',
  'facebook.xml': 'meta',
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ arquivo: string }> },
): Promise<Response> {
  const { arquivo } = await params
  const canal = CANAIS[arquivo.toLowerCase()]

  if (!canal) {
    return new Response('Feed não encontrado. Os endereços são /feed/google.xml e /feed/meta.xml.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const [produtos, configuracoes] = await Promise.all([
    carregarProdutosDoFeed(),
    configuracoesDoFeed(),
  ])

  const xml = buildFeed(produtos, canal, configuracoes)

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Meia hora de cache: o Merchant busca uma vez por dia, mas uma
      // revisão de preço precisa aparecer no mesmo expediente.
      'Cache-Control': 'public, max-age=1800, s-maxage=1800',
      // O feed não é página: não tem o que indexar.
      'X-Robots-Tag': 'noindex',
    },
  })
}
