'use client'

import { useState, useTransition } from 'react'

import { dispensarLembretes } from './actions.ts'

export function Dispensar({ token }: { token: string }) {
  const [pronto, setPronto] = useState(false)
  const [erro, setErro] = useState(false)
  const [processando, processar] = useTransition()

  if (pronto) {
    return (
      <p style={{ marginTop: '2rem', color: 'var(--lumini-gold)', fontSize: '1.05rem' }}>
        Pronto. Não mandamos mais lembretes deste carrinho. Obrigado por avisar.
      </p>
    )
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <button
        type="button"
        disabled={processando}
        onClick={() =>
          processar(async () => {
            const resposta = await dispensarLembretes(token)
            if (resposta.ok) setPronto(true)
            else setErro(true)
          })
        }
        style={{
          padding: '0.9rem 1.4rem',
          border: 'none',
          borderRadius: 8,
          background: 'var(--lumini-ink)',
          color: '#fff',
          fontSize: '1rem',
          cursor: 'pointer',
        }}
      >
        {processando ? 'Só um instante...' : 'Confirmar'}
      </button>

      {erro && (
        <p role="alert" style={{ marginTop: '1rem', color: '#8a2a2a' }}>
          Não encontramos este carrinho — provavelmente ele já saiu da nossa lista. De qualquer
          forma, você não receberá mais lembretes dele.
        </p>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <a href="/meucarrinho/" style={{ color: 'var(--lumini-ink-soft)' }}>
          Mudei de ideia, quero ver o meu carrinho
        </a>
      </p>
    </div>
  )
}
