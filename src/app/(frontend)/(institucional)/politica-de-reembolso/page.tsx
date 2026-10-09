import type { Metadata } from 'next'

import { TROCAS } from '../../../../commerce/legal/textos-padrao.ts'
import { PaginaLegal, paginaDoPainel } from '../PaginaLegal.tsx'

/**
 * Trocas, devoluções e arrependimento.
 *
 * A URL é a mesma do site antigo (`/politica-de-reembolso/`) para não
 * quebrar o que o Google já indexou nem o link que o Merchant Center
 * aponta como política de devolução da conta.
 */

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Trocas, devoluções e arrependimento',
  description:
    'Você tem 7 dias corridos após receber para desistir da compra, mesmo em peças personalizadas. Veja como pedir.',
  alternates: { canonical: '/politica-de-reembolso/' },
}

export default async function PoliticaDeReembolsoPage() {
  const { empresa, conteudo } = await paginaDoPainel('returnPolicy')

  return (
    <PaginaLegal
      titulo={TROCAS.titulo}
      resumo={TROCAS.resumo}
      conteudo={conteudo}
      padrao={TROCAS.blocos}
      empresa={empresa}
    />
  )
}
