'use client'

import { useRef } from 'react'

import { Botao, Filete } from '../comum/pecas.tsx'
import { useRolagem } from './movimento.ts'

/**
 * A abertura em vídeo.
 *
 * Duas camadas do mesmo arquivo: uma desfocada ao fundo, para a tela
 * nunca ter borda vazia em qualquer proporção, e a de frente nítida sobre
 * um overlay sólido. É o que permite usar um vídeo vertical em uma tela
 * larga sem distorcer nem cortar o essencial.
 *
 * As duas andam em velocidades diferentes ao rolar (0,08 e 0,18) — é
 * disso que vem a profundidade. O texto sai antes delas, em 480px de
 * rolagem, para não brigar com o título da seção seguinte.
 *
 * O H1 entra palavra por palavra. Não é enfeite: ler "O que cada
 * convidado leva para casa" uma palavra por vez é o tempo que a frase
 * precisa para funcionar como pergunta.
 */

const PALAVRAS = ['O', 'que', 'cada', 'convidado', 'leva', 'para', 'casa']
const ATRASOS = [380, 470, 560, 650, 740, 830, 920]

export function Abertura({ whatsapp }: { whatsapp: string | null }) {
  const fundo = useRef<HTMLVideoElement>(null)
  const frente = useRef<HTMLVideoElement>(null)
  const texto = useRef<HTMLDivElement>(null)

  useRolagem((y) => {
    if (fundo.current) fundo.current.style.transform = `translateY(${(y * 0.08).toFixed(1)}px)`
    if (frente.current) frente.current.style.transform = `translateY(${(y * 0.18).toFixed(1)}px)`
    if (texto.current) {
      texto.current.style.opacity = Math.max(0, 1 - y / 480).toFixed(3)
      texto.current.style.transform = `translateY(${(y * 0.14).toFixed(1)}px)`
    }
  })

  const linkDoWhatsapp = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent('Olá! Vim pelo site e queria saber sobre lembrancinhas para o meu evento.')}`
    : null

  return (
    <section className="lumini-abertura" aria-label="Lumini Aromas">
      <video
        ref={fundo}
        src="/home/video/producao.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        className="lumini-abertura-fundo"
      />

      {/*
       * O degradê entre as camadas é a única exceção ao "sem degradês" do
       * design system, e existe porque aqui o texto fica por cima de
       * vídeo em movimento: uma cápsula sólida cobriria a imagem inteira.
       */}
      <div className="lumini-abertura-brilho" aria-hidden="true" />

      <video
        ref={frente}
        src="/home/video/producao.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        className="lumini-abertura-frente"
      />

      <div className="lumini-abertura-veu" aria-hidden="true" />

      <div ref={texto} className="lumini-abertura-texto">
        <div className="lumini-abertura-bloco">
          <div className="lumini-abertura-eyebrow">
            <span>
              <span className="lumini-so-largo">
                Lembrancinhas montadas à mão · Casamentos, 15 anos e eventos
              </span>
              <span className="lumini-so-estreito">Lembrancinhas montadas à mão</span>
            </span>
            <Filete style={{ marginTop: 14 }} />
          </div>

          <h1 className="lumini-abertura-titulo">
            {PALAVRAS.map((palavra, i) => (
              <span
                key={`${palavra}-${i}`}
                style={{ animationDelay: `${ATRASOS[i] ?? 920}ms` }}
              >
                {palavra}
              </span>
            ))}
          </h1>

          <p className="lumini-abertura-paragrafo">
            <span className="lumini-so-largo">
              Velas aromáticas sobre tronco, em vidro e em cerâmica, com os nomes e a data do seu
              evento na tag. Cada pedido é produzido do zero para uma data.
            </span>
            <span className="lumini-so-estreito">
              Velas aromáticas com os nomes e a data do seu evento na tag. Cada pedido é produzido
              do zero para uma data.
            </span>
          </p>

          <div className="lumini-abertura-acoes">
            <Botao href="#vitrine" variante="light" tamanho="lg">
              Ver as peças
            </Botao>
            {linkDoWhatsapp && (
              <a href={linkDoWhatsapp} target="_blank" rel="noopener" className="lumini-abertura-link">
                Conversar no WhatsApp <span aria-hidden="true">→</span>
              </a>
            )}
          </div>
        </div>
      </div>

      <a href="#vitrine" className="lumini-rolar" aria-label="Ver as peças">
        <span aria-hidden="true">Rolar</span>
        <span className="lumini-rolar-trilho" aria-hidden="true">
          <span className="lumini-rolar-gota" />
        </span>
      </a>
    </section>
  )
}
