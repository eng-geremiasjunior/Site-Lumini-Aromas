'use server'

import { revalidatePath } from 'next/cache'

import { addToCart } from '../../../../commerce/cart/cart-service.ts'

export type ResultadoAdicao =
  | { ok: true; totalPecas: number; subtotal: number }
  | { ok: false; mensagem: string; campo?: string }

export type EntradaAdicao = {
  slug: string
  variantKey: string | null
  qty: number
  personalization: Record<string, string>
  addonIds: string[]
}

/**
 * Coloca o item no carrinho.
 *
 * O navegador manda apenas a escolha: produto, aroma, quantidade,
 * personalização e acabamentos. O preço é calculado no servidor, pelo
 * mesmo motor que o painel usa. Se o valor viesse da tela, bastaria
 * alterar um campo pelo navegador para comprar por qualquer preço.
 */
export async function adicionarAoCarrinho(entrada: EntradaAdicao): Promise<ResultadoAdicao> {
  const resultado = await addToCart({
    productSlug: entrada.slug,
    variantKey: entrada.variantKey,
    qty: entrada.qty,
    personalization: entrada.personalization,
    addonIds: entrada.addonIds,
  })

  if (!resultado.ok) {
    return { ok: false, mensagem: resultado.mensagem, campo: resultado.campo }
  }

  revalidatePath('/meucarrinho')

  return {
    ok: true,
    totalPecas: resultado.cart.totalPieces,
    subtotal: resultado.cart.subtotal,
  }
}
