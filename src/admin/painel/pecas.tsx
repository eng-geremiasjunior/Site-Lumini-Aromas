import type React from 'react'

/**
 * As peças do painel inicial.
 *
 * Separadas em um arquivo só para a tela principal ficar legível: lá se lê
 * o que o painel mostra; aqui, como ele desenha.
 */

export function Secao({
  titulo,
  acao,
  children,
}: {
  titulo: string
  acao?: { rotulo: string; link: string }
  children: React.ReactNode
}) {
  return (
    <section style={{ marginBottom: '1.9rem' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '0.7rem',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '0.72rem',
            fontWeight: 600,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: 'var(--theme-elevation-450)',
          }}
        >
          {titulo}
        </h2>

        {acao && (
          <a
            href={acao.link}
            style={{ fontSize: 12.5, color: 'var(--theme-elevation-600)', textDecoration: 'none' }}
          >
            {acao.rotulo} →
          </a>
        )}
      </header>

      {children}
    </section>
  )
}

export function Numero({
  rotulo,
  valor,
  apoio,
  variacao,
  negativo,
}: {
  rotulo: string
  valor: string
  apoio?: string
  variacao?: string | null
  negativo?: boolean
}) {
  return (
    <div style={{ background: 'var(--theme-elevation-0)', padding: '0.95rem 1.05rem' }}>
      <p
        style={{
          margin: 0,
          fontSize: '0.7rem',
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: 'var(--theme-elevation-450)',
        }}
      >
        {rotulo}
      </p>

      <p
        style={{
          margin: '0.3rem 0 0.15rem',
          fontSize: '1.45rem',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
          color: negativo ? 'var(--lumini-erro)' : 'var(--theme-elevation-900)',
        }}
      >
        {valor}
      </p>

      {(apoio || variacao) && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--theme-elevation-500)' }}>
          {[apoio, variacao].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  )
}

/**
 * Barras do ano, em SVG.
 *
 * Sem biblioteca de gráfico: são doze retângulos. Uma dependência a mais
 * no painel significaria mais peso para carregar e mais uma coisa para
 * quebrar numa atualização — por doze retângulos.
 */
export function Barras({
  pontos,
}: {
  pontos: Array<{ rotulo: string; valor: number; teto: number; texto: string }>
}) {
  const largura = 720
  const altura = 132
  const base = altura - 22
  const passo = largura / Math.max(pontos.length, 1)
  const espessura = Math.min(passo * 0.52, 26)

  return (
    <div
      style={{
        border: '1px solid var(--theme-border-color)',
        borderRadius: 8,
        background: 'var(--theme-elevation-0)',
        padding: '1rem 1.1rem 0.6rem',
      }}
    >
      <svg
        viewBox={`0 0 ${largura} ${altura}`}
        role="img"
        aria-label="Receita dos últimos doze meses"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <line x1="0" y1={base} x2={largura} y2={base} stroke="var(--theme-elevation-150)" />

        {pontos.map((ponto, i) => {
          const centro = passo * i + passo / 2
          const alto = ponto.valor > 0 ? Math.max((ponto.valor / ponto.teto) * (base - 10), 3) : 0
          const ultimo = i === pontos.length - 1

          return (
            <g key={ponto.rotulo}>
              {alto > 0 && (
                <rect
                  x={centro - espessura / 2}
                  y={base - alto}
                  width={espessura}
                  height={alto}
                  rx={2}
                  fill={ultimo ? 'var(--theme-elevation-700)' : 'var(--theme-elevation-300)'}
                >
                  <title>{`${mesCurto(ponto.rotulo)}: ${ponto.texto}`}</title>
                </rect>
              )}

              <text
                x={centro}
                y={altura - 6}
                textAnchor="middle"
                fontSize="10"
                fill={ultimo ? 'var(--theme-elevation-700)' : 'var(--theme-elevation-450)'}
              >
                {mesCurto(ponto.rotulo)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function mesCurto(mes: string): string {
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const numero = Number(mes.split('-')[1])
  return nomes[numero - 1] ?? mes
}
