import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getProductBySlug } from '../../../../commerce/catalog/get-product.ts'
import { provaSocialDoProduto } from '../../../../commerce/catalog/get-prova-social.ts'
import { SeletorDeCompra } from './SeletorDeCompra.tsx'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const produto = await getProductBySlug(slug)
  if (!produto) return { title: 'Produto não encontrado' }

  const menorLote = produto.lotTable[0]

  return {
    title: produto.name,
    description:
      produto.shortDescription ??
      `${produto.name}. Lembrancinha artesanal personalizada, a partir de ${menorLote?.qty ?? 20} peças.`,
    alternates: { canonical: `/product/${produto.slug}/` },
  }
}

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params
  const busca = await searchParams

  const produto = await getProductBySlug(slug)
  if (!produto) notFound()

  const aroma = typeof busca.aroma === 'string' ? busca.aroma : null
  const quantidade = typeof busca.quantidade === 'string' ? Number(busca.quantidade) : null

  const menorLote = produto.lotTable[0]
  const maiorLote = produto.lotTable[produto.lotTable.length - 1]
  const capa = produto.images[0]

  // Chave temporária para comparar as duas formas de prova social lado a
  // lado, no produto de verdade: ?prova=1, ?prova=2, ?prova=nenhuma.
  // Quando a decisão estiver tomada, sai daqui e fica só a escolhida.
  const prova = await provaSocialDoProduto(produto.id)
  const modoDaProva = typeof busca.prova === 'string' ? busca.prova : 'ambas'
  const mostrarFoto = (modoDaProva === 'ambas' || modoDaProva === '1') && prova.foto !== null
  const mostrarFrase = (modoDaProva === 'ambas' || modoDaProva === '2') && prova.frase !== null

  return (
    <main style={{ maxWidth: '68rem', margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>
      <nav style={{ fontSize: '0.85rem', color: 'var(--lumini-ink-soft)', marginBottom: '2rem' }}>
        <a href="/">Início</a> <span aria-hidden="true">›</span> {produto.name}
      </nav>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))',
          gap: '3rem',
          alignItems: 'start',
        }}
      >
        {/* ---------------------------------------------------------- fotos */}
        <div>
          {capa ? (
            <img
              src={capa.url}
              alt={capa.alt || produto.name}
              style={{ width: '100%', borderRadius: 12, background: '#fff' }}
            />
          ) : (
            <div
              style={{
                aspectRatio: '1',
                borderRadius: 12,
                background: '#fff',
                border: '1px dashed var(--lumini-line)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--lumini-ink-soft)',
                fontSize: '0.9rem',
              }}
            >
              Sem foto cadastrada
            </div>
          )}

          {(produto.images.length > 1 || mostrarFoto) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(4.5rem, 1fr))',
                gap: '0.5rem',
                marginTop: '0.6rem',
              }}
            >
              {produto.images.slice(1).map((imagem) => (
                <img
                  key={imagem.url}
                  src={imagem.url}
                  alt={imagem.alt || produto.name}
                  style={{ width: '100%', borderRadius: 8, background: '#fff' }}
                />
              ))}

              {/* A foto de cliente é a última da galeria, não uma seção nova:
                  entra no gesto que a pessoa já está fazendo. */}
              {mostrarFoto && prova.foto && (
                <img
                  src={prova.foto.url}
                  alt={prova.foto.alt}
                  style={{
                    width: '100%',
                    borderRadius: 8,
                    background: '#fff',
                    outline: '1px solid var(--lumini-gold)',
                    outlineOffset: -1,
                  }}
                />
              )}
            </div>
          )}

          {mostrarFoto && prova.foto?.legenda && (
            <p
              style={{
                margin: '0.5rem 0 0',
                fontSize: '0.82rem',
                color: 'var(--lumini-ink-soft)',
              }}
            >
              A última foto é de uma cliente · {prova.foto.legenda}
            </p>
          )}
        </div>

        {/* --------------------------------------------------------- compra */}
        <div>
          <h1 style={{ fontSize: 'clamp(1.7rem, 3.5vw, 2.4rem)', marginBottom: '0.4rem' }}>
            {produto.name}
          </h1>

          {menorLote && maiorLote && (
            <p style={{ color: 'var(--lumini-ink-soft)', marginTop: 0 }}>
              De {brl(menorLote.lotPrice)} a {brl(maiorLote.lotPrice)}, conforme a quantidade.
              Pedido mínimo de {produto.minQty} peças.
            </p>
          )}

          {produto.shortDescription && (
            <p style={{ marginBottom: '2rem' }}>{produto.shortDescription}</p>
          )}

          <SeletorDeCompra
            produto={produto}
            whatsappNumber={process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '5533999478774'}
            aromaInicial={aroma}
            quantidadeInicial={Number.isFinite(quantidade) ? quantidade : null}
            provaDaUltimaVenda={mostrarFrase ? prova.frase : null}
          />
        </div>
      </div>

      {/* ------------------------------------------------- tabela de preços */}
      <section style={{ marginTop: '4rem' }}>
        <h2 style={{ fontSize: '1.5rem' }}>Preço por quantidade</h2>
        <p style={{ color: 'var(--lumini-ink-soft)', marginTop: 0 }}>
          Cada peça sai por {brl(produto.unitPrice)}. O valor do lote é a quantidade
          multiplicada por esse preço.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '22rem', width: '100%' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--lumini-line)' }}>
                <th style={{ padding: '0.5rem 0.75rem' }}>Quantidade</th>
                <th style={{ padding: '0.5rem 0.75rem' }}>Preço da peça</th>
                <th style={{ padding: '0.5rem 0.75rem' }}>Total do lote</th>
              </tr>
            </thead>
            <tbody>
              {produto.lotTable.map((linha) => (
                <tr key={linha.qty} style={{ borderBottom: '1px solid var(--lumini-line)' }}>
                  <td style={{ padding: '0.5rem 0.75rem' }}>{linha.qty} peças</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>{brl(linha.unitPrice)}</td>
                  <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>
                    {brl(linha.lotPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------------ ficha técnica */}
      {produto.techSheet.length > 0 && (
        <section style={{ marginTop: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem' }}>Informações</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.4rem 1.5rem' }}>
            {produto.techSheet.map((item) => (
              <div key={item.rotulo} style={{ display: 'contents' }}>
                <dt style={{ color: 'var(--lumini-ink-soft)' }}>{item.rotulo}</dt>
                <dd style={{ margin: 0 }}>{item.valor}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </main>
  )
}
