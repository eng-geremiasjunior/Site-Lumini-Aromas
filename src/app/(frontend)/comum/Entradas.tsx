'use client'

import { useEffect } from 'react'

/**
 * A revelação ao rolar, uma só para a loja inteira.
 *
 * Todo bloco marcado com `data-entrada` nasce invisível e aparece subindo
 * 14px quando entra na tela. O CSS faz a animação; aqui só se decide
 * quando ela começa.
 *
 * Um observador para a página toda, e não um por componente: eram sete
 * seções na home, cada uma com vários blocos, e um `IntersectionObserver`
 * por bloco seria dezenas de observadores fazendo o mesmo trabalho.
 *
 * O `MutationObserver` existe porque a vitrine troca os cartões quando o
 * filtro muda. Sem ele, os cartões que entram depois do primeiro desenho
 * ficariam invisíveis para sempre — o pior tipo de defeito, porque a
 * página parece simplesmente vazia.
 */
export function Entradas() {
  useEffect(() => {
    const parado = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (parado) {
      // Sem movimento: tudo visível de uma vez, nada de esperar rolagem.
      for (const no of document.querySelectorAll('[data-entrada]')) {
        no.setAttribute('data-visivel', '')
      }
      return
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue
          entrada.target.setAttribute('data-visivel', '')
          // Acontece uma vez só: rolar de volta não reanima nada.
          observador.unobserve(entrada.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0 },
    )

    function observar(raiz: ParentNode) {
      for (const no of raiz.querySelectorAll('[data-entrada]:not([data-visivel])')) {
        observador.observe(no)
      }
    }

    observar(document)

    const mutacoes = new MutationObserver((lista) => {
      for (const mutacao of lista) {
        for (const no of mutacao.addedNodes) {
          if (!(no instanceof Element)) continue
          if (no.matches('[data-entrada]')) observador.observe(no)
          observar(no)
        }
      }
    })

    mutacoes.observe(document.body, { childList: true, subtree: true })

    return () => {
      observador.disconnect()
      mutacoes.disconnect()
    }
  }, [])

  return null
}
