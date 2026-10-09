import type { Metadata } from 'next'
import type React from 'react'

import { buildWhatsAppLink } from '../../../../commerce/marketing/whatsapp-lead.ts'
import { Assinatura, dadosDaEmpresa, formatarWhatsapp } from '../PaginaLegal.tsx'

/**
 * Contato.
 *
 * A URL é a mesma do site antigo (`/contato/`). Além do atendimento, esta
 * página cumpre duas obrigações: a identificação do fornecedor exigida pelo
 * Decreto 7.962/2013 e o canal de contato visível antes do checkout, que o
 * Google Merchant verifica para aprovar o catálogo. É também o canal do
 * titular de dados previsto na LGPD.
 */

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Contato',
  description:
    'Fale com a Lumini Aromas pelo WhatsApp ou por e-mail para orçamento de lembrancinhas de luxo para o seu evento.',
  alternates: { canonical: '/contato/' },
}

export default async function ContatoPage() {
  const empresa = await dadosDaEmpresa()

  const linkDoWhatsapp = empresa.whatsapp
    ? buildWhatsAppLink({
        phone: empresa.whatsapp,
        customText:
          'Olá! Vim pelo site da Lumini Aromas e gostaria de um orçamento de lembrancinhas para o meu evento.',
      })
    : null

  return (
    <main style={{ maxWidth: '44rem', margin: '0 auto', padding: '3.5rem 1.5rem 5rem' }}>
      <nav style={{ fontSize: '0.85rem', color: 'var(--lumini-ink-soft)', marginBottom: '2rem' }}>
        <a href="/" style={{ color: 'var(--lumini-ink-soft)' }}>
          Início
        </a>{' '}
        <span aria-hidden="true">›</span> Contato
      </nav>

      <h1 style={{ fontSize: 'clamp(1.7rem, 3.5vw, 2.3rem)', marginBottom: '0.5rem' }}>
        Falar com a Lumini
      </h1>

      <p style={{ color: 'var(--lumini-ink-soft)', fontSize: '1.02rem', lineHeight: 1.7 }}>
        A maior parte dos orçamentos é fechada por mensagem. Diga o tipo de evento, a data e quantos
        convidados: respondemos com as opções de aroma, o preço do lote e o prazo de produção.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
          gap: '0.9rem',
          margin: '2.25rem 0 2.5rem',
        }}
      >
        {linkDoWhatsapp && (
          <Canal
            href={linkDoWhatsapp}
            rotulo="WhatsApp"
            valor={formatarWhatsapp(empresa.whatsapp ?? '')}
            apoio="O caminho mais rápido. Atendimento com pessoa, não robô."
            destaque
          />
        )}

        {empresa.email && (
          <Canal
            href={`mailto:${empresa.email}`}
            rotulo="E-mail"
            valor={empresa.email}
            apoio="Para orçamento corporativo, nota fiscal e assuntos de dados pessoais."
          />
        )}
      </div>

      {empresa.horario && (
        <Secao titulo="Horário de atendimento">
          <p style={{ lineHeight: 1.78, margin: 0 }}>{empresa.horario}</p>
        </Secao>
      )}

      <Secao titulo="Pedido mínimo">
        <p style={{ lineHeight: 1.78, margin: 0 }}>
          As peças são vendidas por lote fechado, de um único aroma, com a quantidade mínima
          informada na página de cada produto. Para quantidades maiores do que a faixa da página, o
          orçamento sai por aqui.
        </p>
      </Secao>

      <Secao titulo="Já tenho um pedido">
        <p style={{ lineHeight: 1.78, margin: '0 0 0.75rem' }}>
          O acompanhamento, a aprovação da arte e o código de rastreio ficam na sua conta.
        </p>
        <a href="/minhaconta/" style={{ color: 'var(--lumini-gold)' }}>
          Acompanhar meu pedido
        </a>
      </Secao>

      <Secao titulo="Dados pessoais e privacidade">
        <p style={{ lineHeight: 1.78, margin: 0 }}>
          Para pedir acesso, correção ou exclusão dos seus dados, escreva para o e-mail acima.
          Respondemos em até 15 dias, como prevê a Lei Geral de Proteção de Dados. O que coletamos e
          por quanto tempo guardamos está na{' '}
          <a href="/politica-de-privacidade/" style={{ color: 'var(--lumini-gold)' }}>
            política de privacidade
          </a>
          .
        </p>
      </Secao>

      <Assinatura empresa={empresa} />

      <nav
        style={{
          marginTop: '2rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.4rem 1.25rem',
          fontSize: '0.85rem',
        }}
      >
        <a href="/termos-de-uso/" style={{ color: 'var(--lumini-ink-soft)' }}>
          Termos de uso e condições de venda
        </a>
        <a href="/politica-de-reembolso/" style={{ color: 'var(--lumini-ink-soft)' }}>
          Trocas, devoluções e arrependimento
        </a>
        <a href="/politica-de-privacidade/" style={{ color: 'var(--lumini-ink-soft)' }}>
          Política de privacidade e cookies
        </a>
      </nav>
    </main>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '1.75rem' }}>
      <h2
        style={{
          fontSize: '0.78rem',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: 'var(--lumini-ink-soft)',
          margin: '0 0 0.6rem',
          fontWeight: 600,
        }}
      >
        {titulo}
      </h2>
      {children}
    </section>
  )
}

function Canal({
  href,
  rotulo,
  valor,
  apoio,
  destaque,
}: {
  href: string
  rotulo: string
  valor: string
  apoio: string
  destaque?: boolean
}) {
  return (
    <a
      href={href}
      rel="noopener"
      style={{
        display: 'block',
        padding: '1.1rem 1.15rem',
        borderRadius: 10,
        textDecoration: 'none',
        border: `1px solid ${destaque ? 'var(--lumini-gold)' : 'var(--lumini-line)'}`,
        background: destaque ? 'var(--lumini-cream)' : 'transparent',
        color: 'var(--lumini-ink)',
      }}
    >
      <span
        style={{
          display: 'block',
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: 'var(--lumini-ink-soft)',
          marginBottom: '0.35rem',
        }}
      >
        {rotulo}
      </span>
      <strong style={{ display: 'block', fontSize: '1.05rem', marginBottom: '0.35rem' }}>
        {valor}
      </strong>
      <span style={{ fontSize: '0.85rem', color: 'var(--lumini-ink-soft)', lineHeight: 1.6 }}>
        {apoio}
      </span>
    </a>
  )
}
