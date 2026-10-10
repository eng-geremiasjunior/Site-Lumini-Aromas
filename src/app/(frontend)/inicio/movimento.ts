'use client'

import { useEffect, useRef, type RefObject } from 'react'

/**
 * Os movimentos da página inicial.
 *
 * Tudo aqui escreve direto no `style` do elemento, via
 * `requestAnimationFrame`, em vez de passar por `useState`. Paralaxe com
 * estado do React redesenha a árvore a cada pixel de rolagem — em uma
 * página com sete seções, vídeo e quarenta fotos, isso trava o celular.
 *
 * `prefers-reduced-motion` desliga tudo: o movimento sai, o conteúdo fica.
 */

export function movimentoDesligado(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Chama `aoRolar` no máximo uma vez por quadro. */
export function useRolagem(aoRolar: (y: number) => void, ligado = true) {
  const guardado = useRef(aoRolar)
  guardado.current = aoRolar

  useEffect(() => {
    if (!ligado || movimentoDesligado()) return

    let pedido = 0
    let pendente = false

    function agendar() {
      if (pendente) return
      pendente = true
      pedido = requestAnimationFrame(() => {
        pendente = false
        guardado.current(window.scrollY)
      })
    }

    agendar()
    window.addEventListener('scroll', agendar, { passive: true })
    window.addEventListener('resize', agendar)

    return () => {
      cancelAnimationFrame(pedido)
      window.removeEventListener('scroll', agendar)
      window.removeEventListener('resize', agendar)
    }
  }, [ligado])
}

/**
 * Paralaxe de uma foto dentro de uma faixa.
 *
 * `t` é o quanto o centro da seção está afastado do centro da tela,
 * medido em telas: 0 quando a faixa está centrada, negativo acima,
 * positivo abaixo. É o que faz a foto andar mais devagar do que a página.
 */
export function useParalaxeDaFaixa(
  secao: RefObject<HTMLElement | null>,
  foto: RefObject<HTMLElement | null>,
  fator = -7,
) {
  useRolagem(() => {
    const caixa = secao.current?.getBoundingClientRect()
    const alvo = foto.current
    if (!caixa || !alvo) return

    const altura = window.innerHeight
    const t = (caixa.top + caixa.height / 2 - altura / 2) / altura

    /*
     * Escreve em uma propriedade personalizada, e não em `transform`.
     *
     * No portal a mesma foto também se desloca com o cursor, com 900ms de
     * transição. Se os dois escrevessem `transform`, um apagaria o outro —
     * e a transição de 900ms deixaria a paralaxe de rolagem arrastando.
     * Com a variável, o CSS compõe os dois e cada um fica no seu lugar.
     */
    alvo.style.setProperty('--paralaxe-y', `${(t * fator).toFixed(2)}%`)
  })
}

/**
 * Inclinação com o cursor sobre uma seção.
 *
 * `px` e `py` vão de −0,5 a 0,5 e são relativos à seção inteira, não ao
 * elemento inclinado: é o que dá a sensação de a foto acompanhar a mão
 * mesmo quando o cursor está do outro lado do texto.
 *
 * Só no computador. Em telefone não existe cursor, e ligar isto ao toque
 * faria a foto saltar ao rolar.
 */
export function useInclinacao(
  secao: RefObject<HTMLElement | null>,
  alvo: RefObject<HTMLElement | null>,
  { grau = 6, deslocamento = 10 }: { grau?: number; deslocamento?: number } = {},
) {
  useEffect(() => {
    const area = secao.current
    if (!area) return
    if (movimentoDesligado()) return
    if (!window.matchMedia('(hover: hover) and (min-width: 760px)').matches) return

    let pedido = 0

    function mover(evento: MouseEvent) {
      cancelAnimationFrame(pedido)
      pedido = requestAnimationFrame(() => {
        const caixa = area!.getBoundingClientRect()
        const elemento = alvo.current
        if (!elemento) return

        const px = (evento.clientX - caixa.left) / caixa.width - 0.5
        const py = (evento.clientY - caixa.top) / caixa.height - 0.5

        elemento.style.transform =
          `rotateY(${(px * grau).toFixed(2)}deg) rotateX(${(-py * grau).toFixed(2)}deg) ` +
          `translate(${(px * deslocamento).toFixed(1)}px, ${(py * deslocamento).toFixed(1)}px)`
      })
    }

    function sair() {
      cancelAnimationFrame(pedido)
      const elemento = alvo.current
      if (elemento) elemento.style.transform = ''
    }

    area.addEventListener('mousemove', mover)
    area.addEventListener('mouseleave', sair)

    return () => {
      cancelAnimationFrame(pedido)
      area.removeEventListener('mousemove', mover)
      area.removeEventListener('mouseleave', sair)
    }
  }, [secao, alvo, grau, deslocamento])
}
