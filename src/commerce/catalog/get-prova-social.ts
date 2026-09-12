// Só roda no servidor: lê pedidos e eventos direto do banco.

import { getPayloadClient } from '../../lib/payload.ts'
import { revenueStatuses } from '../orders/statuses.ts'
import { fraseDaUltimaVenda, legendaDaFoto } from './prova-social.ts'

export type ProvaSocial = {
  /** A foto de cliente que entra na galeria, quando existe e está autorizada. */
  foto: { url: string; alt: string; legenda: string | null } | null
  /** A linha que fica perto do seletor de quantidade. */
  frase: string | null
}

/**
 * O que este produto tem para mostrar.
 *
 * As duas formas saem de fontes diferentes de propósito: a foto vem dos
 * eventos que você cadastra e autoriza; a frase vem dos pedidos, sozinha,
 * sem você escrever nada. Assim a segunda funciona desde o primeiro dia,
 * mesmo em produto que ainda não tem foto de cliente.
 */
export async function provaSocialDoProduto(produtoId: string | number): Promise<ProvaSocial> {
  const [foto, frase] = await Promise.all([fotoDeCliente(produtoId), fraseDoUltimoPedido(produtoId)])
  return { foto, frase }
}

async function fotoDeCliente(produtoId: string | number): Promise<ProvaSocial['foto']> {
  const payload = await getPayloadClient()

  const { docs } = await payload
    .find({
      collection: 'events',
      where: {
        and: [{ autorizado: { equals: true } }, { produtos: { contains: produtoId } }],
      },
      sort: '-quando',
      limit: 1,
      depth: 1,
      overrideAccess: true,
    })
    .catch(() => ({ docs: [] as Array<Record<string, unknown>> }))

  const evento = docs[0] as
    | {
        tipo?: string | null
        cidade?: string | null
        quando?: string | null
        fotos?: Array<{ url?: string | null; alt?: string | null }> | null
      }
    | undefined

  const primeira = Array.isArray(evento?.fotos)
    ? evento.fotos.find((foto) => typeof foto === 'object' && foto?.url)
    : null

  if (!evento || !primeira?.url) return null

  const legenda = legendaDaFoto(evento)

  return {
    url: primeira.url,
    alt: primeira.alt || legenda || 'Peças da Lumini Aromas no evento de uma cliente',
    legenda,
  }
}

async function fraseDoUltimoPedido(produtoId: string | number): Promise<string | null> {
  const payload = await getPayloadClient()

  const { docs } = await payload
    .find({
      collection: 'orders',
      where: {
        and: [
          { status: { in: revenueStatuses() } },
          { 'items.product': { equals: produtoId } },
        ],
      },
      sort: '-datePaid',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => ({ docs: [] as Array<Record<string, unknown>> }))

  const pedido = docs[0] as
    | {
        items?: Array<{ product?: number | string | null; qty?: number | null }> | null
        eventType?: string | null
        eventDate?: string | null
        datePaid?: string | null
        shippingAddress?: { city?: string | null } | null
      }
    | undefined

  if (!pedido) return null

  const item = (pedido.items ?? []).find(
    (linha) => String(linha.product ?? '') === String(produtoId),
  )

  if (!item?.qty) return null

  return fraseDaUltimaVenda({
    quantidade: item.qty,
    tipoDoEvento: pedido.eventType ?? null,
    cidade: pedido.shippingAddress?.city ?? null,
    quando: pedido.eventDate ?? pedido.datePaid ?? null,
  })
}
