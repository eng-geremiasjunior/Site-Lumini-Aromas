import type { Metadata } from 'next'

import { Dispensar } from './Dispensar.tsx'

export const metadata: Metadata = {
  title: 'Lembretes do carrinho',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

/**
 * Sair dos lembretes.
 *
 * A página pede um clique de confirmação em vez de cancelar sozinha ao
 * abrir. Não é burocracia: antivírus e filtros de e-mail visitam todos os
 * links da mensagem antes de entregá-la, e uma página que cancela no
 * carregamento cancelaria sem a cliente sequer ter aberto o e-mail.
 */
export default async function NaoQueroLembretePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  return (
    <main style={{ maxWidth: '34rem', margin: '0 auto', padding: '5rem 1.5rem' }}>
      <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>Não quer mais os lembretes?</h1>

      <p style={{ color: 'var(--lumini-ink-soft)', fontSize: '1.05rem' }}>
        Sem problema. Confirme aqui embaixo e a gente não escreve mais sobre este carrinho. Seu
        pedido, se você fizer um, continua tendo os avisos normais de produção e entrega.
      </p>

      <Dispensar token={token} />
    </main>
  )
}
