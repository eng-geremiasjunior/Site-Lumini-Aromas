import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { decidirRota } from './commerce/seo/redirecionamentos.ts'

/**
 * Atende o que chega de endereço antigo, antes de a página carregar.
 *
 * No Next 16 este arquivo se chama `proxy.ts` — era `middleware.ts` até a
 * versão 15 e o nome foi aposentado. Roda no Node, não mais só na borda.
 *
 * A decisão de o que fazer com cada URL **não está aqui**: está em
 * `src/commerce/seo/redirecionamentos.ts`, que é função pura e tem teste.
 * Aqui fica só a tradução da decisão para resposta HTTP, porque regra de
 * negócio dentro do proxy é regra que ninguém consegue testar.
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const decisao = decidirRota(pathname, searchParams)

  if (decisao.tipo === 'permanente') {
    // 301, e não 307: o 301 é o que faz o Google transferir a autoridade
    // da URL antiga para a nova, que é o ponto de tudo isto.
    return NextResponse.redirect(new URL(decisao.para, request.url), 301)
  }

  if (decisao.tipo === 'sumiu') {
    return new NextResponse(PAGINA_DO_410, {
      status: 410,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Nada de cache: se um dia a URL voltar a existir, ninguém fica
        // preso na resposta antiga.
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex',
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  // Fora os arquivos estáticos e as imagens otimizadas: sem esta exceção o
  // proxy rodaria a cada CSS e a cada foto do catálogo.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

const PAGINA_DO_410 = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Página encerrada — Lumini Aromas</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#faf7f2;color:#2b2622;
       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
  main{max-width:30rem;padding:2rem 1.5rem;text-align:center}
  p{color:#6b6259;line-height:1.7}
  a{color:#b08d57}
</style>
</head>
<body>
<main>
  <h1>Esta página não existe mais</h1>
  <p>Ela fazia parte da versão antiga da loja. As lembrancinhas continuam aqui.</p>
  <p><a href="/">Ir para a loja</a> &nbsp;·&nbsp; <a href="/contato/">Falar com a gente</a></p>
</main>
</body>
</html>
`
