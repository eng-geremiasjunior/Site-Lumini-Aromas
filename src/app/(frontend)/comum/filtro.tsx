'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type React from 'react'

/**
 * O filtro da vitrine, em um lugar só.
 *
 * Três partes da loja mexem no mesmo filtro: o menu "Peças" do cabeçalho,
 * as pílulas da vitrine e os cartões de Ocasiões. Se cada uma guardasse o
 * próprio estado, clicar em "Casamento" nos cartões não mudaria a pílula
 * marcada, e a pessoa veria a vitrine filtrada com "Todas" aceso.
 *
 * Fica no layout, e não na página inicial, porque o cabeçalho é global:
 * na árvore do React o layout envolve a página, então um provedor dentro
 * da página seria invisível para o cabeçalho.
 */

export const TODAS = 'Todas'

type Valor = {
  filtro: string
  definir: (ocasiao: string) => void
  /** Falso fora da página inicial, onde não existe vitrine para filtrar. */
  temVitrine: boolean
}

const Contexto = createContext<Valor>({
  filtro: TODAS,
  definir: () => {},
  temVitrine: false,
})

export function useFiltro(): Valor {
  return useContext(Contexto)
}

export function ProvedorDeFiltro({ children }: { children: React.ReactNode }) {
  const [filtro, setFiltro] = useState(TODAS)
  const [temVitrine, setTemVitrine] = useState(false)

  useEffect(() => {
    // A vitrine só existe na página inicial. Em vez de comparar a rota
    // (que muda de nome quando a loja ganhar uma página de categoria),
    // pergunta-se ao documento se a seção está lá.
    function conferir() {
      setTemVitrine(Boolean(document.getElementById('vitrine')))
    }

    conferir()

    // Chegou por `/?ocasiao=casamento#vitrine` — o link do menu usado de
    // outra página. Lê-se de `location` em vez de `useSearchParams` para
    // não arrastar a loja inteira para dentro de um Suspense.
    const pedida = new URLSearchParams(window.location.search).get('ocasiao')
    if (pedida) setFiltro(pedida)

    const observador = new MutationObserver(conferir)
    observador.observe(document.body, { childList: true, subtree: true })
    return () => observador.disconnect()
  }, [])

  const definir = useCallback((ocasiao: string) => {
    setFiltro(ocasiao)

    const vitrine = document.getElementById('vitrine')
    if (!vitrine) return

    // O cabeçalho é fixo e cobre o topo da seção: sem o recuo, a pessoa
    // clica em "Casamento" e cai no título cortado pela barra.
    const alvo = vitrine.getBoundingClientRect().top + window.scrollY - 88
    const parado = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: alvo, behavior: parado ? 'auto' : 'smooth' })
  }, [])

  const valor = useMemo(() => ({ filtro, definir, temVitrine }), [filtro, definir, temVitrine])

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}
