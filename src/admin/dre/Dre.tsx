import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'

import { dreDoMes, mesAtual, serieDeMeses } from '../../commerce/finance/coletar.ts'
import { nomeDoMes, ultimosMeses } from '../../commerce/finance/dre.ts'
import { BarrasPorCategoria, GraficoDoAno, reais } from './Graficos.tsx'
import { TabelaDoDre } from './TabelaDoDre.tsx'

/**
 * O resultado do mês.
 *
 * Existe para responder a uma pergunta que o painel do WooCommerce nunca
 * respondeu: **sobrou quanto?** Vender R$ 50 mil num mês e não saber o que
 * disso é lucro é o que faz alguém aumentar o investimento em anúncio num
 * mês em que devia ter reduzido.
 *
 * Os quatro números do topo são os que decidem: o que entrou, o que sobrou,
 * o que a operação custou e o que o tráfego custou. O resto da tela existe
 * para explicar esses quatro.
 */
export async function Dre(props: AdminViewServerProps) {
  const busca = props.searchParams ?? {}
  const escolhido = typeof busca.mes === 'string' ? busca.mes : mesAtual()
  const mes = /^\d{4}-\d{2}$/.test(escolhido) ? escolhido : mesAtual()

  const [dados, serie] = await Promise.all([dreDoMes(mes), serieDeMeses(mes, 12)])
  const { resumo, lacunas } = dados

  const anterior = (ultimosMeses(mes, 2)[0] as string) ?? mes
  const resumoAnterior = serie[serie.length - 2]?.resumo ?? null

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
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>Resultado de {nomeDoMes(mes)}</h1>
            <p style={{ margin: '0.3rem 0 0', color: 'var(--theme-elevation-600)' }}>
              Pelo mês do pagamento, não pelo dia em que o dinheiro cai na conta.
            </p>
          </div>

          <nav style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <a href={`/admin/dre?mes=${anterior}`} style={estiloBotao}>
              ‹ {nomeDoMes(anterior).split(' de ')[0]}
            </a>
            {mes !== mesAtual() && (
              <a href="/admin/dre" style={estiloBotao}>
                Mês atual
              </a>
            )}
            <a
              href={`/admin/relatorio-do-mes?mes=${mes}`}
              style={{ ...estiloBotao, background: 'var(--theme-elevation-800)', color: 'var(--theme-elevation-0)', borderColor: 'transparent' }}
            >
              Gerar relatório
            </a>
          </nav>
        </header>

        {lacunas.length > 0 && (
          <section
            style={{
              border: '1px solid var(--theme-warning-250, var(--theme-elevation-150))',
              background: 'var(--theme-warning-50, var(--theme-elevation-50))',
              borderRadius: 6,
              padding: '0.9rem 1.1rem',
              marginBottom: '1.5rem',
            }}
          >
            <strong style={{ display: 'block', marginBottom: '0.4rem' }}>
              O que ainda falta para este número ser exato
            </strong>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--theme-elevation-700)' }}>
              {lacunas.map((aviso) => (
                <li key={aviso} style={{ marginBottom: '0.2rem' }}>
                  {aviso}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <Numero
            titulo="Receita"
            valor={resumo.receitaBruta}
            comparado={resumoAnterior?.receitaBruta}
            detalhe={`${resumo.pedidos} ${resumo.pedidos === 1 ? 'pedido' : 'pedidos'} · ticket ${reais(resumo.ticketMedio)}`}
          />
          <Numero
            titulo="Sobrou"
            valor={resumo.resultado}
            comparado={resumoAnterior?.resultado}
            detalhe={`margem de ${resumo.margemLiquida.toLocaleString('pt-BR')}%`}
            positivo={resumo.resultado >= 0}
          />
          <Numero
            titulo="Custos operacionais"
            valor={resumo.cmv + resumo.custosVariaveis + resumo.despesasFixas + resumo.financeiras}
            detalhe="peças, taxas, frete, embalagem e fixas"
          />
          <Numero
            titulo="Tráfego"
            valor={resumo.marketing}
            comparado={resumoAnterior?.marketing}
            detalhe={
              resumo.marketing > 0
                ? `retorno de ${resumo.retornoSobreTrafego.toLocaleString('pt-BR')}x · ${reais(resumo.custoPorPedido)} por pedido`
                : 'nada lançado neste mês'
            }
          />
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Os últimos doze meses</h2>
          <GraficoDoAno
            pontos={serie.map((ponto) => ({
              mes: ponto.mes,
              receita: ponto.resumo.receitaBruta,
              resultado: ponto.resumo.resultado,
              marketing: ponto.resumo.marketing,
            }))}
          />
        </section>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(22rem, 1fr))',
            gap: '2.5rem',
            alignItems: 'start',
          }}
        >
          <section>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Linha a linha</h2>
            <TabelaDoDre resumo={resumo} />
          </section>

          <section>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Por categoria</h2>
            <BarrasPorCategoria linhas={resumo.porCategoria} />

            <h2 style={{ fontSize: '1.1rem', margin: '2rem 0 1rem' }}>Onde foi o tráfego</h2>
            {resumo.marketingPorPlataforma.length > 0 ? (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.5rem' }}>
                {resumo.marketingPorPlataforma.map((linha) => (
                  <li
                    key={linha.plataforma}
                    style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}
                  >
                    <span>{linha.plataforma}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{reais(linha.valor)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'var(--theme-elevation-600)', fontSize: '0.9rem' }}>
                Lance o investimento em anúncios em Financeiro › Lançamentos para ver o retorno
                por canal.
              </p>
            )}
          </section>
        </div>
      </Gutter>
    </DefaultTemplate>
  )
}

const estiloBotao: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.5rem 0.9rem',
  borderRadius: 4,
  border: '1px solid var(--theme-elevation-150)',
  color: 'var(--theme-elevation-800)',
  textDecoration: 'none',
  fontSize: '0.88rem',
}

function Numero({
  titulo,
  valor,
  detalhe,
  comparado,
  positivo,
}: {
  titulo: string
  valor: number
  detalhe: string
  comparado?: number
  positivo?: boolean
}) {
  // A comparação com o mês anterior só aparece quando há mês anterior com
  // movimento. Variação sobre zero é sempre "infinito por cento", que não
  // informa nada.
  const variacao =
    comparado && comparado > 0 ? Math.round(((valor - comparado) / comparado) * 100) : null

  return (
    <div
      style={{
        border: '1px solid var(--theme-elevation-100)',
        borderRadius: 6,
        padding: '1rem 1.1rem',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: '0.78rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--theme-elevation-600)',
        }}
      >
        {titulo}
      </p>

      <p
        style={{
          margin: '0.35rem 0 0.2rem',
          fontSize: '1.55rem',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          color:
            positivo === false ? 'var(--theme-error-500)' : undefined,
        }}
      >
        {reais(valor)}
      </p>

      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--theme-elevation-600)' }}>
        {detalhe}
        {variacao !== null && (
          <>
            {' · '}
            <span>
              {variacao >= 0 ? '+' : ''}
              {variacao}% vs. mês anterior
            </span>
          </>
        )}
      </p>
    </div>
  )
}
