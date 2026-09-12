import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getOcasiao } from '../../../../commerce/catalog/get-ocasiao.ts'
import { formatarReais } from '../../../../commerce/format/mascaras.ts'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const ocasiao = await getOcasiao(slug)
  if (!ocasiao) return { title: 'Página não encontrada' }

  return {
    title: ocasiao.headline ?? `Lembrancinhas para ${ocasiao.nome.toLowerCase()}`,
    description: ocasiao.descricao ?? undefined,
    alternates: { canonical: `/para-seu-evento/${ocasiao.slug}/` },
  }
}

export const dynamic = 'force-dynamic'

/**
 * A página de um tipo de evento.
 *
 * É a metade da loja que atende quem ainda não decidiu. Quem chega de um
 * anúncio de casamento vê casamento: as composições que já foram para
 * casamentos, o tamanho de lote que faz sentido, e as dúvidas que noiva
 * costuma ter. A outra metade — a página do produto — atende quem já sabe.
 *
 * Cada seção só aparece quando tem conteúdo de verdade. Seção vazia
 * dizendo "em breve" não é estrutura: é promessa não cumprida na primeira
 * visita.
 */
export default async function OcasiaoPage({ params }: Props) {
  const { slug } = await params
  const ocasiao = await getOcasiao(slug)
  if (!ocasiao) notFound()

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '5533999478774'
  const mensagem = `Olá! Estou organizando um ${ocasiao.nome.toLowerCase()} e queria ver as lembrancinhas.`

  return (
    <main style={{ maxWidth: '68rem', margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>
      <nav style={{ fontSize: '0.85rem', color: 'var(--lumini-ink-soft)', marginBottom: '2rem' }}>
        <a href="/">Início</a> <span aria-hidden="true">›</span>{' '}
        <a href="/para-seu-evento/">Para seu evento</a> <span aria-hidden="true">›</span>{' '}
        {ocasiao.nome}
      </nav>

      {/* ------------------------------------------------------------- abertura */}
      <header style={{ maxWidth: '38rem' }}>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', marginBottom: '0.5rem' }}>
          {ocasiao.headline ?? `Lembrancinhas para ${ocasiao.nome.toLowerCase()}`}
        </h1>

        {ocasiao.descricao && (
          <p style={{ fontSize: '1.05rem', color: 'var(--lumini-ink-soft)' }}>{ocasiao.descricao}</p>
        )}

        {ocasiao.lotesSugeridos && (
          <p style={{ color: 'var(--lumini-ink-soft)', fontSize: '0.95rem' }}>
            Para este tipo de evento, a maioria encomenda de {ocasiao.lotesSugeridos}.
          </p>
        )}
      </header>

      {ocasiao.heroImage && (
        <img
          src={ocasiao.heroImage.url}
          alt={ocasiao.heroImage.alt}
          style={{ width: '100%', borderRadius: 12, marginTop: '2rem' }}
        />
      )}

      {/* -------------------------------------------------------------- peças */}
      {ocasiao.produtos.length > 0 && (
        <section style={{ marginTop: '3.5rem' }}>
          <h2 style={estiloTitulo}>Peças que combinam com {ocasiao.nome.toLowerCase()}</h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(15rem, 1fr))',
              gap: '1.5rem',
              marginTop: '1.5rem',
            }}
          >
            {ocasiao.produtos.map((produto) => (
              <a
                key={produto.slug}
                href={`/product/${produto.slug}/`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                {produto.imagem ? (
                  <img
                    src={produto.imagem.url}
                    alt={produto.imagem.alt || produto.nome}
                    style={{ width: '100%', borderRadius: 10, background: '#fff' }}
                  />
                ) : (
                  <div
                    style={{
                      aspectRatio: '1',
                      borderRadius: 10,
                      background: '#fff',
                      border: '1px dashed var(--lumini-line)',
                    }}
                  />
                )}

                <h3 style={{ fontSize: '1.05rem', margin: '0.7rem 0 0.15rem' }}>{produto.nome}</h3>

                {produto.resumo && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.9rem',
                      color: 'var(--lumini-ink-soft)',
                    }}
                  >
                    {produto.resumo}
                  </p>
                )}

                <p style={{ margin: '0.4rem 0 0', fontSize: '0.92rem' }}>
                  {produto.menorLote} peças por {formatarReais(produto.precoDoMenorLote)}
                </p>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------- inspirações */}
      {ocasiao.inspiracoes.length > 0 && (
        <section style={{ marginTop: '3.5rem' }}>
          <h2 style={estiloTitulo}>Inspirações</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(13rem, 1fr))',
              gap: '0.8rem',
              marginTop: '1.5rem',
            }}
          >
            {ocasiao.inspiracoes.map((imagem) => (
              <img
                key={imagem.url}
                src={imagem.url}
                alt={imagem.alt}
                style={{ width: '100%', borderRadius: 10 }}
              />
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------- prova social */}
      {ocasiao.eventos.length > 0 && (
        <section style={{ marginTop: '3.5rem' }}>
          <h2 style={estiloTitulo}>Já saíram daqui para {ocasiao.nome.toLowerCase()}</h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(13rem, 1fr))',
              gap: '0.8rem',
              marginTop: '1.5rem',
            }}
          >
            {ocasiao.eventos.map((evento) => (
              <figure key={evento.foto.url} style={{ margin: 0 }}>
                <img
                  src={evento.foto.url}
                  alt={evento.foto.alt}
                  style={{ width: '100%', borderRadius: 10 }}
                />
                {evento.legenda && (
                  <figcaption
                    style={{
                      marginTop: '0.35rem',
                      fontSize: '0.82rem',
                      color: 'var(--lumini-ink-soft)',
                    }}
                  >
                    {evento.legenda}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- faq */}
      {ocasiao.faq.length > 0 && (
        <section style={{ marginTop: '3.5rem', maxWidth: '44rem' }}>
          <h2 style={estiloTitulo}>Dúvidas de quem organiza {ocasiao.nome.toLowerCase()}</h2>

          <div style={{ marginTop: '1.25rem' }}>
            {ocasiao.faq.map((item) => (
              <details
                key={item.pergunta}
                style={{ borderBottom: '1px solid var(--lumini-line)', padding: '0.9rem 0' }}
              >
                <summary style={{ cursor: 'pointer', fontSize: '1rem' }}>{item.pergunta}</summary>
                <p style={{ margin: '0.6rem 0 0', color: 'var(--lumini-ink-soft)' }}>
                  {item.resposta}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------- conversa */}
      <section
        style={{
          marginTop: '3.5rem',
          padding: '2rem',
          background: '#fff',
          border: '1px solid var(--lumini-line)',
          borderRadius: 12,
          textAlign: 'center',
        }}
      >
        <h2 style={{ ...estiloTitulo, marginTop: 0 }}>Quer ajuda para escolher?</h2>
        <p style={{ color: 'var(--lumini-ink-soft)', maxWidth: '30rem', margin: '0 auto 1.2rem' }}>
          Conte sobre a sua celebração — data, quantidade de convidados e o estilo que você
          imaginou. A gente sugere o que combina.
        </p>

        <a
          href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(mensagem)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '0.9rem 1.6rem',
            borderRadius: 8,
            background: 'var(--lumini-ink)',
            color: '#fff',
            textDecoration: 'none',
          }}
        >
          Falar sobre o meu evento
        </a>
      </section>
    </main>
  )
}

const estiloTitulo: React.CSSProperties = {
  fontSize: 'clamp(1.3rem, 2.5vw, 1.7rem)',
  marginBottom: 0,
}
