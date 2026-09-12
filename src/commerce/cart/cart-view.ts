// Leitura do carrinho. Só toca o banco — não sabe o que é cookie.
//
// A separação tem um motivo prático: `cart-service.ts` importa
// `next/headers`, que só existe dentro de uma requisição do Next. A rotina
// de carrinho abandonado roda no cron, e as coleções do Payload são
// carregadas até pela linha de comando (ao gerar tipos e migrações). Se a
// leitura do carrinho morasse junto do cookie, esses dois caminhos
// arrastariam o Next inteiro para onde ele não cabe.

import { getPayloadClient } from '../../lib/payload.ts'
import { priceLine, cartSubtotal, type PricedLine, type PricingAddon } from './price-line.ts'
import { getProductBySlug } from '../catalog/get-product.ts'
import { validarCupom } from '../coupons/coupon-service.ts'
import { totalComCupom, type CupomAplicado } from '../coupons/coupon.ts'

export type CartLine = PricedLine & {
  /** Posição do item no carrinho, usada para alterar ou remover. */
  index: number
  productSlug: string
  categoryId: string | null
  imageUrl: string | null
  addonIds: string[]
}

export type CartView = {
  token: string
  lines: CartLine[]
  subtotal: number
  /** Cupom válido neste momento, já conferido no servidor. */
  cupom: CupomAplicado | null
  /** Quanto o cupom tira do subtotal, em centavos. */
  desconto: number
  /** Total de peças no carrinho, útil no aviso de pedido mínimo. */
  totalPieces: number
  isEmpty: boolean
}

export async function buscarCarrinho(token: string) {
  const payload = await getPayloadClient()
  const resultado = await payload.find({
    collection: 'carts',
    where: { token: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return resultado.docs[0] ?? null
}

/** Acabamentos ativos, com o preço que está no banco neste momento. */
export async function carregarAcabamentos(ids: string[]): Promise<PricingAddon[]> {
  if (ids.length === 0) return []

  const payload = await getPayloadClient()
  const resultado = await payload.find({
    collection: 'addons',
    where: { and: [{ id: { in: ids } }, { active: { equals: true } }] },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })

  return resultado.docs.map((addon) => ({
    id: String(addon.id),
    name: addon.name,
    pricePerUnit: addon.pricePerUnit ?? 0,
    flatPrice: addon.flatPrice ?? 0,
  }))
}

export async function carregarProdutoPorId(id: string) {
  const payload = await getPayloadClient()
  const doc = await payload
    .findByID({ collection: 'products', id, depth: 1, overrideAccess: true })
    .catch(() => null)

  if (!doc || doc._status !== 'published' || doc.archived) return null
  return getProductBySlug(doc.slug ?? '')
}

export function carrinhoVazio(token: string): CartView {
  return { token, lines: [], subtotal: 0, cupom: null, desconto: 0, totalPieces: 0, isEmpty: true }
}

type CarrinhoDoBanco = Awaited<ReturnType<typeof buscarCarrinho>>

/**
 * Monta a visão do carrinho.
 *
 * O preço de cada linha é recalculado agora, a partir do produto, e não
 * lido de um valor guardado. Se o dono mudar o preço, o cliente vê o preço
 * novo antes de pagar, e nunca existe divergência entre o que aparece no
 * carrinho e o que será cobrado.
 */
export async function montarVisao(
  doc: NonNullable<CarrinhoDoBanco>,
  token: string,
): Promise<CartView> {
  const itens = Array.isArray(doc.items) ? doc.items : []
  const lines: CartLine[] = []

  for (const [index, item] of itens.entries()) {
    const produtoId = typeof item.product === 'object' ? item.product?.id : item.product
    if (!produtoId) continue

    const produto = await carregarProdutoPorId(String(produtoId))
    if (!produto) continue // produto saiu do ar: a linha some do carrinho

    const addonIds = Array.isArray(item.addonIds) ? (item.addonIds as string[]) : []
    const addons = await carregarAcabamentos(addonIds)

    const resultado = priceLine({
      product: produto.pricing,
      variantKey: item.variantKey ?? null,
      qty: item.qty,
      personalization: (item.personalization as Record<string, string>) ?? {},
      addons,
    })

    // Linha que deixou de ser válida (produto arquivado, aroma desativado)
    // simplesmente não aparece; o cliente não é levado ao pagamento com ela.
    if (!resultado.ok) continue

    lines.push({
      ...resultado.line,
      index,
      productSlug: produto.slug,
      categoryId: produto.categoryId,
      imageUrl: produto.images[0]?.url ?? null,
      addonIds,
    })
  }

  const subtotal = cartSubtotal(lines)
  const cupom = await conferirCupomGuardado(doc.couponCode, lines, subtotal, doc.email)

  return {
    token,
    lines,
    subtotal,
    cupom,
    desconto: cupom ? totalComCupom(subtotal, 0, cupom).desconto : 0,
    totalPieces: lines.reduce((soma, linha) => soma + linha.qty, 0),
    isEmpty: lines.length === 0,
  }
}

/**
 * A visão do carrinho a partir do identificador.
 *
 * Usada pelo lembrete de carrinho abandonado, que roda no cron e não tem
 * navegador nenhum do outro lado — portanto não tem cookie para ler.
 */
export async function resumoDoCarrinho(id: number | string): Promise<CartView | null> {
  const payload = await getPayloadClient()
  const doc = await payload
    .findByID({ collection: 'carts', id, depth: 0, overrideAccess: true })
    .catch(() => null)

  if (!doc) return null
  return montarVisao(doc, doc.token ?? '')
}

/**
 * Confere de novo o cupom que está guardado no carrinho.
 *
 * Não basta ter sido válido quando a cliente digitou: entre aquele momento e
 * o pagamento o cupom pode ter expirado, estourado o limite ou deixado de
 * valer para os itens que sobraram no carrinho. Quem decide é sempre o
 * servidor, e sempre agora.
 */
async function conferirCupomGuardado(
  codigo: string | null | undefined,
  linhas: CartLine[],
  subtotal: number,
  email?: string | null,
): Promise<CupomAplicado | null> {
  if (!codigo) return null

  const resultado = await validarCupom(codigo, {
    linhas: linhas.map((linha) => ({
      produtoId: linha.productId,
      categoriaId: linha.categoryId,
      total: linha.total,
    })),
    subtotal,
    email,
  })

  return resultado.ok ? resultado.cupom : null
}
