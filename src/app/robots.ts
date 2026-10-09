import type { MetadataRoute } from 'next'

/**
 * O que os robôs de busca podem ver.
 *
 * Enquanto a loja não vira o domínio, nada é liberado: `ALLOW_INDEXING`
 * fica desligado e o robots devolve "não entre em lugar nenhum". Isso
 * impede o endereço de pré-visualização da Vercel de concorrer no Google
 * com o site que está vendendo — conteúdo duplicado de endereço próprio é
 * o jeito mais rápido de perder posição.
 *
 * No dia da virada, a variável é ligada na Vercel e esta mesma rota passa
 * a liberar a loja e a apontar o mapa do site. Uma variável, um
 * comportamento — nada de editar arquivo com pressa no dia.
 */

export const dynamic = 'force-dynamic'

const BASE = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://luminiaromas.com.br').replace(
  /\/$/,
  '',
)

export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_ALLOW_INDEXING !== 'true') {
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // O painel e a API não têm o que indexar.
          '/admin/',
          '/api/',
          '/tarefas/',
          // Páginas de uso pessoal, que ainda viram conteúdo duplicado.
          '/meucarrinho/',
          '/finalizacaodecompra/',
          '/minhaconta/',
          '/pedido-recebido/',
          // Links com token de acompanhamento, que são de uma pessoa só.
          '/retomar/',
          '/nao-quero-lembrete/',
          // A busca interna gera infinitas combinações de URL.
          '/*?s=',
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  }
}
