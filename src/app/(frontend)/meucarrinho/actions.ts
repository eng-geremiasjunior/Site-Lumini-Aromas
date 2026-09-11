'use server'

import { revalidatePath } from 'next/cache'

import {
  addToCart,
  removeCartItem,
  updateCartItemQty,
  type CartItemInput,
  type CartResult,
} from '../../../commerce/cart/cart-service.ts'
import {
  cotarFreteDoCarrinho,
  type FreteResultado,
} from '../../../commerce/shipping/quote-cart.ts'

/**
 * Ações do carrinho.
 *
 * Todas passam pelo serviço do carrinho, que valida com a mesma função
 * usada no painel e no orçamento. O navegador nunca manda preço.
 */

export async function adicionarAoCarrinho(entrada: CartItemInput): Promise<CartResult> {
  const resultado = await addToCart(entrada)
  if (resultado.ok) revalidatePath('/meucarrinho')
  return resultado
}

export async function alterarQuantidade(index: number, qty: number): Promise<CartResult> {
  const resultado = await updateCartItemQty(index, qty)
  if (resultado.ok) revalidatePath('/meucarrinho')
  return resultado
}

export async function removerItem(index: number): Promise<CartResult> {
  const resultado = await removeCartItem(index)
  if (resultado.ok) revalidatePath('/meucarrinho')
  return resultado
}

/**
 * Calcula o frete do carrinho pelo CEP.
 *
 * Roda no servidor porque o token do Melhor Envio não pode chegar ao
 * navegador: com ele, qualquer pessoa compraria etiqueta com o saldo
 * da carteira da loja.
 */
export async function calcularFrete(cep: string): Promise<FreteResultado> {
  return cotarFreteDoCarrinho(cep)
}
