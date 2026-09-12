/**
 * O identificador de uma oferta.
 *
 * Existe separado porque três lugares precisam dele e precisam concordar:
 * o feed do Google Merchant, o feed da Meta e a etiqueta de remarketing
 * que roda no navegador. Se o id do feed e o id do evento forem diferentes,
 * o Google recebe o evento mas não encontra o produto correspondente no
 * catálogo — e o anúncio dinâmico simplesmente não mostra a vela que a
 * pessoa olhou. É uma falha silenciosa: nada dá erro, o remarketing só não
 * funciona.
 *
 * Por isso o cálculo mora aqui, em uma função só, e ninguém reescreve.
 */

export type OfertaIdInput = {
  produtoId: string | number
  /** O lote mínimo, que é a oferta anunciada. */
  loteMinimo: number
  sku?: string | null
  /** O id da variação no WooCommerce, para não perder o histórico no Merchant. */
  legacyWooVariationId?: number | null
  /** Decidido produto a produto, só onde o histórico antigo valia a pena. */
  preservarIdAntigo?: boolean | null
}

export function ofertaId(input: OfertaIdInput): string {
  if (input.preservarIdAntigo && input.legacyWooVariationId) {
    return String(input.legacyWooVariationId)
  }

  if (input.sku) return input.sku

  return `${input.produtoId}-${input.loteMinimo}`
}
