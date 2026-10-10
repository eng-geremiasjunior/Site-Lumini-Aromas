'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import type { OcasiaoDaVitrine } from '../../../commerce/catalog/get-vitrine.ts'
import { Selo, Wordmark } from './pecas.tsx'
import { TODAS, useFiltro } from './filtro.tsx'

/**
 * A barra do topo.
 *
 * Encolhe ao rolar — e a histerese (liga em 72px, desliga em 16px) não é
 * capricho: com um limiar único, a barra fica piscando entre os dois
 * tamanhos quando a pessoa para de rolar exatamente no limite, porque a
 * própria mudança de altura move o conteúdo.
 */
export function BarraDoCabecalho({
  ocasioes,
  totalDePecas,
  itensNaSacola,
  whatsapp,
}: {
  ocasioes: OcasiaoDaVitrine[]
  totalDePecas: number
  itensNaSacola: number
  whatsapp: string | null
}) {
  const [rolou, setRolou] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)
  const [pecasAberto, setPecasAberto] = useState(false)
  const fechamento = useRef<ReturnType<typeof setTimeout> | null>(null)
  const caminho = usePathname()
  const { definir, temVitrine } = useFiltro()

  useEffect(() => {
    let pedido = 0

    function aoRolar() {
      cancelAnimationFrame(pedido)
      pedido = requestAnimationFrame(() => {
        const y = window.scrollY
        setRolou((antes) => (antes ? y >= 16 : y > 72))
      })
    }

    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => {
      cancelAnimationFrame(pedido)
      window.removeEventListener('scroll', aoRolar)
    }
  }, [])

  // Qualquer navegação fecha o menu do celular. Sem isto, a lista fica
  // aberta por cima da página nova.
  useEffect(() => {
    setMenuAberto(false)
    setPecasAberto(false)
  }, [caminho])

  function abrirPecas() {
    if (fechamento.current) clearTimeout(fechamento.current)
    setPecasAberto(true)
  }

  function fecharPecas() {
    if (fechamento.current) clearTimeout(fechamento.current)
    // O atraso dá tempo de o cursor atravessar o vão entre o link e o
    // painel sem o menu sumir no meio do caminho.
    fechamento.current = setTimeout(() => setPecasAberto(false), 140)
  }

  function escolher(ocasiao: string) {
    setPecasAberto(false)
    setMenuAberto(false)
    if (temVitrine) definir(ocasiao)
  }

  const linkDaOcasiao = (slug: string) => `/?ocasiao=${encodeURIComponent(slug)}#vitrine`
  const linkDoWhatsapp = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent('Olá! Vim pelo site e gostaria de um orçamento de lembrancinhas para o meu evento.')}`
    : null

  return (
    <header className="lumini-cabecalho" data-rolou={rolou ? '' : undefined}>
      <div className="lumini-cabecalho-barra">
        <a href="/" className="lumini-marca" aria-label="Lumini Aromas, página inicial">
          {/* O tamanho do selo é decidido no CSS, pelo `data-rolou` da barra. */}
          <Selo />
          <Wordmark tamanho="sm" />
        </a>

        <nav className="lumini-nav-desktop" aria-label="Seções da loja">
          <div
            className="lumini-pecas"
            onMouseEnter={abrirPecas}
            onMouseLeave={fecharPecas}
            onFocus={abrirPecas}
            onBlur={fecharPecas}
          >
            <button
              type="button"
              className="lumini-nav-link lumini-nav-botao"
              aria-expanded={pecasAberto}
              onClick={() => (temVitrine ? escolher(TODAS) : undefined)}
            >
              Peças
            </button>

            {pecasAberto && (
              <div className="lumini-menu-pecas" role="menu">
                <ItemDoMenu
                  rotulo="Todas as peças"
                  contagem={totalDePecas}
                  href="/?ocasiao=Todas#vitrine"
                  aoEscolher={() => escolher(TODAS)}
                  evitarNavegacao={temVitrine}
                />
                <div className="lumini-menu-divisor" />
                {ocasioes.map((ocasiao) => (
                  <ItemDoMenu
                    key={ocasiao.slug}
                    rotulo={ocasiao.nome}
                    contagem={ocasiao.pecas}
                    href={linkDaOcasiao(ocasiao.slug)}
                    aoEscolher={() => escolher(ocasiao.nome)}
                    evitarNavegacao={temVitrine}
                  />
                ))}
              </div>
            )}
          </div>

          <a href="/#ocasioes" className="lumini-nav-link">
            Ocasiões
          </a>

          {linkDoWhatsapp && (
            <a href={linkDoWhatsapp} target="_blank" rel="noopener" className="lumini-nav-link">
              WhatsApp
            </a>
          )}
        </nav>

        <div className="lumini-acoes">
          <a
            href="/minhaconta/"
            className="lumini-nav-link lumini-so-desktop"
            data-ativo={caminho?.startsWith('/minhaconta') ? '' : undefined}
          >
            Minha conta
          </a>

          <a href="/meucarrinho/" className="lumini-nav-link lumini-sacola">
            <span className="lumini-so-desktop">Sacola</span>
            <span className="lumini-so-mobile" aria-hidden="true">
              Sacola
            </span>
            {itensNaSacola > 0 && <span className="lumini-badge">{itensNaSacola}</span>}
          </a>

          <button
            type="button"
            className="lumini-hamburguer lumini-so-mobile"
            aria-label={menuAberto ? 'Fechar o menu' : 'Abrir o menu'}
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto((aberto) => !aberto)}
          >
            <span data-aberto={menuAberto ? '' : undefined} />
            <span data-aberto={menuAberto ? '' : undefined} />
            <span data-aberto={menuAberto ? '' : undefined} />
          </button>
        </div>
      </div>

      {menuAberto && (
        <div className="lumini-menu-mobile">
          <a href="/?ocasiao=Todas#vitrine" onClick={() => escolher(TODAS)}>
            Peças
          </a>
          <a href="/#ocasioes" onClick={() => setMenuAberto(false)}>
            Ocasiões
          </a>
          <a href="/minhaconta/" onClick={() => setMenuAberto(false)}>
            Minha conta
          </a>
          <a href="/meucarrinho/" onClick={() => setMenuAberto(false)}>
            Sacola{itensNaSacola > 0 ? ` (${itensNaSacola})` : ''}
          </a>
          {linkDoWhatsapp && (
            <a
              href={linkDoWhatsapp}
              target="_blank"
              rel="noopener"
              className="lumini-menu-whatsapp"
              onClick={() => setMenuAberto(false)}
            >
              Conversar no WhatsApp <span aria-hidden="true">→</span>
            </a>
          )}
        </div>
      )}
    </header>
  )
}

/**
 * Uma linha do menu suspenso.
 *
 * É sempre um link de verdade, com endereço. Na página inicial o clique é
 * interceptado para filtrar sem recarregar; nas outras, o link navega. Um
 * `button` no lugar impediria abrir a ocasião em outra aba.
 */
function ItemDoMenu({
  rotulo,
  contagem,
  href,
  aoEscolher,
  evitarNavegacao,
}: {
  rotulo: string
  contagem: number
  href: string
  aoEscolher: () => void
  evitarNavegacao: boolean
}) {
  return (
    <a
      href={href}
      role="menuitem"
      className="lumini-item-do-menu"
      onClick={(evento) => {
        if (!evitarNavegacao) return
        if (evento.metaKey || evento.ctrlKey || evento.shiftKey) return
        evento.preventDefault()
        aoEscolher()
      }}
    >
      <span>{rotulo}</span>
      <span className="lumini-item-contagem">
        {contagem} {contagem === 1 ? 'peça' : 'peças'}
      </span>
    </a>
  )
}
