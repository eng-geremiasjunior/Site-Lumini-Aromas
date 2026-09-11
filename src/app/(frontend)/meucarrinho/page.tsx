import type { Metadata } from 'next'

import { getCart } from '../../../commerce/cart/cart-service.ts'
import { getProductBySlug } from '../../../commerce/catalog/get-product.ts'
import { CalculoDeFrete } from './CalculoDeFrete.tsx'
import { ItensDoCarrinho } from './ItensDoCarrinho.tsx'

export const metadata: Metadata = {
  title: 'Meu carrinho',
  robots: { index: false, follow: false },
}

// O carrinho depende do cookie de cada visitante, então nunca é guardado
// em cache: cada pessoa precisa ver o próprio carrinho.
export const dynamic = 'force-dynamic'

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function CarrinhoPage() {
  const carrinho = await getCart()

  // As faixas de cada produto alimentam o seletor de quantidade do item.
  const faixasPorProduto: Record<string, number[]> = {}
  for (const linha of carrinho.lines) {
    if (faixasPorProduto[linha.productId]) continue
    const produto = await getProductBySlug(linha.productSlug)
    if (produto) faixasPorProduto[linha.productId] = produto.lotTable.map((l) => l.qty)
  }

  return (
    <main style={{ maxWidth: '56rem', margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>
      <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)' }}>Meu carrinho</h1>

      {carrinho.isEmpty ? (
        <div style={{ marginTop: '2rem' }}>
          <p style={{ color: 'var(--lumini-ink-soft)' }}>
            Seu carrinho está vazio.
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              marginTop: '1rem',
              padding: '0.8rem 1.3rem',
              borderRadius: 8,
              background: 'var(--lumini-ink)',
              color: '#fff',
              textDecoration: 'none',
            }}
          >
            Ver lembrancinhas
          </a>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--lumini-ink-soft)', marginTop: '0.3rem' }}>
            {carrinho.totalPieces} peças no total.
          </p>

          <div style={{ marginTop: '2rem' }}>
            <ItensDoCarrinho linhas={carrinho.lines} faixasPorProduto={faixasPorProduto} />
          </div>

          <section
            style={{
              marginTop: '2rem',
              background: '#fff',
              border: '1px solid var(--lumini-line)',
              borderRadius: 10,
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--lumini-ink-soft)' }}>Subtotal</span>
              <strong style={{ fontSize: '1.5rem', fontFamily: 'var(--lumini-font-display)' }}>
                {brl(carrinho.subtotal)}
              </strong>
            </div>

            <a
              href="/finalizacaodecompra/"
              style={{
                display: 'block',
                marginTop: '1.25rem',
                padding: '0.95rem 1.2rem',
                borderRadius: 8,
                background: 'var(--lumini-ink)',
                color: '#fff',
                textAlign: 'center',
                textDecoration: 'none',
                fontSize: '1rem',
              }}
            >
              Continuar para a finalização
            </a>

            <a
              href="/"
              style={{
                display: 'block',
                marginTop: '0.6rem',
                textAlign: 'center',
                color: 'var(--lumini-ink-soft)',
                fontSize: '0.9rem',
              }}
            >
              Continuar comprando
            </a>
          </section>

          <CalculoDeFrete subtotal={carrinho.subtotal} />
        </>
      )}
    </main>
  )
}
