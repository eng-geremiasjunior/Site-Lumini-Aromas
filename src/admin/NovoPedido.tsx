import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'

import { getPayloadClient } from '../lib/payload.ts'
import { getProductBySlug } from '../commerce/catalog/get-product.ts'
import { FormularioDeVenda, type ProdutoParaVenda } from './FormularioDeVenda.tsx'

/**
 * Novo pedido.
 *
 * A tela que faltava. No WooCommerce, lançar uma venda fechada no WhatsApp
 * significa criar o pedido, procurar o produto, achar a variação certa entre
 * sessenta, digitar o endereço campo por campo e ainda lembrar de marcar
 * como pago. Aqui é colar a mensagem da cliente e conferir.
 *
 * O ganho não é só de tempo: cada campo redigitado é uma chance de o CEP
 * sair trocado e de o nome ir errado para cem rótulos.
 */
export async function NovoPedido(props: AdminViewServerProps) {
  const produtos = await carregarProdutos()

  return (
    <DefaultTemplate
      i18n={props.initPageResult.req.i18n}
      locale={props.initPageResult.locale}
      params={props.params}
      payload={props.initPageResult.req.payload}
      permissions={props.initPageResult.permissions}
      searchParams={props.searchParams}
      user={props.initPageResult.req.user ?? undefined}
      visibleEntities={props.initPageResult.visibleEntities}
    >
      <Gutter>
        <FormularioDeVenda produtos={produtos} />
      </Gutter>
    </DefaultTemplate>
  )
}

async function carregarProdutos(): Promise<ProdutoParaVenda[]> {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'products',
    where: { and: [{ _status: { equals: 'published' } }, { archived: { not_equals: true } }] },
    limit: 100,
    depth: 0,
    sort: 'name',
    overrideAccess: true,
  })

  const produtos: ProdutoParaVenda[] = []

  for (const doc of docs) {
    if (!doc.slug) continue
    const produto = await getProductBySlug(doc.slug)
    if (!produto) continue

    produtos.push({
      slug: produto.slug,
      nome: produto.name,
      aromas: produto.variants.map((variante) => ({
        chave: variante.key,
        rotulo: variante.label,
      })),
      faixas: produto.lotTable.map((linha) => ({
        qty: linha.qty,
        lotPrice: linha.lotPrice,
        unitPrice: linha.unitPrice,
      })),
      camposDePersonalizacao: produto.personalizationFields.map((campo) => ({
        rotulo: campo.label,
        obrigatorio: campo.required,
        limite: campo.maxChars,
      })),
    })
  }

  return produtos
}

export default NovoPedido
