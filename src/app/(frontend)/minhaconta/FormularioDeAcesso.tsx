'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { acessarPedido } from './actions.ts'

export function FormularioDeAcesso({ whatsappNumber }: { whatsappNumber: string }) {
  const router = useRouter()
  const [numero, setNumero] = useState('')
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [buscando, buscar] = useTransition()

  function enviar() {
    setErro(null)
    buscar(async () => {
      const resposta = await acessarPedido(numero, email)
      if (resposta.ok) router.push(`/minhaconta/pedido/${resposta.token}/`)
      else setErro(resposta.mensagem)
    })
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--lumini-line)',
        borderRadius: 12,
        padding: '1.75rem',
        maxWidth: '30rem',
      }}
    >
      <div style={{ display: 'grid', gap: '0.9rem' }}>
        <div>
          <label htmlFor="numero" style={estiloRotulo}>
            Número do pedido
          </label>
          <input
            id="numero"
            inputMode="numeric"
            placeholder="5000"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enviar()}
            style={estiloCampo}
          />
        </div>

        <div>
          <label htmlFor="email" style={estiloRotulo}>
            E-mail usado na compra
          </label>
          <input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enviar()}
            style={estiloCampo}
          />
        </div>

        {erro && (
          <p
            role="alert"
            style={{
              margin: 0,
              padding: '0.7rem 0.9rem',
              borderRadius: 8,
              background: '#fdeeee',
              color: '#8a2a2a',
              fontSize: '0.92rem',
            }}
          >
            {erro}
          </p>
        )}

        <button
          type="button"
          onClick={enviar}
          disabled={buscando}
          style={{
            padding: '0.9rem 1.2rem',
            border: 'none',
            borderRadius: 8,
            background: 'var(--lumini-ink)',
            color: '#fff',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          {buscando ? 'Procurando...' : 'Ver meu pedido'}
        </button>

        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--lumini-ink-soft)' }}>
          Os dois estão no e-mail de confirmação que enviamos. Não achou?{' '}
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
              'Olá! Queria acompanhar o meu pedido, mas não encontrei o número.',
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--lumini-gold)' }}
          >
            Chama a gente no WhatsApp
          </a>
          , a gente acha para você.
        </p>
      </div>
    </div>
  )
}

const estiloRotulo: React.CSSProperties = {
  display: 'block',
  fontSize: '0.9rem',
  marginBottom: '0.25rem',
}

const estiloCampo: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.8rem',
  border: '1px solid var(--lumini-line)',
  borderRadius: 8,
  background: '#fff',
  fontFamily: 'inherit',
  fontSize: '1rem',
}
