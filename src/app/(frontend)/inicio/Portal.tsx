'use client'

import { useEffect, useRef, useState } from 'react'

import { Botao, Eyebrow, LinkSeta } from '../comum/pecas.tsx'
import { useInclinacao, useParalaxeDaFaixa } from './movimento.ts'

/**
 * O portal da noiva — a parceria com o eorganizei.
 *
 * O cartão à direita é o argumento: a pessoa digita os nomes e a data do
 * evento dela e vê, na hora, o portal que teria. Mostrar funcionando vale
 * mais do que descrever, e a conta de dias é o que torna a data concreta.
 *
 * A última linha do andamento é a Lumini, com o ponto vazio: é o que liga
 * o parceiro de volta à loja sem precisar dizer nada.
 */

const ENDERECO_DO_PARCEIRO = 'https://casamento.eorganizei.com.br'

export function Portal({ endereco = ENDERECO_DO_PARCEIRO }: { endereco?: string }) {
  const secao = useRef<HTMLElement>(null)
  const moldura = useRef<HTMLDivElement>(null)
  const foto = useRef<HTMLImageElement>(null)
  const cartao = useRef<HTMLDivElement>(null)

  const [nomes, setNomes] = useState('Diane & Gustavo')
  const [data, setData] = useState('')

  useParalaxeDaFaixa(secao, moldura, -5)
  useInclinacao(secao, cartao, { grau: 7, deslocamento: 0 })

  /*
   * A data de exemplo é calculada no navegador, não escrita no código.
   * Uma data fixa envelhece: em algum momento ela passa, e o cartão de
   * demonstração abre anunciando que o grande dia já chegou.
   */
  useEffect(() => {
    const alvo = new Date()
    alvo.setMonth(alvo.getMonth() + 9)
    // Empurra para o sábado seguinte, que é quando casamento acontece.
    alvo.setDate(alvo.getDate() + ((6 - alvo.getDay() + 7) % 7))
    setData(alvo.toISOString().slice(0, 10))
  }, [])

  // O fundo acompanha o cursor de leve, em sentido contrário ao movimento.
  useEffect(() => {
    const area = secao.current
    if (!area) return
    if (!window.matchMedia('(hover: hover) and (min-width: 760px)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let pedido = 0

    function mover(evento: MouseEvent) {
      cancelAnimationFrame(pedido)
      pedido = requestAnimationFrame(() => {
        const caixa = area!.getBoundingClientRect()
        const alvo = foto.current
        if (!alvo) return
        const px = (evento.clientX - caixa.left) / caixa.width - 0.5
        const py = (evento.clientY - caixa.top) / caixa.height - 0.5
        alvo.style.setProperty('--desvio-x', `${(-px * 2.2).toFixed(2)}%`)
        alvo.style.setProperty('--desvio-y', `${(-py * 2.2).toFixed(2)}%`)
      })
    }

    area.addEventListener('mousemove', mover)
    return () => {
      cancelAnimationFrame(pedido)
      area.removeEventListener('mousemove', mover)
    }
  }, [])

  const contagem = contarDias(data)

  return (
    <section ref={secao} className="lumini-faixa lumini-portal" aria-label="Portal da noiva">
      <div ref={moldura} className="lumini-portal-moldura" aria-hidden="true">
        <img
          ref={foto}
          src="/home/fotos/eorganizei-casal.jpg"
          alt=""
          className="lumini-portal-foto"
        />
      </div>
      <div className="lumini-portal-veu" aria-hidden="true" />

      <div className="lumini-faixa-grade">
        <div className="lumini-faixa-texto" data-entrada>
          <div className="lumini-marca-parceira">
            <span className="lumini-marca-parceira-selo" aria-hidden="true">
              e.
            </span>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                color: 'var(--text-on-dark)',
              }}
            >
              eorganizei
            </span>
            <span aria-hidden="true" style={{ color: 'var(--rule-kraft)' }}>
              ·
            </span>
            <Eyebrow tom="light">Empresa parceira da Lumini Aromas</Eyebrow>
          </div>

          <h2 className="lumini-faixa-titulo">
            Seu casamento está chegando. <em>E os presentes também.</em>
          </h2>

          <p className="lumini-faixa-paragrafo">
            No eorganizei você planeja o evento, monta a lista de presentes e recebe no Pix ou no
            cartão. Tudo num só lugar, no seu ritmo.
          </p>

          <ul className="lumini-faixa-lista">
            <li>
              <strong>Planejamento do evento</strong>
              <span>Cronograma e fornecedores</span>
            </li>
            <li>
              <strong>Lista de presentes</strong>
              <span>Site do casal</span>
            </li>
            <li>
              <strong>Recebimento</strong>
              <span>Pix e cartão</span>
            </li>
          </ul>

          <div className="lumini-faixa-acoes">
            <Botao href={endereco} variante="light" tamanho="lg" alvoNovo>
              Criar minha conta
            </Botao>
            <LinkSeta href={endereco} sobreEscuro alvoNovo>
              Conhecer o eorganizei
            </LinkSeta>
          </div>
        </div>

        <div className="lumini-portal-coluna-cartao" style={{ perspective: 1400 }}>
          <div ref={cartao} className="lumini-cartao-vivo" data-entrada>
            <div className="lumini-cartao-vivo-topo">
              <Eyebrow tom="wood">Experimente com o seu evento</Eyebrow>
              <div className="lumini-campos">
                <div className="lumini-campo">
                  <label htmlFor="portal-nomes">Nomes</label>
                  <input
                    id="portal-nomes"
                    type="text"
                    value={nomes}
                    placeholder="Diane &amp; Gustavo"
                    onChange={(evento) => setNomes(evento.target.value)}
                  />
                </div>
                <div className="lumini-campo">
                  <label htmlFor="portal-data">Data do evento</label>
                  <input
                    id="portal-data"
                    type="date"
                    value={data}
                    onChange={(evento) => setData(evento.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="lumini-cartao-vivo-corpo">
              <div>
                <Eyebrow>Portal de</Eyebrow>
                <h3 className="lumini-portal-nomes" style={{ marginTop: 6 }}>
                  {nomes.trim() || 'Seus nomes'}
                </h3>
              </div>

              <div>
                <div className="lumini-contador">{contagem.numero}</div>
                <div style={{ fontSize: 15, marginTop: 4 }}>{contagem.frase}</div>
                {contagem.porExtenso && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                    {contagem.porExtenso}
                  </div>
                )}
              </div>

              <ul className="lumini-andamento">
                <li>
                  <span className="lumini-ponto" data-pronto aria-hidden="true" />
                  <span>Site do casal publicado</span>
                  <span className="lumini-andamento-estado">Pronto</span>
                </li>
                <li>
                  <span className="lumini-ponto" data-pronto aria-hidden="true" />
                  <span>Lista de presentes</span>
                  <span className="lumini-andamento-estado">12 escolhidos</span>
                </li>
                <li>
                  <span className="lumini-ponto" aria-hidden="true" />
                  <span>Lembrancinhas Lumini Aromas</span>
                  <span className="lumini-andamento-estado">Em produção</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const DIA_EM_MS = 86_400_000

/**
 * Os dias que faltam.
 *
 * Conta a partir da meia-noite de hoje, não do instante atual: sem isso,
 * o mesmo evento mostraria 200 dias de manhã e 199 à tarde.
 */
function contarDias(iso: string): { numero: string; frase: string; porExtenso: string | null } {
  if (!iso) return { numero: '—', frase: 'Escolha a data', porExtenso: null }

  const [ano, mes, dia] = iso.split('-').map(Number)
  if (!ano || !mes || !dia) return { numero: '—', frase: 'Escolha a data', porExtenso: null }

  const alvo = new Date(ano, mes - 1, dia)
  if (Number.isNaN(alvo.getTime())) {
    return { numero: '—', frase: 'Escolha a data', porExtenso: null }
  }

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const dias = Math.round((alvo.getTime() - hoje.getTime()) / DIA_EM_MS)

  const porExtenso = alvo.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const comMaiuscula = porExtenso.charAt(0).toUpperCase() + porExtenso.slice(1)

  // Sem emoji: o design system proíbe, sem exceção.
  if (dias <= 0) return { numero: 'Hoje', frase: 'é o grande dia', porExtenso: comMaiuscula }
  if (dias === 1) return { numero: '1', frase: 'dia para o grande dia', porExtenso: comMaiuscula }

  return {
    numero: dias.toLocaleString('pt-BR'),
    frase: 'dias para o grande dia',
    porExtenso: comMaiuscula,
  }
}
