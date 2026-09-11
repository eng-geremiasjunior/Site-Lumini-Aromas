import type { Metadata } from 'next'

import { FormularioDeAcesso } from './FormularioDeAcesso.tsx'

export const metadata: Metadata = {
  title: 'Minha conta',
  description: 'Acompanhe a produção das suas lembrancinhas.',
  robots: { index: false, follow: false },
}

export default function MinhaContaPage() {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '5533999478774'

  return (
    <main style={{ maxWidth: '46rem', margin: '0 auto', padding: '4rem 1.5rem 6rem' }}>
      <p
        style={{
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          fontSize: '0.75rem',
          color: 'var(--lumini-gold)',
          marginBottom: '1rem',
        }}
      >
        Minha conta
      </p>

      <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)' }}>Acompanhe o seu pedido</h1>

      <p style={{ color: 'var(--lumini-ink-soft)', fontSize: '1.05rem', marginBottom: '2.5rem' }}>
        Veja em que etapa estão as suas lembrancinhas, aprove a arte do rótulo e acompanhe a
        entrega. Sem senha: só o número do pedido e o seu e-mail.
      </p>

      <FormularioDeAcesso whatsappNumber={whatsapp} />
    </main>
  )
}
