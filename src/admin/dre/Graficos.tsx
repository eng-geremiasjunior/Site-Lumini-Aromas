import { nomeDoMes } from '../../commerce/finance/dre.ts'

/**
 * Os gráficos do mês, desenhados à mão em SVG.
 *
 * Sem biblioteca de gráfico de propósito: são duas formas simples, e uma
 * dependência a mais no painel significa mais peso para carregar, mais uma
 * coisa para atualizar e mais um ponto que pode quebrar num upgrade do
 * Next. O SVG aqui também imprime bem, que é o que o relatório do fim do
 * mês precisa.
 *
 * As cores vêm das variáveis do painel, então funcionam no tema claro e no
 * escuro sem dois códigos.
 */

export function reais(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
}

/** Reais sem centavos, para eixo de gráfico e número grande. */
export function reaisCurto(centavos: number): string {
  const valor = centavos / 100
  if (Math.abs(valor) >= 1000) {
    return `R$ ${(valor / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  }
  return `R$ ${valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
}

export type PontoDoMes = {
  mes: string
  receita: number
  resultado: number
  marketing: number
}

/**
 * Receita e resultado, mês a mês.
 *
 * As duas séries juntas de propósito: a receita sozinha conta metade da
 * história, e é a metade que engana. Um mês de R$ 50 mil com resultado de
 * R$ 2 mil precisa parecer diferente de um de R$ 30 mil com R$ 9 mil.
 */
export function GraficoDoAno({ pontos }: { pontos: PontoDoMes[] }) {
  const largura = 860
  const altura = 260
  const margemEsquerda = 8
  const margemBaixo = 34
  const teto = Math.max(...pontos.map((p) => Math.max(p.receita, p.resultado, 0)), 1)

  const larguraDoMes = (largura - margemEsquerda) / Math.max(pontos.length, 1)
  const larguraDaBarra = Math.min(larguraDoMes * 0.34, 26)
  const alturaUtil = altura - margemBaixo

  function alturaDe(valor: number): number {
    return Math.max((Math.max(valor, 0) / teto) * (alturaUtil - 12), valor > 0 ? 2 : 0)
  }

  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${largura} ${altura}`}
        role="img"
        aria-label="Receita e resultado dos últimos meses"
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
      >
        <line
          x1={margemEsquerda}
          y1={alturaUtil}
          x2={largura}
          y2={alturaUtil}
          stroke="var(--theme-elevation-150)"
        />

        {pontos.map((ponto, indice) => {
          const centro = margemEsquerda + larguraDoMes * indice + larguraDoMes / 2
          const receita = alturaDe(ponto.receita)
          const resultado = alturaDe(ponto.resultado)
          const negativo = ponto.resultado < 0

          return (
            <g key={ponto.mes}>
              <rect
                x={centro - larguraDaBarra - 2}
                y={alturaUtil - receita}
                width={larguraDaBarra}
                height={receita}
                rx={2}
                fill="var(--theme-elevation-400)"
              >
                <title>{`${nomeDoMes(ponto.mes)}: receita de ${reais(ponto.receita)}`}</title>
              </rect>

              <rect
                x={centro + 2}
                y={alturaUtil - resultado}
                width={larguraDaBarra}
                height={negativo ? 2 : resultado}
                rx={2}
                fill={negativo ? 'var(--theme-error-500)' : 'var(--theme-success-500)'}
              >
                <title>{`${nomeDoMes(ponto.mes)}: resultado de ${reais(ponto.resultado)}`}</title>
              </rect>

              <text
                x={centro}
                y={altura - 16}
                textAnchor="middle"
                fontSize="11"
                fill="var(--theme-elevation-600)"
              >
                {rotuloDoMes(ponto.mes)}
              </text>

              {ponto.receita > 0 && (
                <text
                  x={centro}
                  y={altura - 3}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--theme-elevation-450)"
                >
                  {reaisCurto(ponto.receita)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <figcaption
        style={{
          display: 'flex',
          gap: '1.25rem',
          fontSize: '0.8rem',
          color: 'var(--theme-elevation-600)',
          marginTop: '0.75rem',
        }}
      >
        <Legenda cor="var(--theme-elevation-400)">Receita</Legenda>
        <Legenda cor="var(--theme-success-500)">Resultado</Legenda>
      </figcaption>
    </figure>
  )
}

/** Participação de cada categoria na receita do mês. */
export function BarrasPorCategoria({
  linhas,
}: {
  linhas: Array<{ categoria: string; receita: number; margem: number; participacao: number }>
}) {
  if (linhas.length === 0) {
    return (
      <p style={{ color: 'var(--theme-elevation-600)', fontSize: '0.9rem' }}>
        Nenhuma venda neste mês.
      </p>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '0.85rem' }}>
      {linhas.map((linha) => (
        <div key={linha.categoria}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.88rem',
              marginBottom: '0.3rem',
            }}
          >
            <span>{linha.categoria}</span>
            <span style={{ color: 'var(--theme-elevation-600)' }}>
              {reais(linha.receita)} · {linha.participacao.toLocaleString('pt-BR')}% · margem{' '}
              {linha.margem.toLocaleString('pt-BR')}%
            </span>
          </div>

          <div
            style={{
              height: 10,
              borderRadius: 5,
              background: 'var(--theme-elevation-100)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(linha.participacao, 100)}%`,
                height: '100%',
                background: 'var(--theme-elevation-500)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function Legenda({ cor, children }: { cor: string; children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: cor }} />
      {children}
    </span>
  )
}

function rotuloDoMes(mes: string): string {
  const abreviacoes = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez',
  ]
  const [, numero] = mes.split('-').map(Number) as [number, number]
  return abreviacoes[numero - 1] ?? mes
}
