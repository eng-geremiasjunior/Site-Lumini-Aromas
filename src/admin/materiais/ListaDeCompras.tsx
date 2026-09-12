import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'

import { intervaloDoMes, mesAtual } from '../../commerce/finance/coletar.ts'
import { nomeDoMes } from '../../commerce/finance/dre.ts'
import { formatarReais } from '../../commerce/format/mascaras.ts'
import { getPayloadClient } from '../../lib/payload.ts'
import { carregarInsumos, fichaDoDocumento } from '../../commerce/materials/ficha.ts'
import {
  listaDeCompras,
  rotuloDaCompra,
  rotuloDoUso,
  type FichaDoProduto,
  type ItemProduzido,
} from '../../commerce/materials/materiais.ts'

/**
 * O que comprar.
 *
 * Responde à pergunta que hoje é feita de cabeça a cada pedido: vendi 100
 * velas no copinho, quanto compro de cada coisa? A conversão entre o que se
 * usa e o que se compra sai pronta — 5,8 kg de cera viram 6 quilos, 100
 * pavios viram 2 caixas, 35 metros de fita viram 1 rolo.
 *
 * O padrão é olhar **os pedidos que estão em produção**, e não um período no
 * calendário: é o que precisa ser comprado agora para o que já foi vendido.
 * O mês fechado existe para conferir o que foi gasto depois.
 */

const EM_PRODUCAO = ['processing', 'art_approval', 'production']

