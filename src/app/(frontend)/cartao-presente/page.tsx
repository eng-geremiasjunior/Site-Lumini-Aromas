import type { Metadata } from 'next'

import { valoresDisponiveis } from '../../../commerce/giftcards/gift-card.ts'
import { MESES_DE_VALIDADE } from '../../../commerce/giftcards/gift-card.ts'
import { FormularioDoCartao } from './FormularioDoCartao.tsx'
import { precosDeLoteDoCatalogo } from './valores.ts'

export const metadata: Metadata = {
  title: 'Cartão-presente',
  description:
    'Presenteie com a escolha. Quem recebe escolhe o aroma, a quantidade e a frase das próprias lembrancinhas.',
  alternates: { canonical: '/cartao-presente/' },
}

export const dynamic = 'force-dynamic'

export default async function CartaoPresentePage() {
  const valores = valoresDisponiveis(await precosDeLoteDoCatalogo())

  return (
    <main style={{ maxWidth: '60rem', margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>
      <nav style={{ fontSize: '0.85rem', color: 'var(--lumini-ink-soft)', marginBottom: '2rem' }}>
        <a href="/">Início</a> <span aria-hidden="true">›</span> Cartão-presente
      </nav>

      <h1 style={{ fontSize: 'clamp(1.7rem, 3.5vw, 2.4rem)', marginBottom: '0.4rem' }}>
        Cartão-presente
      </h1>

      <p
        style={{
          color: 'var(--lumini-ink-soft)',
          fontSize: '1.05rem',
          maxWidth: '34rem',
          marginTop: 0,
        }}
      >
        Para quando você quer presentear mas prefere que a escolha seja dela. Quem recebe escolhe o
        aroma, a quantidade e a frase das próprias lembrancinhas.
      </p>

      <p style={{ color: 'var(--lumini-ink-soft)', fontSize: '0.92rem', maxWidth: '34rem' }}>
        Os valores acompanham os lotes da loja, então o cartão sempre dá para uma encomenda inteira.
        Vale por {MESES_DE_VALIDADE} meses, e se sobrar saldo ele fica guardado para uma próxima.
      </p>

      <div style={{ marginTop: '2.5rem' }}>
        <FormularioDoCartao valores={valores} />
      </div>
    </main>
  )
}
