'use client'

import { useEffect, useState } from 'react'

import {
  consentimentoAtualizado,
  COOKIE_DO_CONSENTIMENTO,
  DIAS_DE_VALIDADE_DO_CONSENTIMENTO,
  gravarEscolha,
  lerEscolha,
  type Consentimento,
} from '../../../commerce/marketing/google-tag.ts'
import { DESTINOS } from './disparar.ts'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

/**
 * O aviso de cookies.
 *
 * Três decisões deliberadas:
 *
 * **"Recusar" no primeiro nível.** Esconder a recusa atrás de "preferências"
 * é a prática que a ANPD tem apontado como consentimento viciado. Aqui as
 * duas saídas têm o mesmo peso visual.
 *
 * **Nada é marcado de antemão.** Cada opção começa desligada, e a escolha
 * guarda a versão do texto que a pessoa leu.
 *
 * **Não é um muro.** Some com um toque, não bloqueia a página, não volta
 * depois de respondido. Numa loja de ticket alto, o aviso atrapalhar a
 * primeira visita custa mais do que qualquer dado que ele coleta.
 */
export function AvisoDeCookies() {
  const [aberto, setAberto] = useState(false)
  const [detalhado, setDetalhado] = useState(false)
  const [analise, setAnalise] = useState(false)
  const [publicidade, setPublicidade] = useState(false)

  useEffect(() => {
    // Sem nenhuma medição configurada, a loja não grava cookie de análise
    // nem de publicidade — e um aviso pedindo consentimento para nada é só
    // um obstáculo a mais na primeira visita.
    if (!DESTINOS.ga4 && !DESTINOS.ads) return

    const bruto = document.cookie.match(/(?:^|; )lumini_consentimento=([^;]*)/)
    const escolha = lerEscolha(bruto ? decodeURIComponent(bruto[1] as string) : null)
    if (!escolha) setAberto(true)
  }, [])

  function decidir(consentimento: Consentimento) {
    const valor = gravarEscolha(consentimento, new Date())
    const validade = DIAS_DE_VALIDADE_DO_CONSENTIMENTO * 24 * 60 * 60

    document.cookie = `${COOKIE_DO_CONSENTIMENTO}=${encodeURIComponent(valor)}; path=/; max-age=${validade}; SameSite=Lax`

    window.gtag?.('consent', 'update', consentimentoAtualizado(consentimento))
    setAberto(false)
  }

  if (!aberto) return null

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      style={{
        position: 'fixed',
        insetInline: '1rem',
        bottom: '1rem',
        zIndex: 60,
        maxWidth: '34rem',
        marginInline: 'auto',
        background: '#fff',
        border: '1px solid var(--lumini-line)',
        borderRadius: 14,
        boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
        padding: '1.1rem 1.25rem',
      }}
    >
      <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.6 }}>
        Usamos cookies para entender como a loja é usada e para mostrar nossos produtos a
        quem já nos visitou. Nada disso é necessário para comprar, e você pode recusar.{' '}
        <a href="/politica-de-privacidade/" style={{ whiteSpace: 'nowrap' }}>
          Política de privacidade
        </a>
      </p>

      {detalhado && (
        <div style={{ marginTop: '0.9rem', display: 'grid', gap: '0.6rem' }}>
          <Opcao
            marcado={analise}
            aoMudar={setAnalise}
            titulo="Medir o uso da loja"
            texto="Quantas pessoas visitam, quais páginas veem e onde desistem."
          />
          <Opcao
            marcado={publicidade}
            aoMudar={setPublicidade}
            titulo="Anúncios personalizados"
            texto="Permite lembrar você do produto que viu, em anúncios no Google e nas redes."
          />
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginTop: '1rem',
        }}
      >
        {detalhado ? (
          <Botao principal onClick={() => decidir({ analise, publicidade })}>
            Salvar escolha
          </Botao>
        ) : (
          <Botao principal onClick={() => decidir({ analise: true, publicidade: true })}>
            Aceitar
          </Botao>
        )}

        <Botao onClick={() => decidir({ analise: false, publicidade: false })}>
          Recusar opcionais
        </Botao>

        {!detalhado && (
          <button
            type="button"
            onClick={() => setDetalhado(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--lumini-ink-soft)',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '0.88rem',
            }}
          >
            Escolher
          </button>
        )}
      </div>
    </div>
  )
}

function Opcao({
  marcado,
  aoMudar,
  titulo,
  texto,
}: {
  marcado: boolean
  aoMudar: (valor: boolean) => void
  titulo: string
  texto: string
}) {
  return (
    <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.6rem' }}>
      <input
        type="checkbox"
        checked={marcado}
        onChange={(evento) => aoMudar(evento.target.checked)}
        style={{ marginTop: '0.25rem' }}
      />
      <span>
        <strong style={{ fontSize: '0.9rem' }}>{titulo}</strong>
        <br />
        <span style={{ fontSize: '0.82rem', color: 'var(--lumini-ink-soft)' }}>{texto}</span>
      </span>
    </label>
  )
}

function Botao({
  children,
  onClick,
  principal,
}: {
  children: React.ReactNode
  onClick: () => void
  principal?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '0.55rem 1.1rem',
        borderRadius: 999,
        border: '1px solid var(--lumini-line)',
        background: principal ? 'var(--lumini-ink)' : '#fff',
        color: principal ? '#fff' : 'var(--lumini-ink)',
        cursor: 'pointer',
        fontSize: '0.9rem',
      }}
    >
      {children}
    </button>
  )
}
