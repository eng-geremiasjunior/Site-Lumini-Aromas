/**
 * Página inicial provisória.
 *
 * O design de luxo será feito no Claude Design e aplicado aqui.
 * Por enquanto ela serve para confirmar que a vitrine e o painel
 * sobem no mesmo aplicativo.
 */
export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: '46rem',
        margin: '0 auto',
        padding: '6rem 1.5rem',
      }}
    >
      <p
        style={{
          textTransform: 'uppercase',
          letterSpacing: '0.24em',
          fontSize: '0.75rem',
          color: 'var(--lumini-gold)',
          marginBottom: '1.5rem',
        }}
      >
        Lumini Aromas
      </p>

      <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>
        Lembrancinhas personalizadas de luxo
      </h1>

      <p style={{ color: 'var(--lumini-ink-soft)', fontSize: '1.05rem' }}>
        Velas aromáticas artesanais em vidro e madeira, feitas à mão e personalizadas para
        casamentos, bodas, 15 anos, batizados e eventos corporativos.
      </p>

      <hr
        style={{
          border: 0,
          borderTop: '1px solid var(--lumini-line)',
          margin: '2.5rem 0',
        }}
      />

      <p style={{ color: 'var(--lumini-ink-soft)', fontSize: '0.95rem' }}>
        Nova plataforma em construção. O painel de administração está em{' '}
        <a href="/admin" style={{ color: 'var(--lumini-gold)' }}>
          /admin
        </a>
        .
      </p>
    </main>
  )
}
