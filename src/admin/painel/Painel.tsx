import { Gutter } from '@payloadcms/ui'

import { dreDoMes, mesAtual, serieDeMeses } from '../../commerce/finance/coletar.ts'
import { nomeDoMes } from '../../commerce/finance/dre.ts'
import { ORDER_STATUSES, type OrderStatus } from '../../commerce/orders/statuses.ts'
import { getPayloadClient } from '../../lib/payload.ts'
import { reais } from '../dre/Graficos.tsx'
import { Barras, Numero, Secao } from './pecas.tsx'

/**
 * A tela inicial do painel.
 *
 * O que vinha antes era a lista de coleções do Payload — um índice do
 * próprio sistema, que responde "o que existe aqui dentro" quando a
 * pergunta de quem abre o painel de manhã é outra: **o que preciso fazer
 * hoje, e como o mês está indo.**
 *
 * Então a ordem é essa: primeiro o que trava se ninguém mexer (arte
 * esperando aprovação, pedido pago sem produzir, pronto sem despachar),
 * depois o número do mês, e por último o atalho para as coleções.
 *
 * Os gráficos são pequenos de propósito. Um painel de dono não é relatório
 * de agência: ele precisa ser lido em dez segundos, de pé, com o celular
 * na outra mão.
 */
export async function Painel() {
  const mes = mesAtual()
  const [dados, serie, operacao] = await Promise.all([
    dreDoMes(mes),
    serieDeMeses(mes, 12),
    situacaoDaOperacao(),
  ])

  const { resumo } = dados
  const anterior = serie[serie.length - 2]?.resumo ?? null
  const maiorReceita = Math.max(...serie.map((p) => p.resumo.receitaBruta), 1)

  return (
    <Gutter>
        <header style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em' }}>
            {saudacao()}
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--theme-elevation-500)', fontSize: 13 }}>
            {nomeDoMes(mes)} · {resumo.pedidos} {resumo.pedidos === 1 ? 'pedido' : 'pedidos'} no mês
          </p>
        </header>

        {/* ------------------------------------------------- precisa de você */}
        {operacao.pendencias.length > 0 && (
          <Secao titulo="Precisa de você">
            <div style={{ display: 'grid', gap: 1, background: 'var(--theme-border-color)', border: '1px solid var(--theme-border-color)', borderRadius: 8, overflow: 'hidden' }}>
              {operacao.pendencias.map((linha) => (
                <a
                  key={linha.rotulo}
                  href={linha.link}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '0.85rem 1rem',
                    background: 'var(--theme-elevation-0)',
                    color: 'var(--theme-elevation-800)',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: linha.cor,
                        flex: '0 0 6px',
                      }}
                    />
                    {linha.rotulo}
                  </span>
                  <strong style={{ fontVariantNumeric: 'tabular-nums', fontSize: 15 }}>
                    {linha.quantas}
                  </strong>
                </a>
              ))}
            </div>
          </Secao>
        )}

        {/* ----------------------------------------------------- o mês */}
        <Secao titulo="Este mês">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))',
              gap: 1,
              background: 'var(--theme-border-color)',
              border: '1px solid var(--theme-border-color)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <Numero
              rotulo="Receita"
              valor={reais(resumo.receitaBruta)}
              variacao={variacao(resumo.receitaBruta, anterior?.receitaBruta)}
            />
            <Numero
              rotulo="Resultado"
              valor={reais(resumo.resultado)}
              apoio={`margem ${resumo.margemLiquida.toLocaleString('pt-BR')}%`}
              negativo={resumo.resultado < 0}
            />
            <Numero rotulo="Ticket médio" valor={reais(resumo.ticketMedio)} apoio={`${resumo.pecas} peças`} />
            <Numero
              rotulo="Tráfego"
              valor={reais(resumo.marketing)}
              apoio={resumo.marketing > 0 ? `retorno ${resumo.retornoSobreTrafego.toLocaleString('pt-BR')}x` : 'nada lançado'}
            />
          </div>
        </Secao>

        {/* -------------------------------------------------- doze meses */}
        <Secao titulo="Receita dos últimos doze meses" acao={{ rotulo: 'Resultado do mês', link: '/admin/dre' }}>
          <Barras
            pontos={serie.map((p) => ({
              rotulo: p.mes,
              valor: p.resumo.receitaBruta,
              teto: maiorReceita,
              texto: reais(p.resumo.receitaBruta),
            }))}
          />
        </Secao>

        {/* ------------------------------------------------- por situação */}
        {operacao.porStatus.length > 0 && (
          <Secao titulo="Pedidos por situação" acao={{ rotulo: 'Ver todos', link: '/admin/collections/orders' }}>
            <div style={{ display: 'grid', gap: '0.55rem' }}>
              {operacao.porStatus.map((linha) => (
                <div key={linha.chave} style={{ display: 'grid', gridTemplateColumns: '11rem 1fr 3rem', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--theme-elevation-700)' }}>{linha.rotulo}</span>
                  <span style={{ height: 8, borderRadius: 4, background: 'var(--theme-elevation-100)', overflow: 'hidden' }}>
                    <span
                      style={{
                        display: 'block',
                        height: '100%',
                        width: `${Math.max((linha.quantas / operacao.totalDePedidos) * 100, 2)}%`,
                        background: 'var(--theme-elevation-500)',
                      }}
                    />
                  </span>
                  <strong style={{ fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {linha.quantas}
                  </strong>
                </div>
              ))}
            </div>
          </Secao>
        )}

        {/* ----------------------------------------------------- atalhos */}
        <Secao titulo="Ir para">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {[
              { rotulo: 'Lançar venda do WhatsApp', link: '/admin/novo-pedido' },
              { rotulo: 'Resultado do mês', link: '/admin/dre' },
              { rotulo: 'O que comprar', link: '/admin/materiais' },
              { rotulo: 'Importar anúncios', link: '/admin/importar-anuncios' },
              { rotulo: 'Produtos', link: '/admin/collections/products' },
              { rotulo: 'Pedidos', link: '/admin/collections/orders' },
            ].map((item) => (
              <a
                key={item.link}
                href={item.link}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: 6,
                  border: '1px solid var(--theme-border-color)',
                  background: 'var(--theme-elevation-0)',
                  color: 'var(--theme-elevation-700)',
                  textDecoration: 'none',
                  fontSize: 13,
                }}
              >
                {item.rotulo}
              </a>
            ))}
          </div>
        </Secao>
    </Gutter>
  )
}

