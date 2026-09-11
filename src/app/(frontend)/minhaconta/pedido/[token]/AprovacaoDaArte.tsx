'use client'

import { useState, useTransition } from 'react'

import { aprovarArte, pedirAjusteNaArte } from '../../actions.ts'

type Props = {
  token: string
  indice: number
  nomeDoItem: string
  imagem: string
  aprovadaEm?: string | null
}

/**
 * A tela de aprovar a arte.
 *
 * Hoje isso acontece no WhatsApp, no meio da conversa, e some. Aqui fica
 * guardado: a cliente vê a arte, aprova com um clique e a data fica
 * registrada. Se ela não gostou, o caminho de pedir ajuste está do lado —
 * é mais barato refazer uma prova do que refazer 100 velas.
 */
export function AprovacaoDaArte({ token, indice, nomeDoItem, imagem, aprovadaEm }: Props) {
  const [aprovada, setAprovada] = useState<string | null>(aprovadaEm ?? null)
  const [abrirAjuste, setAbrirAjuste] = useState(false)
  const [ajuste, setAjuste] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [processando, processar] = useTransition()

  function aprovar() {
    setErro(null)
    processar(async () => {
      const resposta = await aprovarArte(token, indice)
      if (resposta.ok) setAprovada(new Date().toISOString())
      else setErro(resposta.mensagem ?? 'Não conseguimos registrar agora.')
    })
  }

  function enviarAjuste() {
    setErro(null)
    processar(async () => {
      const resposta = await pedirAjusteNaArte(token, indice, ajuste)
      if (resposta.ok) {
        setEnviado(true)
        setAbrirAjuste(false)
      } else setErro(resposta.mensagem ?? 'Não conseguimos enviar agora.')
    })
  }

  return (
    <section
      style={{
        marginTop: '2.5rem',
        background: '#fff',
        border: '1px solid var(--lumini-line)',
        borderRadius: 12,
        padding: '1.5rem',
      }}
    >
      <h2 style={{ fontSize: '1.15rem', margin: '0 0 0.35rem' }}>
        {aprovada ? 'A arte que você aprovou' : 'Confira a arte do seu rótulo'}
      </h2>

      <p style={{ margin: '0 0 1.1rem', color: 'var(--lumini-ink-soft)', fontSize: '0.95rem' }}>
        {aprovada
          ? `${nomeDoItem} · aprovada por você. É exatamente assim que as peças são feitas.`
          : `${nomeDoItem}. Leia com calma: o rótulo é impresso exatamente como está aqui, letra por letra. Nada entra em produção antes de você aprovar.`}
      </p>

      <img
        src={imagem}
        alt={`Prova da arte do rótulo de ${nomeDoItem}`}
        style={{
          width: '100%',
          maxWidth: '26rem',
          borderRadius: 10,
          border: '1px solid var(--lumini-line)',
        }}
      />

      {aprovada ? (
        <p style={{ margin: '1rem 0 0', color: 'var(--lumini-gold)' }}>
          Aprovada em{' '}
          {new Date(aprovada).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
          .
        </p>
      ) : enviado ? (
        <p style={{ margin: '1rem 0 0', color: 'var(--lumini-ink-soft)' }}>
          Recebemos o seu pedido de ajuste. Vamos refazer a prova e ela aparece aqui para você
          conferir de novo.
        </p>
      ) : (
        <div style={{ marginTop: '1.2rem' }}>
          {!abrirAjuste && (
            <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={aprovar}
                disabled={processando}
                style={{
                  padding: '0.85rem 1.4rem',
                  border: 'none',
                  borderRadius: 8,
                  background: 'var(--lumini-ink)',
                  color: '#fff',
                  fontSize: '1rem',
                  cursor: 'pointer',
                }}
              >
                {processando ? 'Registrando...' : 'Está perfeito, pode produzir'}
              </button>

              <button
                type="button"
                onClick={() => setAbrirAjuste(true)}
                style={{
                  padding: '0.85rem 1.4rem',
                  borderRadius: 8,
                  border: '1px solid var(--lumini-line)',
                  background: 'transparent',
                  fontSize: '1rem',
                  cursor: 'pointer',
                }}
              >
                Quero mudar alguma coisa
              </button>
            </div>
          )}

          {abrirAjuste && (
            <div style={{ display: 'grid', gap: '0.7rem', maxWidth: '32rem' }}>
              <label htmlFor={`ajuste-${indice}`} style={{ fontSize: '0.95rem' }}>
                O que você gostaria de mudar?
              </label>
              <textarea
                id={`ajuste-${indice}`}
                rows={4}
                value={ajuste}
                onChange={(e) => setAjuste(e.target.value)}
                placeholder="Ex.: o nome é Anna, com dois enes."
                style={{
                  width: '100%',
                  padding: '0.7rem 0.8rem',
                  border: '1px solid var(--lumini-line)',
                  borderRadius: 8,
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', gap: '0.7rem' }}>
                <button
                  type="button"
                  onClick={enviarAjuste}
                  disabled={processando}
                  style={{
                    padding: '0.75rem 1.2rem',
                    border: 'none',
                    borderRadius: 8,
                    background: 'var(--lumini-ink)',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {processando ? 'Enviando...' : 'Enviar'}
                </button>
                <button
                  type="button"
                  onClick={() => setAbrirAjuste(false)}
                  style={{
                    padding: '0.75rem 1.2rem',
                    borderRadius: 8,
                    border: '1px solid var(--lumini-line)',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  Voltar
                </button>
              </div>
            </div>
          )}

          <p
            style={{
              margin: '1rem 0 0',
              fontSize: '0.88rem',
              color: 'var(--lumini-ink-soft)',
            }}
          >
            Enquanto você não aprova, nada é produzido e o cancelamento é gratuito.
          </p>
        </div>
      )}

      {erro && (
        <p role="alert" style={{ marginTop: '0.9rem', color: '#8a2a2a', fontSize: '0.92rem' }}>
          {erro}
        </p>
      )}
    </section>
  )
}
