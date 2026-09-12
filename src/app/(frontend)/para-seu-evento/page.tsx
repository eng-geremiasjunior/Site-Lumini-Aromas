import type { Metadata } from 'next'

import { listarOcasioes } from '../../../commerce/catalog/get-ocasiao.ts'

export const metadata: Metadata = {
  title: 'Para seu evento',
  description:
    'Lembrancinhas artesanais para casamentos, bodas, 15 anos, batizados, maternidade e eventos corporativos.',
  alternates: { canonical: '/para-seu-evento/' },
}

export const dynamic = 'force-dynamic'

export default async function ParaSeuEventoPage() {
  const ocasioes = await listarOcasioes()

  return (
    <main style={{ maxWidth: '68rem', margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>
      <nav style={{ fontSize: '0.85rem', color: 'var(--lumini-ink-soft)', marginBottom: '2rem' }}>
        <a href="/">Início</a> <span aria-hidden="true">›</span> Para seu evento
      </nav>

      <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', marginBottom: '0.4rem' }}>
        Para seu evento
      </h1>
      <p style={{ color: 'var(--lumini-ink-soft)', fontSize: '1.05rem', maxWidth: '34rem' }}>
        Cada celebração pede uma lembrança diferente. Escolha o seu momento e veja o que já saiu
        daqui para eventos como o seu.
      </p>

      {ocasioes.length === 0 ? (
        <p style={{ marginTop: '2rem', color: 'var(--lumini-ink-soft)' }}>
          Nenhuma ocasião cadastrada ainda.
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(16rem, 1fr))',
            gap: '1.5rem',
            marginTop: '2.5rem',
          }}
        >
          {ocasioes.map((ocasiao) => (
            <a
              key={ocasiao.slug}
              href={`/para-seu-evento/${ocasiao.slug}/`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              {ocasiao.imagem ? (
                <img
                  src={ocasiao.imagem.url}
                  alt={ocasiao.imagem.alt || ocasiao.nome}
                  style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 10 }}
                />
              ) : (
                <div
                  style={{
                    aspectRatio: '4 / 3',
                    borderRadius: 10,
                    background: '#fff',
                    border: '1px dashed var(--lumini-line)',
                  }}
                />
              )}

              <h2 style={{ fontSize: '1.15rem', margin: '0.7rem 0 0.15rem' }}>{ocasiao.nome}</h2>

              {ocasiao.headline && (
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--lumini-ink-soft)' }}>
                  {ocasiao.headline}
                </p>
              )}
            </a>
          ))}
        </div>
      )}
    </main>
  )
}
