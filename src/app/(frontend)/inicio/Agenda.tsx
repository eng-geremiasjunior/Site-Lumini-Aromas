'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { Botao, CabecalhoDeSecao } from '../comum/pecas.tsx'
import { movimentoDesligado } from './movimento.ts'

/**
 * A agenda, com a pilha de fotos da bancada.
 *
 * A pilha é o leque de fotos que acompanha o cursor. Mostra o trabalho
 * sem precisar de uma galeria com setas — e o argumento da seção é esse:
 * poucos eventos por mês, montados sem pressa.
 *
 * O movimento é escrito direto no `style` de cada foto, por quadro. Seis
 * fotos × posição do cursor através do estado do React seria um
 * redesenho por pixel de mouse.
 */

const FOTOS = [
  {
    src: '/home/fotos/agenda-1.jpg',
    legenda: 'Tronco de cedro, flores secas e tag em papel algodão, montados à mão',
  },
  { src: '/home/fotos/agenda-2.jpg', legenda: 'Tag kraft carimbada com os nomes e a data do casal' },
  { src: '/home/fotos/agenda-3.jpg', legenda: 'A frase do casal impressa na tag, junto da data' },
  { src: '/home/fotos/agenda-4.jpg', legenda: 'Cada peça segue embalada em caixa de acetato' },
  { src: '/home/fotos/agenda-5.jpg', legenda: 'O lote inteiro montado na bancada, uma peça por vez' },
  { src: '/home/fotos/agenda-6.jpg', legenda: 'Pronta para a mesa de lembranças' },
]

const TROCA_MS = 5500

export function Agenda({ whatsapp }: { whatsapp: string | null }) {
  const pilha = useRef<HTMLDivElement>(null)
  const [frente, setFrente] = useState(0)
  const sobre = useRef(false)
  const toqueX = useRef(0)

  const avancar = useCallback(() => {
    setFrente((atual) => (atual + 1) % FOTOS.length)
  }, [])

  /** Reposiciona as seis fotos para a posição `t` do cursor. */
  const desenhar = useCallback(
    (t: number, ty: number) => {
      const area = pilha.current
      if (!area) return

      area.style.transform = `rotateY(${(t * 5).toFixed(2)}deg) rotateX(${(-ty * 3).toFixed(2)}deg)`

      const fotos = area.querySelectorAll<HTMLElement>('.lumini-pilha-foto')
      fotos.forEach((foto) => {
        const ordem = Number(foto.dataset.ordem ?? 0)
        const giroBase = ordem === 0 ? t * 1.5 : (ordem % 2 === 1 ? -1 : 1) * ordem * 2.2 + t * ordem * 2.6

        foto.style.transform =
          `translate3d(${(ordem * 9 + t * ordem * 16).toFixed(1)}px, ` +
          `${(-ordem * 5 + Math.abs(t) * ordem * 2).toFixed(1)}px, ` +
          `${(-ordem * 36).toFixed(0)}px) ` +
          `rotate(${giroBase.toFixed(2)}deg) scale(${(1 - ordem * 0.035).toFixed(3)})`

        foto.style.zIndex = String(FOTOS.length - ordem)
        // Da quarta foto para trás nada mais se vê: fica fora do caminho.
        foto.style.opacity = ordem > 3 ? '0' : (1 - ordem * 0.1).toFixed(2)
        foto.style.pointerEvents = ordem === 0 ? 'auto' : 'none'
      })
    },
    [],
  )

  // Redesenha a cada troca de foto, mesmo sem o cursor se mover.
  useEffect(() => {
    desenhar(0, 0)
  }, [frente, desenhar])

  useEffect(() => {
    const area = pilha.current
    if (!area) return
    if (movimentoDesligado()) return
    if (!window.matchMedia('(hover: hover) and (min-width: 760px)').matches) return

    let pedido = 0

    function mover(evento: MouseEvent) {
      cancelAnimationFrame(pedido)
      pedido = requestAnimationFrame(() => {
        const caixa = area!.getBoundingClientRect()
        const t = ((evento.clientX - caixa.left) / caixa.width - 0.5) * 2
        const ty = ((evento.clientY - caixa.top) / caixa.height - 0.5) * 2
        desenhar(Math.max(-1, Math.min(1, t)), Math.max(-1, Math.min(1, ty)))
      })
    }

    function entrar() {
      sobre.current = true
    }

    function sair() {
      sobre.current = false
      cancelAnimationFrame(pedido)
      desenhar(0, 0)
    }

    area.addEventListener('mousemove', mover)
    area.addEventListener('mouseenter', entrar)
    area.addEventListener('mouseleave', sair)

    return () => {
      cancelAnimationFrame(pedido)
      area.removeEventListener('mousemove', mover)
      area.removeEventListener('mouseenter', entrar)
      area.removeEventListener('mouseleave', sair)
    }
  }, [desenhar])

  useEffect(() => {
    if (movimentoDesligado()) return

    const relogio = setInterval(() => {
      // Parado enquanto a pessoa está mexendo, e parado em aba escondida.
      if (sobre.current || document.hidden) return
      avancar()
    }, TROCA_MS)

    return () => clearInterval(relogio)
  }, [avancar])

  const linkDoWhatsapp = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent('Olá! Meu evento é em ')}`
    : null

  const legenda = FOTOS[frente]?.legenda ?? ''

  return (
    <section className="lumini-agenda" aria-label="Agenda de produção">
      <div className="lumini-agenda-texto" data-entrada>
        <CabecalhoDeSecao
          eyebrow="Agenda"
          titulo="Abrimos poucos eventos por mês"
          lead="Reservamos a produção por data para que cada pedido seja montado sem pressa. Conte a data do seu evento e vemos o que é possível."
        />
        {linkDoWhatsapp && (
          <div>
            <Botao href={linkDoWhatsapp} tamanho="lg" alvoNovo>
              Conversar no WhatsApp
            </Botao>
          </div>
        )}
      </div>

      <div data-entrada style={{ minWidth: 0 }}>
        <div
          ref={pilha}
          className="lumini-pilha"
          onClick={avancar}
          onTouchStart={(evento) => {
            toqueX.current = evento.touches[0]?.clientX ?? 0
          }}
          onTouchEnd={(evento) => {
            const fim = evento.changedTouches[0]?.clientX ?? 0
            if (Math.abs(fim - toqueX.current) > 40) avancar()
          }}
        >
          {FOTOS.map((foto, i) => {
            // A ordem é a distância circular até a foto da frente.
            const ordem = (i - frente + FOTOS.length) % FOTOS.length
            return (
              <div
                key={foto.src}
                className="lumini-pilha-foto"
                data-ordem={ordem}
                aria-hidden={ordem !== 0}
              >
                <img
                  src={foto.src}
                  alt={ordem === 0 ? foto.legenda : ''}
                  loading={i < 2 ? undefined : 'lazy'}
                />
              </div>
            )
          })}
        </div>

        <p className="lumini-pilha-legenda" key={legenda} data-entrada data-visivel>
          {legenda}
        </p>

        <div className="lumini-pilha-barras" role="group" aria-label="Escolher a foto">
          {FOTOS.map((foto, i) => (
            <button
              key={foto.src}
              type="button"
              data-ativo={i === frente ? '' : undefined}
              aria-label={`Foto ${i + 1} de ${FOTOS.length}`}
              onClick={() => setFrente(i)}
            />
          ))}
        </div>

        <p className="lumini-pilha-dica">Passe o mouse ou toque</p>
      </div>
    </section>
  )
}
