'use client'

import { useState, useTransition } from 'react'

import { aplicarCupom, removerCupom } from './actions.ts'

type Props = {
  codigoAtual: string | null
  desconto: number
}

function brl(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * Campo de cupom.
 *
 * Fica fechado por padrão, atrás de um link discreto. Campo de cupom aberto
 * e piscando na tela ensina a cliente a sair do site para procurar código —
 * e, num produto de luxo, sugere que o preço da etiqueta não é o preço de
 * verdade. Quem tem o código do parceiro sabe que ele existe.
 */
export function Cupom({ codigoAtual, desconto }: Props) {
  const [aberto, setAberto] = useState(Boolean(codigoAtual))
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [processando, processar] = useTransition()

  if (codigoAtual) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginTop: '0.75rem',
        }}
      >
        <span style={{ color: 'var(--lumini-ink-soft)' }}>
          Cupom <strong style={{ color: 'var(--lumini-gold)' }}>{codigoAtual}</strong>{' '}
          <button
            type="button"
            onClick={() => processar(async () => void (await removerCupom()))}
            style={{
              border: 'none',
              background: 'none',
              padding: 0,
              color: 'var(--lumini-ink-soft)',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            tirar
          </button>
        </span>
        <strong style={{ color: 'var(--lumini-gold)' }}>− {brl(desconto)}</strong>
      </div>
    )
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        style={{
          border: 'none',
          background: 'none',
          padding: '0.75rem 0 0',
          color: 'var(--lumini-ink-soft)',
          textDecoration: 'underline',
          cursor: 'pointer',
          fontSize: '0.88rem',
        }}
      >
        Tenho um cupom
      </button>
    )
  }

  function enviar() {
    setErro(null)
    processar(async () => {
      const resposta = await aplicarCupom(codigo)
      if (!resposta.ok) setErro(resposta.mensagem)
      else setCodigo('')
    })
  }

  return (
    <div style={{ marginTop: '0.9rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          aria-label="Código do cupom"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && enviar()}
          placeholder="Código do cupom"
          style={{
            flex: 1,
            padding: '0.65rem 0.75rem',
            border: '1px solid var(--lumini-line)',
            borderRadius: 8,
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            textTransform: 'uppercase',
          }}
        />
        <button
          type="button"
          onClick={enviar}
          disabled={processando}
          style={{
            padding: '0.65rem 1.1rem',
            borderRadius: 8,
            border: '1px solid var(--lumini-line)',
            background: 'var(--lumini-cream)',
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          {processando ? '...' : 'Aplicar'}
        </button>
      </div>

      {erro && (
        <p role="alert" style={{ margin: '0.5rem 0 0', color: '#8a2a2a', fontSize: '0.88rem' }}>
          {erro}
        </p>
      )}
    </div>
  )
}
