import type { Metadata } from 'next'

import { getPayloadClient } from '../../../lib/payload.ts'
import { ORDER_STATUSES, type OrderStatus } from '../../../commerce/orders/statuses.ts'

export const metadata: Metadata = {
  title: 'Pedido recebido',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PedidoRecebidoPage({ searchParams }: Props) {
  const busca = await searchParams
  const numero = typeof busca.numero === 'string' ? busca.numero : null

  const pedido = numero ? await buscarPedido(numero) : null

  return (
    <main style={{ maxWidth: '44rem', margin: '0 auto', padding: '4rem 1.5rem 6rem' }}>
      <p
        style={{
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          fontSize: '0.75rem',
          color: 'var(--lumini-gold)',
          marginBottom: '1rem',
        }}
      >
        Pedido recebido
      </p>

      <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)' }}>
        Obrigado{pedido?.customerName ? `, ${pedido.customerName.split(' ')[0]}` : ''}!
      </h1>

      {pedido ? (
        <>
          <p style={{ color: 'var(--lumini-ink-soft)' }}>
            Seu pedido <strong>número {pedido.number}</strong> foi registrado. Enviamos a
            confirmação para {pedido.email}.
          </p>

          <section
            style={{
              marginTop: '2rem',
              background: '#fff',
              border: '1px solid var(--lumini-line)',
              borderRadius: 10,
              padding: '1.4rem',
            }}
          >
            <dl style={{ display: 'grid', gap: '0.5rem', margin: 0 }}>
              <Linha rotulo="Situação" valor={ORDER_STATUSES[pedido.status as OrderStatus]?.label ?? '—'} />
              <Linha rotulo="Produtos" valor={brl(pedido.subtotal ?? 0)} />
              <Linha rotulo="Frete" valor={brl(pedido.shippingTotal ?? 0)} />
              <Linha rotulo="Total" valor={brl(pedido.total ?? 0)} destaque />
            </dl>

            {pedido.shippingService && (
              <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--lumini-ink-soft)' }}>
                Envio por {pedido.shippingService}.
              </p>
            )}
          </section>

          <section style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem' }}>O que acontece agora</h2>
            <ol style={{ color: 'var(--lumini-ink-soft)', lineHeight: 1.9, paddingLeft: '1.2rem' }}>
              <li>Confirmamos o pagamento.</li>
              <li>Enviamos a prova da arte para você aprovar, quando houver personalização.</li>
              <li>Começamos a produção artesanal, peça por peça.</li>
              <li>Despachamos e enviamos o código de rastreio.</li>
            </ol>
          </section>
        </>
      ) : (
        <p style={{ color: 'var(--lumini-ink-soft)' }}>
          Não encontramos este pedido. Se você acabou de comprar, confira o e-mail de confirmação
          ou fale com a gente.
        </p>
      )}

      <a
        href="/"
        style={{
          display: 'inline-block',
          marginTop: '2.5rem',
          padding: '0.8rem 1.3rem',
          borderRadius: 8,
          border: '1px solid var(--lumini-line)',
          background: '#fff',
          textDecoration: 'none',
        }}
      >
        Voltar para a loja
      </a>
    </main>
  )
}

function Linha({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <dt style={{ color: 'var(--lumini-ink-soft)' }}>{rotulo}</dt>
      <dd style={{ margin: 0, fontWeight: destaque ? 600 : 400, fontSize: destaque ? '1.1rem' : undefined }}>
        {valor}
      </dd>
    </div>
  )
}

async function buscarPedido(numero: string) {
  const payload = await getPayloadClient()
  const resultado = await payload.find({
    collection: 'orders',
    where: { number: { equals: numero } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return resultado.docs[0] ?? null
}
