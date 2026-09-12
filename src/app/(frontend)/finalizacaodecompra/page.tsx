import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getCart } from '../../../commerce/cart/cart-service.ts'
import { ofertaId } from '../../../commerce/feeds/oferta-id.ts'
import { Checkout } from './Checkout.tsx'
import { Evento } from '../rastreamento/Evento.tsx'

export const metadata: Metadata = {
  title: 'Finalização de compra',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const carrinho = await getCart()

  // Sem itens não há o que finalizar; volta para o carrinho em vez de
  // mostrar um formulário vazio.
  if (carrinho.isEmpty) redirect('/meucarrinho/')

  return (
    <main style={{ maxWidth: '68rem', margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>
      {/* Quem chega até aqui e não termina é o público de remarketing mais
          valioso que a loja tem. */}
      <Evento
        nome="begin_checkout"
        dados={{
          itens: carrinho.lines.map((linha) => ({
            id: ofertaId({
              produtoId: linha.productId,
              loteMinimo: linha.qty,
              sku: linha.sku,
            }),
            nome: linha.productName,
            precoEmCentavos: linha.total,
            quantidade: 1,
            variacao: linha.variantLabel,
          })),
          valorEmCentavos: carrinho.subtotal - carrinho.desconto,
          cupom: carrinho.cupom?.codigo ?? null,
        }}
      />

      <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', marginBottom: '0.3rem' }}>
        Finalização de compra
      </h1>
      <p style={{ color: 'var(--lumini-ink-soft)', marginTop: 0, marginBottom: '2.5rem' }}>
        Falta pouco. Seus dados são usados apenas para entregar e emitir a nota.
      </p>

      <Checkout
        subtotal={carrinho.subtotal}
        quantidadeDePecas={carrinho.totalPieces}
        cartao={carrinho.cartaoPresente}
        cupom={
          carrinho.cupom
            ? {
                codigo: carrinho.cupom.codigo,
                desconto: carrinho.desconto,
                freteGratis: carrinho.cupom.freteGratis,
              }
            : null
        }
      />
    </main>
  )
}
