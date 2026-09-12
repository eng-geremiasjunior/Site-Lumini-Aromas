import { getPayloadClient } from '../../../lib/payload.ts'
import { getProductBySlug } from '../../../commerce/catalog/get-product.ts'

/**
 * Todos os preços de lote do catálogo publicado.
 *
 * É daqui que saem os valores do cartão-presente. Nenhum número redondo
 * inventado: cada valor oferecido compra um lote inteiro de alguma coisa,
 * e quem recebe nunca descobre, na hora de usar, que precisa completar a
 * diferença.
 */
export async function precosDeLoteDoCatalogo(): Promise<number[]> {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'products',
    where: { and: [{ _status: { equals: 'published' } }, { archived: { not_equals: true } }] },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })

  const precos: number[] = []

  for (const doc of docs) {
    if (!doc.slug) continue
    const produto = await getProductBySlug(doc.slug)
    if (!produto) continue
    precos.push(...produto.lotTable.map((linha) => linha.lotPrice))
  }

  return precos
}
