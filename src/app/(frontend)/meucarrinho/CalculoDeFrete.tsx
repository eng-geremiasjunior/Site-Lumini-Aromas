'use client'

import { useState, useTransition } from 'react'

import type { FreteResultado } from '../../../commerce/shipping/quote-cart.ts'
import { FRETE_A_COMBINAR_ID } from '../../../commerce/shipping/quote.ts'
import { calcularFrete } from './actions.ts'

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export function CalculoDeFrete({ subtotal }: { subtotal: number }) {
  const [cep, setCep] = useState('')
  const [resultado, setResultado] = useState<FreteResultado | null>(null)
  const [escolhido, setEscolhido] = useState<number | null>(null)
  const [calculando, iniciar] = useTransition()

  function calcular() {
    setResultado(null)
    setEscolhido(null)
    iniciar(async () => {
      const resposta = await calcularFrete(cep)
      setResultado(resposta)
      if (resposta.ok && resposta.opcoes[0]) setEscolhido(resposta.opcoes[0].serviceId)
    })
  }

  const opcaoEscolhida =
    resultado?.ok && escolhido !== null
      ? resultado.opcoes.find((opcao) => opcao.serviceId === escolhido)
      : null

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid var(--lumini-line)',
        borderRadius: 10,
        padding: '1.25rem',
        marginTop: '1.25rem',
      }}
    >
      <h2 style={{ fontSize: '1.05rem', margin: '0 0 0.3rem', fontFamily: 'var(--lumini-font-body)' }}>
        Frete e prazo
      </h2>
      <p style={{ margin: '0 0 0.85rem', fontSize: '0.9rem', color: 'var(--lumini-ink-soft)' }}>
        O prazo já inclui a produção artesanal.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Seu CEP"
          value={cep}
          maxLength={9}
          onChange={(evento) => setCep(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') calcular()
          }}
          style={{
            flex: 1,
            padding: '0.6rem 0.75rem',
            border: '1px solid var(--lumini-line)',
            borderRadius: 8,
            fontSize: '0.95rem',
          }}
        />
        <button
          type="button"
          onClick={calcular}
          disabled={calculando || cep.replace(/\D/g, '').length < 8}
          style={{
            padding: '0.6rem 1.1rem',
            border: '1px solid var(--lumini-ink)',
            borderRadius: 8,
            background: '#fff',
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          {calculando ? 'Calculando...' : 'Calcular'}
        </button>
      </div>

      {resultado && !resultado.ok && (
        <div style={{ marginTop: '0.9rem' }}>
          <p style={{ margin: 0, fontSize: '0.92rem', color: '#8a2a2a' }}>{resultado.mensagem}</p>
          {resultado.alternativa && (
            <a
              href={resultado.alternativa.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.92rem', color: 'var(--lumini-gold)' }}
            >
              {resultado.alternativa.label}
            </a>
          )}
        </div>
      )}

      {resultado?.ok && resultado.aviso && (
        <p
          style={{
            marginTop: '0.9rem',
            marginBottom: 0,
            fontSize: '0.88rem',
            color: 'var(--lumini-ink-soft)',
          }}
        >
          {resultado.aviso}
        </p>
      )}

      {resultado?.ok && (
        <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
          {resultado.opcoes.map((opcao) => (
            <label
              key={opcao.serviceId}
              style={{
                display: 'flex',
                gap: '0.65rem',
                alignItems: 'flex-start',
                padding: '0.7rem 0.8rem',
                border: `1px solid ${escolhido === opcao.serviceId ? 'var(--lumini-gold)' : 'var(--lumini-line)'}`,
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="frete"
                checked={escolhido === opcao.serviceId}
                onChange={() => setEscolhido(opcao.serviceId)}
                style={{ marginTop: '0.2rem' }}
              />
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 600 }}>
                  {opcao.carrier} {opcao.serviceName}
                </span>
                <span style={{ display: 'block', fontSize: '0.88rem', color: 'var(--lumini-ink-soft)' }}>
                  {opcao.totalMinDays} a {opcao.totalMaxDays} dias úteis, chega até{' '}
                  {formatarData(opcao.deliveryBy)}
                </span>
              </span>
              <span style={{ fontWeight: 600 }}>
                {opcao.serviceId === FRETE_A_COMBINAR_ID
                  ? 'A combinar'
                  : opcao.priceCents === 0
                    ? 'Grátis'
                    : brl(opcao.priceCents)}
              </span>
            </label>
          ))}

          {opcaoEscolhida && (
            <div
              style={{
                marginTop: '0.5rem',
                paddingTop: '0.85rem',
                borderTop: '1px solid var(--lumini-line)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <span style={{ color: 'var(--lumini-ink-soft)' }}>Total com frete</span>
              <strong style={{ fontSize: '1.35rem', fontFamily: 'var(--lumini-font-display)' }}>
                {brl(subtotal + opcaoEscolhida.priceCents)}
              </strong>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
