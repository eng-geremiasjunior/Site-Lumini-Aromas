'use client'

import { useState, useTransition } from 'react'

import type { CartLine } from '../../../commerce/cart/cart-service.ts'
import { alterarQuantidade, removerItem } from './actions.ts'

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type Props = {
  linhas: CartLine[]
  /** Faixas oferecidas por produto, para o seletor de quantidade. */
  faixasPorProduto: Record<string, number[]>
}

export function ItensDoCarrinho({ linhas, faixasPorProduto }: Props) {
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, iniciar] = useTransition()

  function trocar(index: number, qty: number) {
    setErro(null)
    iniciar(async () => {
      const resposta = await alterarQuantidade(index, qty)
      if (!resposta.ok) setErro(resposta.mensagem)
    })
  }

  function remover(index: number) {
    setErro(null)
    iniciar(async () => {
      const resposta = await removerItem(index)
      if (!resposta.ok) setErro(resposta.mensagem)
    })
  }

  return (
    <div style={{ opacity: ocupado ? 0.6 : 1, transition: 'opacity 120ms' }}>
      {erro && (
        <p
          role="alert"
          style={{
            background: '#fdeeee',
            color: '#8a2a2a',
            padding: '0.7rem 0.9rem',
            borderRadius: 8,
            fontSize: '0.92rem',
          }}
        >
          {erro}
        </p>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '1.25rem' }}>
        {linhas.map((linha) => {
          const faixas = faixasPorProduto[linha.productId] ?? [linha.qty]

          return (
            <li
              key={`${linha.productId}-${linha.variantKey}-${linha.index}`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: '1rem',
                alignItems: 'start',
                background: '#fff',
                border: '1px solid var(--lumini-line)',
                borderRadius: 10,
                padding: '1rem',
              }}
            >
              {linha.imageUrl ? (
                <img
                  src={linha.imageUrl}
                  alt={linha.productName}
                  style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 8 }}
                />
              ) : (
                <div
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: 8,
                    background: 'var(--lumini-cream)',
                    border: '1px dashed var(--lumini-line)',
                  }}
                />
              )}

              <div>
                <a
                  href={`/product/${linha.productSlug}/`}
                  style={{ fontWeight: 600, textDecoration: 'none' }}
                >
                  {linha.productName}
                </a>

                {linha.variantLabel && (
                  <p style={{ margin: '0.15rem 0 0', color: 'var(--lumini-ink-soft)' }}>
                    {linha.variantLabel}
                  </p>
                )}

                {/* A personalização é o que ela mais precisa conferir antes
                    de pagar: o rótulo sai impresso exatamente assim, e
                    depois de produzido não se corrige uma letra. */}
                {(Object.entries(linha.personalization).length > 0 || linha.artFile) && (
                  <div
                    style={{
                      margin: '0.6rem 0 0',
                      padding: '0.7rem 0.85rem',
                      background: 'var(--lumini-cream)',
                      borderRadius: 8,
                      display: 'grid',
                      gap: '0.5rem',
                    }}
                  >
                    {Object.entries(linha.personalization).map(([rotulo, valor]) => (
                      <div key={rotulo}>
                        <span
                          style={{
                            display: 'block',
                            fontSize: '0.72rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            color: 'var(--lumini-ink-soft)',
                          }}
                        >
                          {rotulo}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--lumini-font-display)',
                            fontSize: '1.05rem',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {valor}
                        </span>
                      </div>
                    ))}

                    {linha.artFile?.url && (
                      <img
                        src={linha.artFile.url}
                        alt="Logo que você enviou"
                        style={{
                          width: '3.5rem',
                          height: '3.5rem',
                          objectFit: 'contain',
                          background: '#fff',
                          borderRadius: 6,
                          padding: '0.25rem',
                        }}
                      />
                    )}

                    <a
                      href={`/product/${linha.productSlug}/`}
                      style={{ fontSize: '0.82rem', color: 'var(--lumini-ink-soft)' }}
                    >
                      Corrigir a personalização
                    </a>
                  </div>
                )}

                {linha.addons.length > 0 && (
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.88rem', color: 'var(--lumini-ink-soft)' }}>
                    {linha.addons.map((addon) => addon.name).join(', ')}
                  </p>
                )}

                <div style={{ marginTop: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <label htmlFor={`qtd-${linha.index}`} style={{ fontSize: '0.88rem' }}>
                    Quantidade
                  </label>
                  <select
                    id={`qtd-${linha.index}`}
                    value={linha.qty}
                    disabled={ocupado}
                    onChange={(evento) => trocar(linha.index, Number(evento.target.value))}
                    style={{
                      padding: '0.35rem 0.5rem',
                      border: '1px solid var(--lumini-line)',
                      borderRadius: 6,
                    }}
                  >
                    {faixas.map((faixa) => (
                      <option key={faixa} value={faixa}>
                        {faixa} peças
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem' }}>{brl(linha.total)}</p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--lumini-ink-soft)' }}>
                  {brl(linha.unitPrice)} cada
                </p>
                <button
                  type="button"
                  onClick={() => remover(linha.index)}
                  disabled={ocupado}
                  style={{
                    marginTop: '0.7rem',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: 'var(--lumini-ink-soft)',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    font: 'inherit',
                    fontSize: '0.85rem',
                  }}
                >
                  Remover
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
