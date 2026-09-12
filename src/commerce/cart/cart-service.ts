// Este módulo só roda no servidor: usa cookies e o banco direto.

import { randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'

import { getPayloadClient } from '../../lib/payload.ts'
import { priceLine } from './price-line.ts'
import { getProductBySlug } from '../catalog/get-product.ts'
import {
  buscarCarrinho,
  carregarAcabamentos,
  carregarProdutoPorId,
  carrinhoVazio,
  montarVisao,
  type CartView,
} from './cart-view.ts'
import { validarCupom } from '../coupons/coupon-service.ts'

const COOKIE = 'lumini_cart'
const TRINTA_DIAS = 60 * 60 * 24 * 30

export type CartItemInput = {
  productSlug: string
  variantKey: string | null
  qty: number
  personalization: Record<string, string>
  addonIds: string[]
}

export type { CartLine, CartView } from './cart-view.ts'

export type CartResult =
  | { ok: true; cart: CartView }
  | { ok: false; mensagem: string; campo?: string }

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

/** O carrinho desta sessão. */
export async function getCart(): Promise<CartView> {
  const token = await lerToken()
  if (!token) return carrinhoVazio('')

  const doc = await buscarCarrinho(token)
  if (!doc) return carrinhoVazio(token)

  return montarVisao(doc, token)
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
export async function saveCartContact(email: string, phone?: string, nome?: string): Promise<void> {
  const token = await lerToken()
  if (!token) return

  const doc = await buscarCarrinho(token)
  if (!doc) return

  const payload = await getPayloadClient()
  await payload.update({
    collection: 'carts',
    id: doc.id,
    data: { email, ...(phone ? { phone } : {}), ...(nome ? { customerName: nome } : {}) },
    overrideAccess: true,
  })
}

/**
 * Aplica um cupom ao carrinho.
 *
 * Guarda só o código. O desconto é recalculado a cada leitura do carrinho,
 * pela mesma razão que o preço do lote nunca é gravado: um valor guardado
 * envelhece, e aí a tela mostra um número e a cobrança faz outro.
 */
export async function aplicarCupomNoCarrinho(
  codigo: string,
): Promise<{ ok: true; cart: CartView } | { ok: false; mensagem: string }> {
  const carrinho = await getCart()

  if (carrinho.isEmpty) {
    return { ok: false, mensagem: 'Coloque alguma coisa no carrinho antes de usar o cupom.' }
  }

  const token = await lerToken()
  const doc = token ? await buscarCarrinho(token) : null
  if (!doc) return { ok: false, mensagem: 'Seu carrinho expirou. Monte de novo, é rapidinho.' }

  const resultado = await validarCupom(codigo, {
    linhas: carrinho.lines.map((linha) => ({
      produtoId: linha.productId,
      categoriaId: linha.categoryId,
      total: linha.total,
    })),
    subtotal: carrinho.subtotal,
    email: doc.email,
  })

  if (!resultado.ok) return { ok: false, mensagem: resultado.motivo }

  const payload = await getPayloadClient()
  await payload.update({
    collection: 'carts',
    id: doc.id,
    data: { couponCode: resultado.cupom.codigo },
    overrideAccess: true,
  })

  return { ok: true, cart: await getCart() }
}

/** Tira o cupom do carrinho. */
export async function removerCupomDoCarrinho(): Promise<CartView> {
  const token = await lerToken()
  const doc = token ? await buscarCarrinho(token) : null

  if (doc) {
    const payload = await getPayloadClient()
    await payload.update({
      collection: 'carts',
      id: doc.id,
      data: { couponCode: null },
      overrideAccess: true,
    })
  }

  return getCart()
}
