'use client'

import { useEffect, useRef, useState } from 'react'
import type React from 'react'

import type { OcasiaoDaVitrine } from '../../../commerce/catalog/get-vitrine.ts'
import { CabecalhoDeSecao } from '../comum/pecas.tsx'
import { useFiltro } from '../comum/filtro.tsx'
import { movimentoDesligado } from './movimento.ts'

/**
 * Os cartões de ocasião.
 *
 * Cada cartão passa três fotos em desvanecimento. A troca é **em cadeia**:
 * a cada 900ms uma única ocasião avança, nunca as sete juntas — sete
 * fotos trocando ao mesmo tempo viram um letreiro, e a seção deixa de
 * parecer uma loja.
 *
 * Para quando a seção sai da tela, quando a aba perde o foco e quando o
 * sistema pede menos movimento. Animação rodando atrás de uma aba
 * escondida é bateria de celular gasta por nada.
 */

const PASSO_MS = 900

export function Ocasioes({ ocasioes }: { ocasioes: OcasiaoDaVitrine[] }) {
  const { definir } = useFiltro()
  const secao = useRef<HTMLElement>(null)
  const [tique, setTique] = useState(0)
  const [visivel, setVisivel] = useState(false)
  const [manual, setManual] = useState<Record<number, number>>({})

  useEffect(() => {
    const area = secao.current
    if (!area) return

    const observador = new IntersectionObserver(
      ([entrada]) => setVisivel(Boolean(entrada?.isIntersecting)),
      // Começa a girar um pouco antes de entrar na tela, para a primeira
      // troca não acontecer exatamente no momento em que a pessoa olha.
      { rootMargin: '240px' },
    )

    observador.observe(area)
    return () => observador.disconnect()
  }, [])

  useEffect(() => {
    if (!visivel || movimentoDesligado() || ocasioes.length === 0) return

    const relogio = setInterval(() => {
      if (document.hidden) return
      setTique((t) => t + 1)
    }, PASSO_MS)

    return () => clearInterval(relogio)
  }, [visivel, ocasioes.length])

  if (ocasioes.length === 0) return null

  return (
    <section ref={secao} id="ocasioes" className="lumini-ocasioes" aria-label="Ocasiões">
      <div data-entrada>
        <CabecalhoDeSecao
          eyebrow="Ocasiões"
          titulo="Para cada celebração, uma peça"
        />
      </div>

      <div className="lumini-ocasioes-grade">
        {ocasioes.map((ocasiao, i) => {
          // Em cadeia: no tique t, só a ocasião `t % n` avançou de novo.
          const voltas = Math.floor(tique / ocasioes.length) + (tique % ocasioes.length > i ? 1 : 0)
          const atual = manual[i] ?? voltas

          return (
            <Cartao
              key={ocasiao.slug}
              ocasiao={ocasiao}
              indice={atual}
              atraso={i * 60}
              aoAvancar={() =>
                setManual((antes) => ({ ...antes, [i]: (antes[i] ?? voltas) + 1 }))
              }
              aoEscolher={() => definir(ocasiao.nome)}
            />
          )
        })}
      </div>
    </section>
  )
}

function Cartao({
  ocasiao,
  indice,
  atraso,
  aoAvancar,
  aoEscolher,
}: {
  ocasiao: OcasiaoDaVitrine
  indice: number
  atraso: number
  aoAvancar: () => void
  aoEscolher: () => void
}) {
  const fotos = ocasiao.fotos.length > 0 ? ocasiao.fotos : []
  const atual = fotos.length > 0 ? indice % fotos.length : 0
  const temPecas = ocasiao.pecas > 0

  return (
    <a
      href={`/?ocasiao=${encodeURIComponent(ocasiao.slug)}#vitrine`}
      className="lumini-ocasiao lumini-cartao"
      data-entrada
      style={{ '--atraso': `${atraso}ms` } as React.CSSProperties}
      onMouseEnter={aoAvancar}
      onClick={(evento) => {
        if (evento.metaKey || evento.ctrlKey || evento.shiftKey) return
        evento.preventDefault()
        aoEscolher()
      }}
    >
      <div className="lumini-ocasiao-moldura">
        {fotos.map((foto, i) => (
          <img
            // A chave inclui a volta para o zoom reiniciar a cada troca.
            key={`${foto}-${i === atual ? indice : 'parado'}`}
            src={foto}
            alt=""
            aria-hidden="true"
            className="lumini-ocasiao-slide"
            data-visivel={i === atual ? '' : undefined}
            loading="lazy"
          />
        ))}

        <span className="lumini-capsula lumini-capsula-topo">
          Ver peças <span aria-hidden="true">→</span>
        </span>

        {fotos.length > 1 && (
          <span className="lumini-ocasiao-barras" aria-hidden="true">
            {fotos.map((foto, i) => (
              <span key={foto} data-ativo={i === atual ? '' : undefined} />
            ))}
          </span>
        )}
      </div>

      <h3 className="lumini-ocasiao-nome">{ocasiao.nome}</h3>
      <span className="lumini-ocasiao-contagem">
        {temPecas
          ? `${ocasiao.pecas} ${ocasiao.pecas === 1 ? 'peça' : 'peças'}`
          : 'Peças a cadastrar'}
      </span>
    </a>
  )
}
