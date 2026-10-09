import type { Metadata } from 'next'

import { PRIVACIDADE } from '../../../../commerce/legal/textos-padrao.ts'
import { PaginaLegal, paginaDoPainel } from '../PaginaLegal.tsx'

/**
 * Política de privacidade e cookies.
 *
 * A URL é a mesma do site antigo (`/politica-de-privacidade/`). É para cá
 * que aponta o aviso de cookies, então ela precisa existir antes de o
 * primeiro visitante aceitar ou recusar o rastreamento.
 */

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Política de privacidade e cookies',
  description:
    'Quais dados a loja coleta, por que, com quem compartilha, por quanto tempo guarda e como você pede para apagar.',
  alternates: { canonical: '/politica-de-privacidade/' },
}

export default async function PoliticaDePrivacidadePage() {
  const { empresa, conteudo } = await paginaDoPainel('privacyPolicy')

  return (
    <PaginaLegal
      titulo={PRIVACIDADE.titulo}
      resumo={PRIVACIDADE.resumo}
      conteudo={conteudo}
      padrao={PRIVACIDADE.blocos}
      empresa={empresa}
    />
  )
}
