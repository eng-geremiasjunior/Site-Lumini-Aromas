import type React from 'react'

/**
 * As peças do design system da Lumini, em React.
 *
 * O handoff entrega os componentes como um bundle de protótipo
 * (`_ds_bundle.js`), que o próprio README manda **não** embarcar no site.
 * Então eles são reescritos aqui com os mesmos valores — Button, Eyebrow,
 * Tag, Wordmark, Rule — e passam a viver no repositório como código de
 * produção.
 *
 * Nada aqui tem estado. O que precisa de interação (hover, tilt, menu)
 * fica em componentes de cliente, nas pastas da seção que os usa.
 */

export const LARGURA_MAXIMA = '1160px'

/** O container de 1160px com a goteira de 24px. */
export function Container({
  children,
  style,
  id,
  ref,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
  id?: string
  ref?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      id={id}
      ref={ref}
      style={{
        maxWidth: LARGURA_MAXIMA,
        margin: '0 auto',
        padding: '0 24px',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

type TomDoEyebrow = 'muted' | 'wood' | 'brand' | 'light'

const COR_DO_EYEBROW: Record<TomDoEyebrow, string> = {
  muted: 'var(--text-muted)',
  wood: 'var(--text-wood)',
  brand: 'var(--text-brand)',
  light: 'var(--sage-200)',
}

/**
 * O marcador de seção.
 *
 * Caixa alta com entrelinha larga — a voz do próprio documento de paleta
 * da marca (`C O R E S  E  F U N Ç Õ E S`). É o único lugar em que a loja
 * usa caixa alta.
 */
export function Eyebrow({
  children,
  tom = 'muted',
  filete = false,
  espacamento,
  style,
}: {
  children: React.ReactNode
  tom?: TomDoEyebrow
  filete?: boolean
  /** Variações de `.14em` a `.18em` aparecem em abas e notas. */
  espacamento?: string
  style?: React.CSSProperties
}) {
  return (
    <div style={style}>
      <div
        style={{
          fontFamily: 'var(--font-text)',
          fontWeight: 400,
          fontSize: 'var(--size-eyebrow)',
          textTransform: 'uppercase',
          letterSpacing: espacamento ?? 'var(--ls-eyebrow)',
          lineHeight: 1.6,
          color: COR_DO_EYEBROW[tom],
        }}
      >
        {children}
      </div>
      {filete && <Filete style={{ marginTop: 14 }} />}
    </div>
  )
}

/** O filete kraft: a amarração da marca, sempre 1px e nunca textura. */
export function Filete({
  largura = 56,
  cor = 'var(--rule-kraft)',
  style,
}: {
  largura?: number
  cor?: string
  style?: React.CSSProperties
}) {
  return <div aria-hidden="true" style={{ height: 1, width: largura, background: cor, ...style }} />
}

export type TamanhoDoBotao = 'sm' | 'md' | 'lg'

const MEDIDA: Record<TamanhoDoBotao, { padding: string; fontSize: string }> = {
  sm: { padding: '9px 16px', fontSize: '0.75rem' },
  md: { padding: '13px 22px', fontSize: '0.75rem' },
  lg: { padding: '17px 30px', fontSize: '0.875rem' },
}

/**
 * O botão.
 *
 * `solid` em fundo claro, `light` em fundo escuro (faixas imersivas), e o
 * hover só escurece — a regra da marca é que nada clareia nem brilha.
 * O press não muda de escala nem desloca: só aprofunda a cor.
 */
export function Botao({
  children,
  href,
  variante = 'solid',
  tamanho = 'md',
  alvoNovo = false,
  largura,
  type,
  onClick,
  style,
}: {
  children: React.ReactNode
  href?: string
  variante?: 'solid' | 'light' | 'quiet'
  tamanho?: TamanhoDoBotao
  alvoNovo?: boolean
  largura?: string
  type?: 'button' | 'submit'
  onClick?: () => void
  style?: React.CSSProperties
}) {
  const comum: React.CSSProperties = {
    fontFamily: 'var(--font-text)',
    fontWeight: 400,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    borderRadius: 'var(--radius-md)',
    border: '1px solid transparent',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
    textAlign: 'center',
    width: largura,
    transition:
      'background-color var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)',
    ...MEDIDA[tamanho],
    ...PELE[variante],
    ...style,
  }

  if (href) {
    return (
      <a
        href={href}
        className={`lumini-botao lumini-botao-${variante}`}
        style={comum}
        {...(alvoNovo ? { target: '_blank', rel: 'noopener' } : {})}
      >
        {children}
      </a>
    )
  }

  return (
    <button
      type={type ?? 'button'}
      onClick={onClick}
      className={`lumini-botao lumini-botao-${variante}`}
      style={comum}
    >
      {children}
    </button>
  )
}

const PELE: Record<'solid' | 'light' | 'quiet', React.CSSProperties> = {
  solid: { background: 'var(--action-bg)', color: 'var(--action-fg)' },
  light: { background: 'var(--surface-card)', color: 'var(--olive-900)' },
  quiet: { background: 'transparent', color: 'var(--action-bg)', borderColor: 'var(--olive-600)' },
}

/**
 * O link de texto com a seta.
 *
 * A seta é o caractere `→`, não um ícone: o design system não tem ícones
 * de propósito, e em contexto editorial o caractere é preferido.
 */
export function LinkSeta({
  children,
  href,
  sobreEscuro = false,
  alvoNovo = false,
  onClick,
  style,
}: {
  children: React.ReactNode
  href?: string
  sobreEscuro?: boolean
  alvoNovo?: boolean
  onClick?: () => void
  style?: React.CSSProperties
}) {
  const comum: React.CSSProperties = {
    fontFamily: 'var(--font-text)',
    fontWeight: 400,
    fontSize: '0.875rem',
    color: sobreEscuro ? 'var(--text-on-dark)' : 'var(--text-body)',
    textDecoration: 'none',
    borderBottom: `1px solid ${sobreEscuro ? 'var(--banda-sublinhado)' : 'var(--border-hairline)'}`,
    paddingBottom: 2,
    background: 'none',
    cursor: 'pointer',
    display: 'inline-block',
    transition: 'border-color var(--dur-fast) var(--ease-standard)',
    ...style,
  }

  const classe = sobreEscuro ? 'lumini-link-escuro' : 'lumini-link'

  if (href) {
    return (
      <a
        href={href}
        className={classe}
        style={comum}
        {...(alvoNovo ? { target: '_blank', rel: 'noopener' } : {})}
      >
        {children} <span aria-hidden="true">→</span>
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={classe} style={{ ...comum, border: 0, borderBottom: comum.borderBottom }}>
      {children} <span aria-hidden="true">→</span>
    </button>
  )
}

/** A pílula de ocasião. Caixa alta, borda kraft, nunca preenchida. */
export function Etiqueta({
  children,
  tom = 'kraft',
}: {
  children: React.ReactNode
  tom?: 'kraft' | 'sage' | 'solid'
}) {
  const pele = {
    kraft: { color: 'var(--text-wood)', borderColor: 'var(--kraft-300)', background: 'transparent' },
    sage: {
      color: 'var(--text-brand)',
      borderColor: 'var(--border-hairline)',
      background: 'transparent',
    },
    solid: {
      color: 'var(--action-fg)',
      borderColor: 'var(--action-bg)',
      background: 'var(--action-bg)',
    },
  }[tom]

  return (
    <span
      style={{
        fontFamily: 'var(--font-text)',
        fontSize: 'var(--size-eyebrow)',
        fontWeight: 400,
        textTransform: 'uppercase',
        letterSpacing: 'var(--ls-eyebrow)',
        padding: '6px 14px 5px',
        borderRadius: 'var(--radius-pill)',
        border: '1px solid',
        display: 'inline-block',
        lineHeight: 1.4,
        ...pele,
      }}
    >
      {children}
    </span>
  )
}

/** O nome da marca em tipo display, para onde o selo é pequeno demais. */
export function Wordmark({
  tamanho = 'md',
  tom = 'ink',
  style,
}: {
  tamanho?: 'sm' | 'md' | 'lg'
  tom?: 'ink' | 'light' | 'brand'
  style?: React.CSSProperties
}) {
  const corpo = { sm: '0.8125rem', md: '1rem', lg: '1.25rem' }[tamanho]
  const cor = {
    ink: 'var(--text-body)',
    light: 'var(--text-on-dark)',
    brand: 'var(--text-brand)',
  }[tom]

  return (
    <span
      style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 400,
        fontSize: corpo,
        lineHeight: 1,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: cor,
        display: 'inline-block',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      Lumini Aromas
    </span>
  )
}

/**
 * O selo redondo.
 *
 * O arquivo é um JPEG em quadrado branco, então é sempre recortado em
 * círculo — se aparecer um canto branco, é bug.
 */
export function Selo({ tamanho = 40, style }: { tamanho?: number; style?: React.CSSProperties }) {
  return (
    <img
      src="/home/logo-lumini-aromas.jpg"
      alt=""
      width={tamanho}
      height={tamanho}
      className="lumini-selo"
      // A medida vai em propriedade personalizada, e não em `width`
      // embutido: estilo embutido vence media query, e o cabeçalho precisa
      // usar um selo menor no celular.
      style={{ ['--selo' as string]: `${tamanho}px`, ...style }}
    />
  )
}

/**
 * O cabeçalho de uma seção clara: eyebrow, título e lead.
 *
 * A assimetria é regra da marca — o lead tem medida de prosa e não
 * acompanha a largura do título.
 */
export function CabecalhoDeSecao({
  eyebrow,
  tomDoEyebrow = 'wood',
  titulo,
  lead,
  acao,
}: {
  eyebrow: string
  tomDoEyebrow?: TomDoEyebrow
  titulo: React.ReactNode
  lead?: string
  acao?: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: '24px 48px',
      }}
    >
      <div style={{ display: 'grid', gap: 18, maxWidth: '34em' }}>
        <Eyebrow tom={tomDoEyebrow} filete>
          {eyebrow}
        </Eyebrow>
        <h2 style={{ fontSize: 'clamp(2.125rem, 4vw, 3rem)', margin: 0 }}>{titulo}</h2>
        {lead && (
          <p
            style={{
              margin: 0,
              fontSize: '1.0625rem',
              color: 'var(--text-muted)',
              maxWidth: '34em',
            }}
          >
            {lead}
          </p>
        )}
      </div>
      {acao}
    </div>
  )
}

/** O valor em reais a partir de centavos, sem o espaço estreito do Intl. */
export function reaisInteiros(centavos: number): string {
  return `R$ ${Math.round(centavos / 100).toLocaleString('pt-BR')}`
}

export function reais(centavos: number): string {
  const valor = (centavos / 100).toFixed(2).replace('.', ',')
  const [inteiro, decimal] = valor.split(',')
  const comPonto = (inteiro ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `R$ ${comPonto},${decimal}`
}