export async function ListaDeCompras(props: AdminViewServerProps) {
  const busca = props.searchParams ?? {}
  const escopo = busca.escopo === 'mes' ? 'mes' : 'producao'
  const mesEscolhido = typeof busca.mes === 'string' ? busca.mes : mesAtual()
  const mes = /^\d{4}-\d{2}$/.test(mesEscolhido) ? mesEscolhido : mesAtual()

  const payload = await getPayloadClient()

  const where =
    escopo === 'mes'
      ? (() => {
          const [inicio, fim] = intervaloDoMes(mes)
          return {
            and: [
              { datePaid: { greater_than_equal: inicio } },
              { datePaid: { less_than: fim } },
            ],
          }
        })()
      : { status: { in: EM_PRODUCAO } }

  const { docs: pedidos } = await payload.find({
    collection: 'orders',
    where,
    limit: 500,
    depth: 0,
    sort: 'number',
    overrideAccess: true,
  })

  const { docs: produtos } = await payload.find({
    collection: 'products',
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })

  const insumos = await carregarInsumos(
    payload as unknown as Parameters<typeof carregarInsumos>[0],
  )

  const fichas: FichaDoProduto[] = produtos
    .map((doc) => fichaDoDocumento(doc as unknown as Record<string, unknown>))
    .filter((ficha) => ficha.linhas.length > 0)

  const itens: ItemProduzido[] = []

  for (const pedido of pedidos) {
    for (const item of pedido.items ?? []) {
      const produtoId =
        item.product && typeof item.product === 'object'
          ? String((item.product as { id: string | number }).id)
          : String(item.product ?? '')

      itens.push({
        produtoId,
        variante: item.variantLabel ?? null,
        personalizacao: (item.personalization as Record<string, string> | null) ?? null,
        pecas: item.qty ?? 0,
      })
    }
  }

  const lista = listaDeCompras(itens, fichas, insumos, 'ultimo')
  const semFicha = produtos.length - fichas.length

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
        <header
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>O que comprar</h1>
            <p style={{ margin: '0.3rem 0 0', color: 'var(--theme-elevation-600)' }}>
              {escopo === 'producao'
                ? `${pedidos.length} pedido(s) em produção · ${lista.pecas} peça(s)`
                : `${nomeDoMes(mes)} · ${pedidos.length} pedido(s) · ${lista.pecas} peça(s)`}
            </p>
          </div>

          <nav style={{ display: 'flex', gap: '0.5rem' }}>
            <a href="/admin/materiais" style={escopo === 'producao' ? botaoAtivo : botao}>
              Em produção
            </a>
            <a
              href={`/admin/materiais?escopo=mes&mes=${mes}`}
              style={escopo === 'mes' ? botaoAtivo : botao}
            >
              Fechar o mês
            </a>
          </nav>
        </header>

        {fichas.length === 0 ? (
          <p>
            Nenhum produto tem ficha de materiais ainda. Abra um produto, vá na aba{' '}
            <strong>Materiais</strong> e diga o que entra em uma peça — 1 copo, 60 ml de cera,
            35 cm de fita. A lista aparece aqui sozinha.
          </p>
        ) : (
          <>
            {(lista.semInsumo.length > 0 || lista.semPreco.length > 0 || semFicha > 0) && (
              <section style={caixaDeAviso}>
                <strong style={{ display: 'block', marginBottom: '0.4rem' }}>
                  O que esta lista ainda não sabe
                </strong>
                <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                  {semFicha > 0 && (
                    <li>
                      {semFicha} produto(s) sem ficha de materiais — o que eles consomem não
                      entra nesta conta.
                    </li>
                  )}
                  {lista.semInsumo.map((aviso) => (
                    <li key={aviso}>
                      Sem material cadastrado para a escolha <strong>{aviso}</strong>.
                    </li>
                  ))}
                  {lista.semPreco.length > 0 && (
                    <li>
                      Sem compra registrada, então sem preço: {lista.semPreco.join(', ')}. Ficam
                      fora do total.
                    </li>
                  )}
                </ul>
              </section>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ color: 'var(--theme-elevation-600)' }}>
                    <th style={{ ...celula, textAlign: 'left' }}>Material</th>
                    <th style={celula}>Necessário</th>
                    <th style={celula}>Em estoque</th>
                    <th style={celula}>Falta</th>
                    <th style={{ ...celula, textAlign: 'left' }}>Comprar</th>
                    <th style={celula}>Custo estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.linhas.map((linha) => (
                    <tr
                      key={linha.insumoId}
                      style={{ borderTop: '1px solid var(--theme-elevation-100)' }}
                    >
                      <td style={{ ...celula, textAlign: 'left' }}>{linha.nome}</td>
                      <td style={celula}>
                        {formatar(linha.necessario)} {rotuloDoUso(linha.unidadeDeUso)}
                      </td>
                      <td style={{ ...celula, color: 'var(--theme-elevation-600)' }}>
                        {linha.estoque > 0
                          ? `${formatar(linha.estoque)} ${rotuloDoUso(linha.unidadeDeUso)}`
                          : '—'}
                      </td>
                      <td style={celula}>
                        {formatar(linha.aComprar)} {rotuloDoUso(linha.unidadeDeUso)}
                      </td>
                      <td style={{ ...celula, textAlign: 'left', fontWeight: 600 }}>
                        {linha.embalagens}{' '}
                        {rotuloDaCompra(linha.unidadeDeCompra, linha.embalagens)}
                        {linha.compraArredondada > linha.aComprar && linha.embalagens > 0 && (
                          <span
                            style={{
                              fontWeight: 400,
                              color: 'var(--theme-elevation-600)',
                              fontSize: '0.82rem',
                            }}
                          >
                            {' '}
                            (sobram {formatar(linha.compraArredondada - linha.aComprar)}{' '}
                            {rotuloDoUso(linha.unidadeDeUso)})
                          </span>
                        )}
                      </td>
                      <td style={celula}>
                        {linha.custoEstimado === null ? '—' : formatarReais(linha.custoEstimado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--theme-elevation-150)', fontWeight: 600 }}>
                    <td style={{ ...celula, textAlign: 'left' }} colSpan={5}>
                      Total estimado
                    </td>
                    <td style={celula}>{formatarReais(lista.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--theme-elevation-600)' }}>
              O custo estimado usa o preço da última compra de cada material, que é o que
              melhor prevê o que você vai pagar agora. O custo que entra no resultado do mês
              usa a média ponderada das compras, que representa melhor o material consumido.
            </p>
          </>
        )}
      </Gutter>
    </DefaultTemplate>
  )
}

function formatar(valor: number): string {
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

const celula: React.CSSProperties = {
  padding: '0.5rem 0.6rem',
  textAlign: 'right',
  fontWeight: 400,
  fontVariantNumeric: 'tabular-nums',
}

const botao: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.5rem 0.9rem',
  borderRadius: 4,
  border: '1px solid var(--theme-elevation-150)',
  color: 'var(--theme-elevation-800)',
  textDecoration: 'none',
  fontSize: '0.88rem',
}

const botaoAtivo: React.CSSProperties = {
  ...botao,
  background: 'var(--theme-elevation-800)',
  color: 'var(--theme-elevation-0)',
  borderColor: 'transparent',
}

const caixaDeAviso: React.CSSProperties = {
  border: '1px solid var(--theme-warning-250, var(--theme-elevation-150))',
  background: 'var(--theme-warning-50, var(--theme-elevation-50))',
  borderRadius: 6,
  padding: '0.9rem 1.1rem',
  marginBottom: '1.5rem',
}
