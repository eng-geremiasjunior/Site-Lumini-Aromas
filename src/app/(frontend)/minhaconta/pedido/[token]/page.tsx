import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getPayloadClient } from '../../../../../lib/payload.ts'
import { ORDER_STATUSES, type OrderStatus } from '../../../../../commerce/orders/statuses.ts'
import {
  construirLinhaDoTempo,
  contarAteOEvento,
  tituloDoPedido,
} from '../../../../../commerce/orders/timeline.ts'
import { AprovacaoDaArte } from './AprovacaoDaArte.tsx'

export const metadata: Metadata = {
  title: 'Seu pedido',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ token: string }> }

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function dataCurta(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
}

export default async function PedidoPage({ params }: Props) {
  const { token } = await params
  const pedido = await buscarPorToken(token)
  if (!pedido) notFound()

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '5533999478774'
  const situacao = ORDER_STATUSES[pedido.status as OrderStatus]

  const itens = Array.isArray(pedido.items) ? pedido.items : []
  const fotos = Array.isArray(pedido.productionPhotos) ? pedido.productionPhotos : []

  // Vale a pena mostrar a etapa "Arte do rótulo" quando alguma peça é
  // personalizada, mesmo antes de a prova existir: é o que avisa a cliente
  // de que ela vai conferir o rótulo antes de qualquer coisa ser produzida.
  const temArte = itens.some(
    (item) =>
      item.artProof ||
      item.artFile ||
      (item.personalization && Object.keys(item.personalization).length > 0),
  )

  const arteAprovadaEm =
    itens.map((item) => item.artApprovedAt).filter(Boolean).sort().at(-1) ?? null

  const etapas = construirLinhaDoTempo({
    status: pedido.status as OrderStatus,
    temArte,
    arteAprovadaEm: arteAprovadaEm ? String(arteAprovadaEm) : null,
    criadoEm: pedido.createdAt,
    pagoEm: pedido.datePaid,
    enviadoEm: pedido.dateShipped,
    codigoRastreio: pedido.trackingCode,
    temFotoDaProducao: fotos.length > 0,
  })

  const recados = (Array.isArray(pedido.notes) ? pedido.notes : []).filter(
    (nota) => nota.visibleToCustomer && nota.text,
  )

  const contagem = pedido.eventDate ? contarAteOEvento(String(pedido.eventDate).slice(0, 10)) : null

  const mensagemWhatsApp = `Olá! É sobre o meu pedido ${pedido.number}.`

  return (
    <main style={{ maxWidth: '46rem', margin: '0 auto', padding: '3.5rem 1.5rem 6rem' }}>
      {/* ------------------------------------------------------- cabeçalho */}
      <p style={estiloSobretitulo}>Pedido {pedido.number}</p>

      <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', marginBottom: '0.4rem' }}>
        {tituloDoPedido({
          number: String(pedido.number),
          eventType: pedido.eventType,
          eventDate: pedido.eventDate ? String(pedido.eventDate) : null,
        })}
      </h1>

      {contagem && !contagem.passou && (
        <p style={{ color: 'var(--lumini-gold)', fontSize: '1.05rem', marginTop: 0 }}>
          {contagem.texto}
        </p>
      )}

      {/* ------------------------------------------------- estado em destaque */}
      <section
        style={{
          background: '#fff',
          border: '1px solid var(--lumini-line)',
          borderLeft: `4px solid ${situacao?.color ?? 'var(--lumini-gold)'}`,
          borderRadius: 10,
          padding: '1.2rem 1.35rem',
          marginTop: '1.75rem',
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem' }}>
          {etapas.find((e) => e.estado === 'atual' || e.estado === 'interrompida')?.titulo ??
            situacao?.label}
        </p>
        <p style={{ margin: '0.3rem 0 0', color: 'var(--lumini-ink-soft)' }}>
          {etapas.find((e) => e.estado === 'atual' || e.estado === 'interrompida')?.descricao}
        </p>
      </section>

      {/* ---------------------------------------------------- linha do tempo */}
      {etapas.length > 1 && (
        <section style={{ marginTop: '2.5rem' }}>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {etapas.map((etapa, indice) => {
              const cor =
                etapa.estado === 'concluida'
                  ? 'var(--lumini-gold)'
                  : etapa.estado === 'atual'
                    ? 'var(--lumini-ink)'
                    : 'var(--lumini-line)'

              return (
                <li
                  key={etapa.chave}
                  style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1rem' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: etapa.estado === 'futura' ? '#fff' : cor,
                        border: `2px solid ${cor}`,
                        marginTop: '0.35rem',
                      }}
                    />
                    {indice < etapas.length - 1 && (
                      <span
                        aria-hidden="true"
                        style={{ width: 2, flex: 1, minHeight: 34, background: 'var(--lumini-line)' }}
                      />
                    )}
                  </div>

                  <div style={{ paddingBottom: '1.4rem' }}>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: etapa.estado === 'atual' ? 600 : 400,
                        color: etapa.estado === 'futura' ? 'var(--lumini-ink-soft)' : undefined,
                      }}
                    >
                      {etapa.titulo}
                      {etapa.em && (
                        <span style={{ color: 'var(--lumini-ink-soft)', fontWeight: 400 }}>
                          {' '}
                          · {dataCurta(etapa.em)}
                        </span>
                      )}
                    </p>
                    <p
                      style={{
                        margin: '0.2rem 0 0',
                        fontSize: '0.93rem',
                        color: 'var(--lumini-ink-soft)',
                      }}
                    >
                      {etapa.descricao}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      {/* --------------------------------------------------- arte do rótulo */}
      {itens.map((item, indice) => {
        const prova = typeof item.artProof === 'object' ? item.artProof : null
        if (!prova?.url) return null

        return (
          <AprovacaoDaArte
            key={`arte-${indice}`}
            token={token}
            indice={indice}
            nomeDoItem={item.productName ?? 'Sua peça'}
            imagem={prova.url}
            aprovadaEm={item.artApprovedAt ? String(item.artApprovedAt) : null}
          />
        )
      })}

      {/* ----------------------------------------------------------- recados */}
      {recados.length > 0 && (
        <section style={{ marginTop: '2.5rem' }}>
          <h2 style={estiloSecao}>Recados sobre o seu pedido</h2>
          <div style={{ display: 'grid', gap: '0.7rem' }}>
            {recados.map((nota, indice) => (
              <p
                key={indice}
                style={{
                  margin: 0,
                  background: '#fff',
                  border: '1px solid var(--lumini-line)',
                  borderRadius: 10,
                  padding: '0.9rem 1.1rem',
                }}
              >
                {nota.text}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------ fotos da produção */}
      {fotos.length > 0 && (
        <section style={{ marginTop: '1rem' }}>
          <h2 style={estiloSecao}>Suas peças sendo feitas</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))',
              gap: '0.6rem',
            }}
          >
            {fotos.map((foto, indice) => {
              const url = typeof foto === 'object' && foto ? (foto as { url?: string }).url : null
              if (!url) return null
              return (
                <img
                  key={url}
                  src={url}
                  alt={`Produção do seu pedido, foto ${indice + 1}`}
                  style={{ width: '100%', borderRadius: 10 }}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------- rastreio */}
      {pedido.trackingCode && (
        <section style={{ marginTop: '2.5rem' }}>
          <h2 style={estiloSecao}>Acompanhar a entrega</h2>
          <p style={{ color: 'var(--lumini-ink-soft)', marginTop: 0 }}>
            {pedido.shippingService ? `Enviado por ${pedido.shippingService}.` : ''} Código{' '}
            <strong>{pedido.trackingCode}</strong>.
          </p>
          <a
            href={`https://www.melhorrastreio.com.br/rastreio/${pedido.trackingCode}`}
            target="_blank"
            rel="noopener noreferrer"
            style={estiloBotaoSecundario}
          >
            Rastrear encomenda
          </a>
        </section>
      )}

      {/* ------------------------------------------------------------ itens */}
      <section style={{ marginTop: '2.5rem' }}>
        <h2 style={estiloSecao}>O que você pediu</h2>

        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '1rem' }}>
          {itens.map((item, indice) => (
            <li
              key={indice}
              style={{
                background: '#fff',
                border: '1px solid var(--lumini-line)',
                borderRadius: 10,
                padding: '1rem 1.15rem',
              }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>
                {item.productName}
                {item.variantLabel ? ` · ${item.variantLabel}` : ''}
              </p>
              <p style={{ margin: '0.15rem 0 0', color: 'var(--lumini-ink-soft)' }}>
                {item.qty} peças · {brl(item.lineTotal ?? 0)}
              </p>

              {item.personalization && Object.keys(item.personalization).length > 0 && (
                <dl
                  style={{
                    margin: '0.7rem 0 0',
                    paddingTop: '0.7rem',
                    borderTop: '1px solid var(--lumini-line)',
                    display: 'grid',
                    gap: '0.2rem',
                    fontSize: '0.92rem',
                  }}
                >
                  {Object.entries(item.personalization as Record<string, string>).map(
                    ([rotulo, valor]) => (
                      <div key={rotulo}>
                        <dt style={{ display: 'inline', color: 'var(--lumini-ink-soft)' }}>
                          {rotulo}:{' '}
                        </dt>
                        <dd style={{ display: 'inline', margin: 0 }}>{valor}</dd>
                      </div>
                    ),
                  )}
                </dl>
              )}
            </li>
          ))}
        </ul>

        <dl style={{ marginTop: '1.25rem', display: 'grid', gap: '0.35rem' }}>
          <Linha rotulo="Produtos" valor={brl(pedido.subtotal ?? 0)} />
          <Linha
            rotulo="Frete"
            valor={
              pedido.shippingTotal && pedido.shippingTotal > 0
                ? brl(pedido.shippingTotal)
                : 'A combinar'
            }
          />
          <Linha rotulo="Total" valor={brl(pedido.total ?? 0)} destaque />
        </dl>
      </section>

      {/* ------------------------------------------------------- fale comigo */}
      <section
        style={{
          marginTop: '3rem',
          padding: '1.5rem',
          background: '#fff',
          border: '1px solid var(--lumini-line)',
          borderRadius: 12,
          textAlign: 'center',
        }}
      >
        <p style={{ margin: '0 0 0.9rem', color: 'var(--lumini-ink-soft)' }}>
          Ficou com alguma dúvida sobre este pedido? A gente responde.
        </p>
        <a
          href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(mensagemWhatsApp)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...estiloBotaoSecundario, display: 'inline-block' }}
        >
          Falar sobre o pedido {pedido.number}
        </a>
      </section>
    </main>
  )
}

function Linha({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <dt style={{ color: 'var(--lumini-ink-soft)' }}>{rotulo}</dt>
      <dd
        style={{
          margin: 0,
          fontWeight: destaque ? 600 : 400,
          fontSize: destaque ? '1.15rem' : undefined,
        }}
      >
        {valor}
      </dd>
    </div>
  )
}

async function buscarPorToken(token: string) {
  if (!token || token.length < 20) return null

  const payload = await getPayloadClient()
  const resultado = await payload.find({
    collection: 'orders',
    where: { trackingToken: { equals: token } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })

  return resultado.docs[0] ?? null
}

const estiloSobretitulo: React.CSSProperties = {
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  fontSize: '0.72rem',
  color: 'var(--lumini-ink-soft)',
  marginBottom: '0.8rem',
}

const estiloSecao: React.CSSProperties = {
  fontSize: '1.1rem',
  fontFamily: 'var(--lumini-font-body)',
  marginBottom: '0.9rem',
}

const estiloBotaoSecundario: React.CSSProperties = {
  padding: '0.75rem 1.2rem',
  borderRadius: 8,
  border: '1px solid var(--lumini-line)',
  background: 'var(--lumini-cream)',
  color: 'var(--lumini-ink)',
  textDecoration: 'none',
  fontSize: '0.95rem',
}
