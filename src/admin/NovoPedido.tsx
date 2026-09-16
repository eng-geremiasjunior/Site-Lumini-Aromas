import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'

import { getPayloadClient } from '../lib/payload.ts'
import { toPricingConfig } from '../commerce/cart/price-line.ts'
import { FormularioDeVenda, type ProdutoParaVenda } from './FormularioDeVenda.tsx'

type LinhaDaTabela = { qty: number; lotPrice: number; unitPrice: number }

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

/**
 * Os produtos que podem ser vendidos à mão.
 *
 * Inclui rascunho de propósito. Um produto recém-importado do site antigo
 * ainda não foi conferido para ir à vitrine, mas continua sendo vendido no
 * WhatsApp todo dia — e obrigar a publicar 19 produtos sem revisar, só para
 * registrar uma venda que já aconteceu, seria trocar um cuidado real por
 * uma pressa maior. Quem é rascunho aparece marcado.
 */
async function carregarProdutos(): Promise<ProdutoParaVenda[]> {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'products',
    where: { archived: { not_equals: true } },
    limit: 200,
    depth: 0,
    sort: 'name',
    draft: true,
    overrideAccess: true,
  })

  const produtos: ProdutoParaVenda[] = []

  for (const doc of docs) {
    if (!doc.slug || !doc.unitPrice) continue

    const config = toPricingConfig({
      id: doc.id,
      name: doc.name,
      slug: doc.slug,
      status: 'published',
      archived: false,
      unitPrice: doc.unitPrice,
      minQty: doc.minQty ?? 20,
      qtyStep: doc.qtyStep ?? 10,
      maxQty: doc.maxQty ?? 200,
      lotSizes: (doc.lotSizes as number[] | null) ?? null,
      volumeDiscounts:
        (doc.volumeDiscounts as Array<{ fromQty: number; unitPrice: number }> | null) ?? null,
      variants: [],
      personalizationFields: [],
    })

    produtos.push({
      slug: doc.slug,
      nome: doc._status === 'published' ? doc.name : `${doc.name} (rascunho)`,
      config,
      aromas: (doc.variants ?? [])
        .filter((variante) => variante.key && variante.active !== false)
        .map((variante) => ({
          chave: variante.key as string,
          rotulo: variante.label ?? (variante.key as string),
        })),
      // A tabela é gravada como JSON pelo gancho do produto.
      faixas: (Array.isArray(doc.lotTable) ? (doc.lotTable as LinhaDaTabela[]) : []).map(
        (linha) => ({ qty: linha.qty, lotPrice: linha.lotPrice, unitPrice: linha.unitPrice }),
      ),
      camposDePersonalizacao: (doc.personalizationFields ?? []).map((campo) => ({
        rotulo: campo.label,
        obrigatorio: campo.required ?? false,
        limite: campo.maxChars ?? null,
      })),
    })
  }

  return produtos
}

export default NovoPedido
