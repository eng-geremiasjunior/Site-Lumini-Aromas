'use server'

import { getPayloadClient } from '../../../../lib/payload.ts'
import { getProductBySlug } from '../../../../commerce/catalog/get-product.ts'
import { priceLine, type PricingAddon } from '../../../../commerce/cart/price-line.ts'

export type ResultadoValidacao =
  | { ok: true; resumo: string; totalCents: number }
  | { ok: false; mensagem: string; campo?: string }

export type EntradaValidacao = {
  slug: string
  variantKey: string | null
  qty: number
  personalization: Record<string, string>
  addonIds: string[]
}

/**
 * Confere a escolha do cliente no servidor.
 *
 * O navegador manda produto, aroma, quantidade e acabamentos; o preço é
 * sempre calculado aqui. Se o valor viesse do navegador, bastaria alterar
 * um campo na tela para comprar por qualquer preço.
 */
export async function validarSelecao(entrada: EntradaValidacao): Promise<ResultadoValidacao> {
  const produto = await getProductBySlug(entrada.slug)
  if (!produto) {
    return { ok: false, mensagem: 'Produto não encontrado.' }
  }

  const addons = await carregarAcabamentos(entrada.addonIds)

  const resultado = priceLine({
    product: produto.pricing,
    variantKey: entrada.variantKey,
    qty: entrada.qty,
    personalization: entrada.personalization,
    addons,
  })

  if (!resultado.ok) {
    return { ok: false, mensagem: resultado.message, campo: resultado.field }
  }

  const { line } = resultado
  const valor = (line.total / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  const partes = [
    line.variantLabel ?? null,
    `${line.qty} peças`,
    valor,
  ].filter(Boolean)

  return { ok: true, resumo: partes.join(', '), totalCents: line.total }
}

/** Busca os acabamentos escolhidos, com o preço que está no banco. */
async function carregarAcabamentos(ids: string[]): Promise<PricingAddon[]> {
  if (ids.length === 0) return []

  const payload = await getPayloadClient()
  const resultado = await payload.find({
    collection: 'addons',
    where: { and: [{ id: { in: ids } }, { active: { equals: true } }] },
    limit: 50,
    depth: 0,
  })

  return resultado.docs.map((addon) => ({
    id: String(addon.id),
    name: addon.name,
    pricePerUnit: addon.pricePerUnit ?? 0,
    flatPrice: addon.flatPrice ?? 0,
  }))
}
