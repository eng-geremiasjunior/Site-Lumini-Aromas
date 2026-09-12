'use server'

import { getPayloadClient } from '../../../lib/payload.ts'

/**
 * Tira o carrinho da lista de lembretes.
 *
 * Marca como perdido, que é o estado que a varredura já respeita: nenhum
 * outro lembrete sai. Nada é apagado — o carrinho continua no painel, e o
 * dono continua vendo quanto deixou de vender.
 */
export async function dispensarLembretes(token: string): Promise<{ ok: boolean }> {
  if (!token || token.length < 20) return { ok: false }

  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'carts',
    where: { restoreToken: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const carrinho = docs[0]
  if (!carrinho) return { ok: false }

  await payload.update({
    collection: 'carts',
    id: carrinho.id,
    overrideAccess: true,
    data: { status: 'lost', lastActivityAt: carrinho.lastActivityAt ?? undefined },
  })

  return { ok: true }
}
