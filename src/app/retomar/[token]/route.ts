import { cookies } from 'next/headers'

import { getPayloadClient } from '../../../lib/payload.ts'

/**
 * O link do lembrete.
 *
 * Devolve o carrinho montado: acha o carrinho pelo código de retomada,
 * aponta o navegador para ele e manda a cliente para o carrinho. Se ela
 * abriu o e-mail no celular e tinha montado o carrinho no computador,
 * continua de onde parou — que é o ponto todo do lembrete.
 *
 * É uma rota, e não uma página, porque só rota e ação de servidor podem
 * gravar cookie no Next.
 */
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params
  const loja = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'

  if (token && token.length >= 20) {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'carts',
      where: { restoreToken: { equals: token } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const carrinho = docs[0]

    if (carrinho?.token && carrinho.status !== 'converted') {
      const jar = await cookies()
      jar.set('lumini_cart', carrinho.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      })

      // Ela voltou: o carrinho deixa de estar abandonado e o relógio
      // recomeça, então os lembretes que ainda não saíram não saem.
      await payload.update({
        collection: 'carts',
        id: carrinho.id,
        overrideAccess: true,
        data: { status: 'active' },
      })
    }
  }

  // Mesmo quando o código não vale mais, a cliente cai no carrinho dela em
  // vez de numa página de erro.
  return Response.redirect(`${loja.replace(/\/$/, '')}/meucarrinho/`, 303)
}
