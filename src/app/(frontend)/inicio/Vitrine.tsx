'use client'

import type React from 'react'

import type { OcasiaoDaVitrine, PecaDaVitrine } from '../../../commerce/catalog/get-vitrine.ts'
import { CabecalhoDeSecao, LinkSeta, reaisInteiros } from '../comum/pecas.tsx'
import { TODAS, useFiltro } from '../comum/filtro.tsx'

/**
 * A vitrine.
 *
 * O preço aparece **pelo lote fechado**, nunca por peça em destaque — foi
 * testado nos anúncios da Meta e melhorou a qualificação de quem chega. A
 * faixa some junto quando o produto não tem preço, porque a listagem lê a
 * mesma tabela de lotes do resto da loja: produto sem preço não entra.
 *
 * O filtro é compartilhado com o menu "Peças" e com os cartões de
 * Ocasiões, então a pílula marcada aqui e o cartão clicado lá sempre
 * concordam.
 */
export function Vitrine({
  pecas,
  ocasioes,
}: {
  pecas: PecaDaVitrine[]
  ocasioes: OcasiaoDaVitrine[]
}) {
  const { filtro, definir } = useFiltro()

  const abas = [TODAS, ...ocasioes.map((o) => o.nome)]
  const ativo = abas.includes(filtro) ? filtro : TODAS

  const visiveis = ativo === TODAS ? pecas : pecas.filter((p) => p.ocasioes.includes(ativo))

  return (
    <section id="vitrine" className="lumini-vitrine" aria-label="Peças">
      <div data-entrada>
        <CabecalhoDeSecao
          eyebrow="Peças"
          titulo="Escolha a peça do seu evento"
          lead="Os valores são por lote fechado. O aroma e a quantidade você escolhe na página da peça."
        />
      </div>

      {abas.length > 1 && (
        <>
          <div className="lumini-filtros" role="group" aria-label="Filtrar por ocasião">
            {abas.map((aba) => (
              <button
                key={aba}
                type="button"
                className="lumini-filtro"
                data-ativo={aba === ativo ? '' : undefined}
                aria-pressed={aba === ativo}
                onClick={() => definir(aba)}
              >
                {aba}
              </button>
            ))}
          </div>

          <div
            className="lumini-abas lumini-rolagem-oculta"
            role="group"
            aria-label="Filtrar por ocasião"
          >
            {abas.map((aba) => (
              <button
                key={aba}
                type="button"
                className="lumini-aba"
                data-ativo={aba === ativo ? '' : undefined}
                aria-pressed={aba === ativo}
                onClick={() => definir(aba)}
              >
                {aba}
              </button>
            ))}
          </div>
        </>
      )}

      {visiveis.length > 0 ? (
        <>
          <div className="lumini-pecas-grade">
            {visiveis.map((peca, i) => (
              <Cartao key={peca.slug} peca={peca} atraso={(i % 4) * 70} />
            ))}
          </div>

          <p className="lumini-vitrine-nota">
            {ativo === TODAS
              ? `${visiveis.length} ${visiveis.length === 1 ? 'peça' : 'peças'} · novas peças cadastradas no painel aparecem aqui automaticamente.`
              : `${visiveis.length} ${visiveis.length === 1 ? 'peça' : 'peças'} para ${ativo.toLowerCase()}.`}
          </p>
        </>
      ) : (
        <VitrineVazia comFiltro={ativo !== TODAS} aoLimpar={() => definir(TODAS)} />
      )}
    </section>
  )
}

function Cartao({ peca, atraso }: { peca: PecaDaVitrine; atraso: number }) {
  const faixa =
    peca.precoMinimo === peca.precoMaximo
      ? reaisInteiros(peca.precoMinimo)
      : `${reaisInteiros(peca.precoMinimo)} – ${reaisInteiros(peca.precoMaximo)}`

  return (
    <a
      href={`/product/${peca.slug}/`}
      className="lumini-cartao"
      data-entrada
      style={{ '--atraso': `${atraso}ms` } as React.CSSProperties}
    >
      <div className="lumini-cartao-moldura">
        {peca.foto ? (
          <img
            src={peca.foto.url}
            alt={peca.foto.alt || peca.nome}
            className="lumini-cartao-foto"
            loading="lazy"
          />
        ) : (
          <span className="lumini-cartao-sem-foto">Foto a cadastrar</span>
        )}
        <span className="lumini-capsula">
          Ver peça <span aria-hidden="true">→</span>
        </span>
      </div>

      <h3 className="lumini-cartao-titulo">{peca.nome}</h3>
      {peca.resumo && <p className="lumini-cartao-materiais">{peca.resumo}</p>}

      <div className="lumini-cartao-preco">
        <span className="lumini-cartao-faixa">{faixa}</span>
        <span className="lumini-cartao-lotes">
          {peca.minQty} a {peca.maxQty} peças
        </span>
      </div>
    </a>
  )
}

/**
 * A vitrine sem peça nenhuma.
 *
 * Acontece em dois casos bem diferentes, e o texto distingue os dois: ou
 * o filtro não tem peça (a pessoa resolve clicando em "Todas"), ou o
 * catálogo ainda não foi publicado no painel (ninguém resolve clicando, e
 * dizer "nenhum resultado" ali seria mentir sobre o que aconteceu).
 */
function VitrineVazia({ comFiltro, aoLimpar }: { comFiltro: boolean; aoLimpar: () => void }) {
  if (comFiltro) {
    return (
      <div className="lumini-vitrine-vazia">
        <p style={{ margin: 0 }}>Ainda não há peça cadastrada para esta ocasião.</p>
        <LinkSeta onClick={aoLimpar}>Ver todas as peças</LinkSeta>
      </div>
    )
  }

  return (
    <div className="lumini-vitrine-vazia">
      <p style={{ margin: 0, fontSize: '1.0625rem' }}>
        As peças aparecem aqui assim que forem publicadas no painel.
      </p>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>
        O catálogo está cadastrado como rascunho. Cada peça publicada entra nesta grade, no mapa do
        site e nos feeds do Google e da Meta, sem mexer em código.
      </p>
    </div>
  )
}
