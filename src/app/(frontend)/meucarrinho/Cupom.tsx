'use client'

import { useState, useTransition } from 'react'

import { aplicarCupom, removerCartao, removerCupom } from './actions.ts'

type Props = {
  codigoAtual: string | null
  desconto: number
  /** Cartão-presente aplicado, com o saldo que ainda tem. */
  cartao: { codigo: string; saldo: number } | null
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
export function Cupom({ codigoAtual, desconto, cartao }: Props) {
  const [aberto, setAberto] = useState(Boolean(codigoAtual || cartao))
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [processando, processar] = useTransition()

  if (codigoAtual || cartao) {
    return (
      <div style={{ display: 'grid', gap: '0.4rem', marginTop: '0.75rem' }}>
        {codigoAtual && (
          <Aplicado
            rotulo="Cupom"
            codigo={codigoAtual}
            valor={`− ${brl(desconto)}`}
            aoTirar={() => processar(async () => void (await removerCupom()))}
          />
        )}

        {cartao && (
          <Aplicado
            rotulo="Cartão-presente"
            codigo={cartao.codigo}
            // O abatimento não aparece aqui de propósito: ele depende do
            // total, e o total só existe depois do frete. Mostrar o saldo é
            // honesto; mostrar um desconto que ainda vai mudar, não.
            valor={`${brl(cartao.saldo)} de saldo`}
            aoTirar={() => processar(async () => void (await removerCartao()))}
          />
        )}
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
        Tenho um cupom ou cartão-presente
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
          aria-label="Código do cupom ou do cartão-presente"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && enviar()}
          placeholder="Cupom ou cartão-presente"
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

/** Uma linha de código aplicado, com o caminho de tirar do lado. */
function Aplicado({
  rotulo,
  codigo,
  valor,
  aoTirar,
}: {
  rotulo: string
  codigo: string
  valor: string
  aoTirar: () => void
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ color: 'var(--lumini-ink-soft)' }}>
        {rotulo} <strong style={{ color: 'var(--lumini-gold)' }}>{codigo}</strong>{' '}
        <button
          type="button"
          onClick={aoTirar}
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
      <strong style={{ color: 'var(--lumini-gold)' }}>{valor}</strong>
    </div>
  )
}
