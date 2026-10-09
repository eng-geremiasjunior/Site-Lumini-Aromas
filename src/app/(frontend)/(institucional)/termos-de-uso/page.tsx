import type { Metadata } from 'next'

import { TERMOS } from '../../../../commerce/legal/textos-padrao.ts'
import { PaginaLegal, paginaDoPainel } from '../PaginaLegal.tsx'

/**
 * Termos de uso e condições de venda.
 *
 * Página nova: o site antigo não tinha. O Decreto 7.962/2013 exige o
 * sumário do contrato disponível antes do pagamento, e é esta página que
 * o checkout passa a referenciar no aceite.
 */

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Termos de uso e condições de venda',
  description:
    'Pedido mínimo, como o preço do lote é formado, prazos de produção e entrega, pagamento e personalização.',
  alternates: { canonical: '/termos-de-uso/' },
}

export default async function TermosDeUsoPage() {
  const { empresa, conteudo } = await paginaDoPainel('termsOfUse')

  return (
    <PaginaLegal
      titulo={TERMOS.titulo}
      resumo={TERMOS.resumo}
      conteudo={conteudo}
      padrao={TERMOS.blocos}
      empresa={empresa}
    />
  )
}
