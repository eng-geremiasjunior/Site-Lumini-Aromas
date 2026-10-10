'use client'

import { useRef } from 'react'

import { Botao, Eyebrow, Filete, LinkSeta } from '../comum/pecas.tsx'
import { useInclinacao, useParalaxeDaFaixa } from './movimento.ts'

/**
 * A faixa "Cada peça nasce para uma data".
 *
 * O argumento da marca inteiro em uma tela: materiais concretos, prazo
 * dito como tempo reservado, e a arte aprovada antes de produzir. A foto
 * à direita inclina com o cursor — é o único movimento da loja que
 * responde à mão, e existe porque esta é a seção em que a pessoa decide
 * se vai conversar.
 *
 * No celular a coluna da foto sai: sobra a coluna de texto, e o prazo
 * continua legível, que é o que importa.
 */

const LINHAS = [
  { o_que: 'Arte da tag aprovada antes', quando: 'Prévia por WhatsApp' },
  { o_que: 'Produção artesanal', quando: '4 a 6 semanas' },
  { o_que: 'Envio', quando: 'Todo o Brasil' },
]

export function FaixaImersiva({ whatsapp }: { whatsapp: string | null }) {
  const secao = useRef<HTMLElement>(null)
  const foto = useRef<HTMLImageElement>(null)
  const cartao = useRef<HTMLDivElement>(null)

  useParalaxeDaFaixa(secao, foto, -7)
  useInclinacao(secao, cartao, { grau: 6, deslocamento: 10 })

  const linkDoWhatsapp = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent('Olá! Queria conversar sobre lembrancinhas para o meu evento.')}`
    : null

  return (
    <section ref={secao} className="lumini-faixa" aria-label="Como as peças são feitas">
      <img
        ref={foto}
        src="/home/fotos/tronco-tag.jpg"
        alt=""
        aria-hidden="true"
        className="lumini-faixa-foto"
      />
      <div className="lumini-faixa-veu" aria-hidden="true" />

      <div className="lumini-faixa-grade">
        <div className="lumini-faixa-texto" data-entrada>
          <div>
            <Filete largura={40} />
            <Eyebrow tom="light" style={{ marginTop: 14 }}>
              Montada à mão · Encomenda
            </Eyebrow>
          </div>

          <h2 className="lumini-faixa-titulo">
            Cada peça nasce para uma data. <em>A sua.</em>
          </h2>

          <p className="lumini-faixa-paragrafo">
            Cera vegetal, tronco de cedro, flores secas e a tag em kraft com os nomes e a data. Não
            temos estoque: cada lote é produzido do zero para o seu evento.
          </p>

          <ul className="lumini-faixa-lista">
            {LINHAS.map((linha) => (
              <li key={linha.o_que}>
                <strong>{linha.o_que}</strong>
                <span>{linha.quando}</span>
              </li>
            ))}
          </ul>

          <div className="lumini-faixa-acoes">
            {linkDoWhatsapp && (
              <Botao href={linkDoWhatsapp} variante="light" tamanho="lg" alvoNovo>
                Conversar no WhatsApp
              </Botao>
            )}
            <LinkSeta href="#ocasioes" sobreEscuro>
              Ver por ocasião
            </LinkSeta>
          </div>
        </div>

        <div className="lumini-faixa-coluna-foto">
          <div ref={cartao} className="lumini-faixa-cartao">
            <img src="/home/fotos/caixa-bege.jpg" alt="Vela sobre tronco em caixa com fita" />
            <div className="lumini-legenda">
              <span className="lumini-legenda-texto">Vela sobre tronco · caixa com fita</span>
              <span className="lumini-legenda-contagem">60 peças</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
