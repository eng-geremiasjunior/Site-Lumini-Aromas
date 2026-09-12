import type { ProductView } from '../../../../commerce/catalog/get-product.ts'

/**
 * As seções que fazem a página vender sozinha.
 *
 * Vêm depois da compra, na ordem em que a dúvida aparece: primeiro o
 * porquê, depois do que é feito, como cheira, como fica com a cara do
 * evento dela, para que celebrações serve, como o pedido acontece, e por
 * fim as perguntas que sobraram.
 *
 * Cada uma some quando não há conteúdo. É o que permite publicar hoje com
 * dois blocos e crescer depois, sem nunca mostrar "em breve".
 */
export function SecoesDaPagina({
  produto,
  ocasioes,
}: {
  produto: ProductView
  ocasioes: Array<{ slug: string; nome: string }>
}) {
  const { pagina } = produto
  const aromasComDescricao = produto.variants.filter((variante) => variante.descricao)

  return (
    <>
      {/* ------------------------------------------ mais do que uma lembrança */}
      {pagina.promessa && (
        <Secao>
          {pagina.promessa.titulo && <Titulo>{pagina.promessa.titulo}</Titulo>}

          {pagina.promessa.texto && (
            <p style={{ ...estiloTexto, maxWidth: '38rem' }}>{pagina.promessa.texto}</p>
          )}

          {pagina.promessa.imagens.length > 0 && (
            <Fotos imagens={pagina.promessa.imagens} minimo="16rem" />
          )}
        </Secao>
      )}

      {/* ------------------------------------------ características e acabamento */}
      {pagina.acabamento.length > 0 && (
        <Secao>
          <Titulo>Características e acabamento</Titulo>

          <div style={{ display: 'grid', gap: '2rem', marginTop: '1.5rem' }}>
            {pagina.acabamento.map((bloco) => (
              <div
                key={bloco.titulo}
                style={{
                  display: 'grid',
                  gridTemplateColumns: bloco.imagem ? 'minmax(0, 12rem) 1fr' : '1fr',
                  gap: '1.5rem',
                  alignItems: 'start',
                }}
              >
                {bloco.imagem && (
                  <img
                    src={bloco.imagem.url}
                    alt={bloco.imagem.alt}
                    style={{ width: '100%', borderRadius: 10 }}
                  />
                )}

                <div>
                  <h3 style={{ fontSize: '1.15rem', margin: '0 0 0.35rem' }}>{bloco.titulo}</h3>
                  <p style={{ ...estiloTexto, margin: 0 }}>{bloco.texto}</p>
                  {bloco.detalhe && (
                    <p
                      style={{
                        margin: '0.5rem 0 0',
                        fontSize: '0.88rem',
                        color: 'var(--lumini-ink-soft)',
                      }}
                    >
                      {bloco.detalhe}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Secao>
      )}

      {/* -------------------------------------------------------------- aromas */}
      {(pagina.secaoAromas || aromasComDescricao.length > 0) && (
        <Secao>
          <Titulo>{pagina.secaoAromas?.titulo ?? 'Um aroma para cada história'}</Titulo>

          {pagina.secaoAromas?.texto && (
            <p style={{ ...estiloTexto, maxWidth: '38rem' }}>{pagina.secaoAromas.texto}</p>
          )}

          {aromasComDescricao.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr))',
                gap: '1.5rem',
                marginTop: '1.5rem',
              }}
            >
              {aromasComDescricao.map((aroma) => (
                <div key={aroma.key}>
                  {aroma.imageUrl && (
                    <img
                      src={aroma.imageUrl}
                      alt={aroma.label}
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        objectFit: 'cover',
                        borderRadius: 10,
                        marginBottom: '0.6rem',
                      }}
                    />
                  )}
                  <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.2rem' }}>{aroma.label}</h3>
                  <p style={{ ...estiloTexto, margin: 0, fontSize: '0.92rem' }}>
                    {aroma.descricao}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Secao>
      )}

      {/* ------------------------------------------------------ personalização */}
      {pagina.secaoPersonalizacao && (
        <Secao>
          <Titulo>
            {pagina.secaoPersonalizacao.titulo ?? 'Seu evento tem uma identidade'}
          </Titulo>

          {pagina.secaoPersonalizacao.texto && (
            <p style={{ ...estiloTexto, maxWidth: '38rem' }}>
              {pagina.secaoPersonalizacao.texto}
            </p>
          )}

          {pagina.secaoPersonalizacao.exemplos.length > 0 && (
            <Fotos imagens={pagina.secaoPersonalizacao.exemplos} minimo="13rem" />
          )}
        </Secao>
      )}

      {/* ---------------------------------------------------------- aplicações */}
      {ocasioes.length > 0 && (
        <Secao>
          <Titulo>Para qual evento é o seu</Titulo>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.6rem',
              marginTop: '1.25rem',
            }}
          >
            {ocasioes.map((ocasiao) => (
              <a
                key={ocasiao.slug}
                href={`/para-seu-evento/${ocasiao.slug}/`}
                style={{
                  padding: '0.6rem 1.1rem',
                  borderRadius: 999,
                  border: '1px solid var(--lumini-line)',
                  background: '#fff',
                  color: 'var(--lumini-ink)',
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                }}
              >
                {ocasiao.nome}
              </a>
            ))}
          </div>
        </Secao>
      )}

      {/* --------------------------------------------------------- como funciona */}
      {pagina.comoFunciona.length > 0 && (
        <Secao>
          <Titulo>Da sua ideia à lembrança pronta</Titulo>

          <ol
            style={{
              listStyle: 'none',
              margin: '1.5rem 0 0',
              padding: 0,
              display: 'grid',
              gap: '1.25rem',
              counterReset: 'passo',
            }}
          >
            {pagina.comoFunciona.map((passo, indice) => (
              <li
                key={passo.titulo}
                style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1rem' }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '50%',
                    border: '1px solid var(--lumini-line)',
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: 'var(--lumini-font-display)',
                    color: 'var(--lumini-gold)',
                  }}
                >
                  {indice + 1}
                </span>

                <div>
                  <h3 style={{ fontSize: '1.05rem', margin: '0.25rem 0 0.2rem' }}>{passo.titulo}</h3>
                  {passo.texto && <p style={{ ...estiloTexto, margin: 0 }}>{passo.texto}</p>}
                </div>
              </li>
            ))}
          </ol>
        </Secao>
      )}

      {/* ------------------------------------------------------------------ faq */}
      {pagina.faq.length > 0 && (
        <Secao>
          <Titulo>Dúvidas sobre a sua lembrança</Titulo>

          <div style={{ marginTop: '1.25rem', maxWidth: '44rem' }}>
            {pagina.faq.map((item) => (
              <details
                key={item.pergunta}
                style={{ borderBottom: '1px solid var(--lumini-line)', padding: '0.9rem 0' }}
              >
                <summary style={{ cursor: 'pointer' }}>{item.pergunta}</summary>
                <p style={{ ...estiloTexto, margin: '0.6rem 0 0' }}>{item.resposta}</p>
              </details>
            ))}
          </div>
        </Secao>
      )}
    </>
  )
}

function Secao({ children }: { children: React.ReactNode }) {
  return <section style={{ marginTop: '4rem' }}>{children}</section>
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)', marginBottom: '0.5rem' }}>{children}</h2>
  )
}

function Fotos({
  imagens,
  minimo,
}: {
  imagens: Array<{ url: string; alt: string }>
  minimo: string
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${minimo}, 1fr))`,
        gap: '0.8rem',
        marginTop: '1.5rem',
      }}
    >
      {imagens.map((imagem) => (
        <img
          key={imagem.url}
          src={imagem.url}
          alt={imagem.alt}
          style={{ width: '100%', borderRadius: 10 }}
        />
      ))}
    </div>
  )
}

const estiloTexto: React.CSSProperties = {
  color: 'var(--lumini-ink-soft)',
  fontSize: '1rem',
  lineHeight: 1.7,
}
