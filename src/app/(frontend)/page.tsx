import type { Metadata } from 'next'

import { listarOcasioes, listarPecasDaVitrine } from '../../commerce/catalog/get-vitrine.ts'
import { dadosDaEmpresa } from '../../commerce/store/configuracoes.ts'
import './inicio/inicio.css'
import { Abertura } from './inicio/Abertura.tsx'
import { Agenda } from './inicio/Agenda.tsx'
import { Condicoes } from './inicio/Condicoes.tsx'
import { FaixaImersiva } from './inicio/FaixaImersiva.tsx'
import { Ocasioes } from './inicio/Ocasioes.tsx'
import { Portal } from './inicio/Portal.tsx'
import { Vitrine } from './inicio/Vitrine.tsx'

/**
 * A página inicial.
 *
 * A ordem das seções é a da conversa que acontece no WhatsApp, na mesma
 * sequência: o que é isso (abertura), como funciona (condições), o que
 * tem (vitrine), como é feito (faixa), serve para o meu evento?
 * (ocasiões), cabe na minha data? (agenda), e o parceiro no fim.
 *
 * A vitrine e as ocasiões vêm do banco. O resto é conteúdo do design, com
 * os dados da empresa — WhatsApp, pedido mínimo — vindos do painel, para
 * não existir número de telefone escrito em código.
 */

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Lumini Aromas — Lembrancinhas montadas à mão para casamentos e eventos',
  description:
    'Velas aromáticas sobre tronco, em vidro e em cerâmica, com os nomes e a data do seu evento na tag. Lotes fechados a partir de 20 peças, produzidos do zero para uma data.',
  alternates: { canonical: '/' },
}

export default async function HomePage() {
  const [pecas, empresa] = await Promise.all([listarPecasDaVitrine(), dadosDaEmpresa()])
  const ocasioes = await listarOcasioes(pecas)

  return (
    <>
      <Abertura whatsapp={empresa.whatsapp} />
      <Condicoes pedidoMinimo={empresa.pedidoMinimo} />

      {empresa.avisoDeProducao && (
        <div className="lumini-aviso-de-prazo">{empresa.avisoDeProducao}</div>
      )}

      <Vitrine pecas={pecas} ocasioes={ocasioes} />
      <FaixaImersiva whatsapp={empresa.whatsapp} />
      <Ocasioes ocasioes={ocasioes} />
      <Agenda whatsapp={empresa.whatsapp} />
      <Portal />
    </>
  )
}