function saudacao(): string {
  const hora = Number(
    new Date().toLocaleString('pt-BR', { hour: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' }),
  )

  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

function variacao(agora: number, antes?: number): string | null {
  if (!antes || antes <= 0) return null
  const pontos = Math.round(((agora - antes) / antes) * 100)
  return `${pontos >= 0 ? '+' : ''}${pontos}% vs. mês anterior`
}

type Pendencia = { rotulo: string; quantas: number; link: string; cor: string }

/**
 * O que está parado esperando alguém.
 *
 * Cada linha é uma situação em que o pedido não anda sozinho: a arte
 * esperando a cliente, a produção esperando começar, a caixa esperando
 * despacho. São as três formas de um pedido atrasar sem ninguém perceber.
 */
async function situacaoDaOperacao(): Promise<{
  pendencias: Pendencia[]
  porStatus: Array<{ chave: string; rotulo: string; quantas: number }>
  totalDePedidos: number
}> {
  const payload = await getPayloadClient()

  async function contar(status: OrderStatus): Promise<number> {
    const { totalDocs } = await payload
      .count({ collection: 'orders', where: { status: { equals: status } }, overrideAccess: true })
      .catch(() => ({ totalDocs: 0 }))
    return totalDocs
  }

  const chaves = Object.keys(ORDER_STATUSES) as OrderStatus[]
  const contagens = await Promise.all(chaves.map((chave) => contar(chave)))

  const porStatus = chaves
    .map((chave, i) => ({
      chave,
      rotulo: ORDER_STATUSES[chave]?.label ?? chave,
      quantas: contagens[i] ?? 0,
    }))
    .filter((linha) => linha.quantas > 0)
    .sort((a, b) => b.quantas - a.quantas)

  const totalDePedidos = porStatus.reduce((soma, l) => soma + l.quantas, 0) || 1

  const mapa = new Map(porStatus.map((l) => [l.chave, l.quantas]))

  const pendencias: Pendencia[] = [
    {
      rotulo: 'Arte esperando aprovação da cliente',
      quantas: mapa.get('art_approval') ?? 0,
      link: '/admin/collections/orders?where[status][equals]=art_approval',
      cor: 'var(--lumini-espera)',
    },
    {
      rotulo: 'Pago, aguardando início da produção',
      quantas: mapa.get('processing') ?? 0,
      link: '/admin/collections/orders?where[status][equals]=processing',
      cor: 'var(--lumini-espera)',
    },
    {
      rotulo: 'Em produção',
      quantas: mapa.get('production') ?? 0,
      link: '/admin/collections/orders?where[status][equals]=production',
      cor: 'var(--theme-elevation-400)',
    },
    {
      rotulo: 'Aguardando pagamento',
      quantas: mapa.get('pending') ?? 0,
      link: '/admin/collections/orders?where[status][equals]=pending',
      cor: 'var(--theme-elevation-400)',
    },
    {
      rotulo: 'Em disputa',
      quantas: mapa.get('disputed') ?? 0,
      link: '/admin/collections/orders?where[status][equals]=disputed',
      cor: 'var(--lumini-erro)',
    },
  ].filter((linha) => linha.quantas > 0)

  return { pendencias, porStatus, totalDePedidos }
}

export default Painel
