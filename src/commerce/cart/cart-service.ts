// Este módulo só roda no servidor: usa cookies e o banco direto.

import { randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'

import { getPayloadClient } from '../../lib/payload.ts'
import { priceLine, cartSubtotal, type PricedLine, type PricingAddon } from './price-line.ts'
import { getProductBySlug } from '../catalog/get-product.ts'

const COOKIE = 'lumini_cart'
const TRINTA_DIAS = 60 * 60 * 24 * 30

export type CartItemInput = {
  productSlug: string
  variantKey: string | null
  qty: number
  personalization: Record<string, string>
  addonIds: string[]
}

export type CartLine = PricedLine & {
  /** Posição do item no carrinho, usada para alterar ou remover. */
  index: number
  productSlug: string
  imageUrl: string | null
  addonIds: string[]
}

export type CartView = {
  token: string
  lines: CartLine[]
  subtotal: number
  /** Total de peças no carrinho, útil no aviso de pedido mínimo. */
  totalPieces: number
  isEmpty: boolean
}

export type CartResult = { ok: true; cart: CartView } | { ok: false; mensagem: string; campo?: string }

/**
 * Lê o código do carrinho do navegador, sem criar um novo.
 * Usado nas telas que só mostram o carrinho.
 */
async function lerToken(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(COOKIE)?.value ?? null
}

/** Lê o código, criando um se ainda não existir. */
async function garantirToken(): Promise<string> {
  const jar = await cookies()
  const existente = jar.get(COOKIE)?.value
  if (existente) return existente

  const token = randomUUID()
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TRINTA_DIAS,
  })
  return token
}

async function buscarCarrinho(token: string) {
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
async function carregarAcabamentos(ids: string[]): Promise<PricingAddon[]> {
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

/**
 * Monta a visão do carrinho.
 *
 * O preço de cada linha é recalculado agora, a partir do produto, e não
 * lido de um valor guardado. Se o dono mudar o preço, o cliente vê o preço
 * novo antes de pagar, e nunca existe divergência entre o que aparece no
 * carrinho e o que será cobrado.
 */
export async function getCart(): Promise<CartView> {
  const token = await lerToken()
  if (!token) return { token: '', lines: [], subtotal: 0, totalPieces: 0, isEmpty: true }

  const doc = await buscarCarrinho(token)
  if (!doc) return { token, lines: [], subtotal: 0, totalPieces: 0, isEmpty: true }

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
      imageUrl: produto.images[0]?.url ?? null,
      addonIds,
    })
  }

  return {
    token,
    lines,
    subtotal: cartSubtotal(lines),
    totalPieces: lines.reduce((soma, linha) => soma + linha.qty, 0),
    isEmpty: lines.length === 0,
  }
}

async function carregarProdutoPorId(id: string) {
  const payload = await getPayloadClient()
  const doc = await payload.findByID({
    collection: 'products',
    id,
    depth: 1,
    overrideAccess: true,
  }).catch(() => null)

  if (!doc || doc._status !== 'published' || doc.archived) return null
  return getProductBySlug(doc.slug ?? '')
}

/**
 * Adiciona um item.
 *
 * A validação passa por priceLine, que chama guardLot: é a mesma regra do
 * painel, do orçamento e da venda manual. Se a quantidade não for uma das
 * faixas, ou faltar um campo obrigatório, o item não entra.
 */
export async function addToCart(entrada: CartItemInput): Promise<CartResult> {
  const produto = await getProductBySlug(entrada.productSlug)
  if (!produto) return { ok: false, mensagem: 'Produto não encontrado.' }

  const addons = await carregarAcabamentos(entrada.addonIds)

  const validacao = priceLine({
    product: produto.pricing,
    variantKey: entrada.variantKey,
    qty: entrada.qty,
    personalization: entrada.personalization,
    addons,
  })

  if (!validacao.ok) {
    return { ok: false, mensagem: validacao.message, campo: validacao.field }
  }

  const token = await garantirToken()
  const payload = await getPayloadClient()
  const existente = await buscarCarrinho(token)

  const novoItem = {
    product: Number(produto.id),
    variantKey: entrada.variantKey,
    qty: entrada.qty,
    personalization: entrada.personalization,
    addonIds: entrada.addonIds,
  }

  if (existente) {
    const itens = Array.isArray(existente.items) ? existente.items : []
    await payload.update({
      collection: 'carts',
      id: existente.id,
      data: { items: [...itens, novoItem], status: 'active' },
      overrideAccess: true,
    })
  } else {
    await payload.create({
      collection: 'carts',
      data: { token, status: 'active', items: [novoItem] },
      overrideAccess: true,
    })
  }

  return { ok: true, cart: await getCart() }
}

/** Troca a quantidade de uma linha, validando de novo. */
export async function updateCartItemQty(index: number, qty: number): Promise<CartResult> {
  const token = await lerToken()
  if (!token) return { ok: false, mensagem: 'Carrinho não encontrado.' }

  const doc = await buscarCarrinho(token)
  if (!doc) return { ok: false, mensagem: 'Carrinho não encontrado.' }

  const itens = Array.isArray(doc.items) ? [...doc.items] : []
  const item = itens[index]
  if (!item) return { ok: false, mensagem: 'Item não encontrado no carrinho.' }

  const produtoId = typeof item.product === 'object' ? item.product?.id : item.product
  const produto = produtoId ? await carregarProdutoPorId(String(produtoId)) : null
  if (!produto) return { ok: false, mensagem: 'Produto não está mais disponível.' }

  const validacao = priceLine({
    product: produto.pricing,
    variantKey: item.variantKey ?? null,
    qty,
    personalization: (item.personalization as Record<string, string>) ?? {},
    addons: await carregarAcabamentos(
      Array.isArray(item.addonIds) ? (item.addonIds as string[]) : [],
    ),
  })

  if (!validacao.ok) return { ok: false, mensagem: validacao.message }

  itens[index] = { ...item, qty }

  const payload = await getPayloadClient()
  await payload.update({
    collection: 'carts',
    id: doc.id,
    data: { items: itens },
    overrideAccess: true,
  })

  return { ok: true, cart: await getCart() }
}

/** Remove uma linha do carrinho. */
export async function removeCartItem(index: number): Promise<CartResult> {
  const token = await lerToken()
  if (!token) return { ok: false, mensagem: 'Carrinho não encontrado.' }

  const doc = await buscarCarrinho(token)
  if (!doc) return { ok: false, mensagem: 'Carrinho não encontrado.' }

  const itens = Array.isArray(doc.items) ? [...doc.items] : []
  if (!itens[index]) return { ok: false, mensagem: 'Item não encontrado no carrinho.' }

  itens.splice(index, 1)

  const payload = await getPayloadClient()
  await payload.update({
    collection: 'carts',
    id: doc.id,
    data: { items: itens },
    overrideAccess: true,
  })

  return { ok: true, cart: await getCart() }
}

/** Guarda o contato assim que o cliente informa, para recuperar o carrinho depois. */
export async function saveCartContact(email: string, phone?: string): Promise<void> {
  const token = await lerToken()
  if (!token) return

  const doc = await buscarCarrinho(token)
  if (!doc) return

  const payload = await getPayloadClient()
  await payload.update({
    collection: 'carts',
    id: doc.id,
    data: { email, ...(phone ? { phone } : {}) },
    overrideAccess: true,
  })
}
