import { RichText } from '@payloadcms/richtext-lexical/react'
import type React from 'react'

import type { Bloco } from '../../../commerce/legal/textos-padrao.ts'
import { getPayloadClient } from '../../../lib/payload.ts'
import type { StoreSetting } from '../../../payload-types.ts'

/**
 * O molde das páginas institucionais.
 *
 * O Decreto 7.962/2013 exige que a loja mostre razão social, CNPJ,
 * endereço físico e eletrônico e contato. O Google Merchant recusa o
 * catálogo de loja sem política de devolução pública e sem contato visível
 * antes do checkout. São obrigações, não enfeite — e é por isso que estas
 * páginas existem antes de a loja abrir, não depois.
 *
 * O texto vem do painel, em Configurações da loja. Quem escreve é o dono,
 * ou o advogado dele; o código só coloca na tela e assina com os dados da
 * empresa. Enquanto o painel estiver vazio, entra o texto padrão de
 * `src/commerce/legal/textos-padrao.ts`, para a loja nunca ficar no ar com
 * uma política em branco.
 */

export type DadosDaEmpresa = {
  razaoSocial: string | null
  nomeFantasia: string | null
  cnpj: string | null
  inscricaoEstadual: string | null
  email: string | null
  whatsapp: string | null
  horario: string | null
  endereco: string | null
  versao: string | null
}

type CampoLegal = 'returnPolicy' | 'termsOfUse' | 'privacyPolicy'
type ConteudoLegal = NonNullable<StoreSetting['returnPolicy']>

async function configuracoes(): Promise<StoreSetting | null> {
  const payload = await getPayloadClient()

  // Loja no ar com banco fora do ar continua tendo de mostrar a política.
  // Sem o catch, uma falha de conexão derrubaria a página inteira.
  return (await payload
    .findGlobal({ slug: 'store-settings', depth: 0, overrideAccess: true })
    .catch(() => null)) as StoreSetting | null
}

function mapear(config: StoreSetting | null): DadosDaEmpresa {
  const endereco = config?.address ?? null

  const linha = endereco
    ? [
        [endereco.street, endereco.number].filter(Boolean).join(', '),
        endereco.complement,
        endereco.district,
        [endereco.city, endereco.state].filter(Boolean).join('/'),
        endereco.postalCode ? `CEP ${endereco.postalCode}` : null,
      ]
        .filter((parte) => parte && parte.length > 0)
        .join(' · ')
    : null

  return {
    razaoSocial: config?.legalName ?? null,
    nomeFantasia: config?.tradeName ?? null,
    cnpj: config?.cnpj ?? null,
    inscricaoEstadual: config?.stateRegistration ?? null,
    email: config?.email ?? null,
    whatsapp: config?.whatsapp ?? null,
    horario: config?.businessHours ?? null,
    endereco: linha && linha.length > 0 ? linha : null,
    versao: config?.legalVersion ?? null,
  }
}

export async function dadosDaEmpresa(): Promise<DadosDaEmpresa> {
  return mapear(await configuracoes())
}

/** Os dados da empresa e o texto da política em uma única ida ao banco. */
export async function paginaDoPainel(campo: CampoLegal): Promise<{
  empresa: DadosDaEmpresa
  conteudo: ConteudoLegal | null
}> {
  const config = await configuracoes()

  return {
    empresa: mapear(config),
    conteudo: (config?.[campo] as ConteudoLegal | null | undefined) ?? null,
  }
}

export function PaginaLegal({
  titulo,
  resumo,
  conteudo,
  padrao,
  empresa,
  children,
}: {
  titulo: string
  resumo?: string
  conteudo?: ConteudoLegal | null
  padrao?: readonly Bloco[]
  empresa: DadosDaEmpresa
  children?: React.ReactNode
}) {
  return (
    <main style={{ maxWidth: '44rem', margin: '0 auto', padding: '3.5rem 1.5rem 5rem' }}>
      <nav style={{ fontSize: '0.85rem', color: 'var(--lumini-ink-soft)', marginBottom: '2rem' }}>
        <a href="/" style={{ color: 'var(--lumini-ink-soft)' }}>
          Início
        </a>{' '}
        <span aria-hidden="true">›</span> {titulo}
      </nav>

      <h1 style={{ fontSize: 'clamp(1.7rem, 3.5vw, 2.3rem)', marginBottom: '0.5rem' }}>{titulo}</h1>

      {resumo && (
        <p style={{ color: 'var(--lumini-ink-soft)', fontSize: '1.02rem', lineHeight: 1.7 }}>
          {resumo}
        </p>
      )}

      <div style={{ marginTop: '2.5rem' }}>
        {conteudo ? <RichText data={conteudo} /> : padrao ? <Blocos blocos={padrao} /> : children}
      </div>

      <Assinatura empresa={empresa} />
      <OutrasPaginas atual={titulo} />
    </main>
  )
}

/** O texto padrão na tela, com a mesma aparência do que vem do painel. */
export function Blocos({ blocos }: { blocos: readonly Bloco[] }) {
  return (
    <>
      {blocos.map((bloco, i) => {
        if (bloco.tipo === 'titulo') {
          return (
            <h2
              key={i}
              style={{
                fontSize: '1.12rem',
                fontWeight: 600,
                margin: '2.25rem 0 0.75rem',
                letterSpacing: '-0.01em',
              }}
            >
              {bloco.texto}
            </h2>
          )
        }

        if (bloco.tipo === 'lista') {
          return (
            <ul key={i} style={{ paddingLeft: '1.15rem', margin: '0 0 1rem' }}>
              {bloco.itens.map((item, j) => (
                <li key={j} style={{ lineHeight: 1.75, marginBottom: '0.4rem' }}>
                  {item}
                </li>
              ))}
            </ul>
          )
        }

        return (
          <p key={i} style={{ lineHeight: 1.78, margin: '0 0 1rem' }}>
            {bloco.texto}
          </p>
        )
      })}
    </>
  )
}

/**
 * O rodapé de identificação.
 *
 * Repetido em todas as páginas institucionais de propósito: a exigência
 * legal é que o consumidor encontre quem está vendendo sem precisar
 * procurar, e quem chega por um link direto cai em uma página só.
 */
export function Assinatura({ empresa }: { empresa: DadosDaEmpresa }) {
  return (
    <footer
      style={{
        marginTop: '3.5rem',
        paddingTop: '1.5rem',
        borderTop: '1px solid var(--lumini-line)',
        fontSize: '0.86rem',
        color: 'var(--lumini-ink-soft)',
        lineHeight: 1.85,
      }}
    >
      {empresa.razaoSocial && (
        <div>
          <strong>{empresa.razaoSocial}</strong>
          {empresa.nomeFantasia && empresa.nomeFantasia !== empresa.razaoSocial
            ? ` (${empresa.nomeFantasia})`
            : ''}
        </div>
      )}
      {empresa.cnpj && <div>CNPJ {empresa.cnpj}</div>}
      {empresa.inscricaoEstadual && <div>Inscrição estadual {empresa.inscricaoEstadual}</div>}
      {empresa.endereco && <div>{empresa.endereco}</div>}
      {empresa.email && (
        <div>
          <a href={`mailto:${empresa.email}`} style={{ color: 'var(--lumini-gold)' }}>
            {empresa.email}
          </a>
        </div>
      )}
      {empresa.whatsapp && (
        <div>
          <a
            href={`https://wa.me/${empresa.whatsapp}`}
            style={{ color: 'var(--lumini-gold)' }}
            rel="noopener"
          >
            WhatsApp {formatarWhatsapp(empresa.whatsapp)}
          </a>
        </div>
      )}
      {empresa.horario && <div>{empresa.horario}</div>}
      {empresa.versao && (
        <div style={{ marginTop: '0.9rem', fontSize: '0.8rem' }}>
          Versão {empresa.versao} destas condições. A versão aceita no seu pedido fica guardada
          junto dele.
        </div>
      )}
    </footer>
  )
}

const INSTITUCIONAIS = [
  { titulo: 'Contato', href: '/contato/' },
  { titulo: 'Termos de uso e condições de venda', href: '/termos-de-uso/' },
  { titulo: 'Trocas, devoluções e arrependimento', href: '/politica-de-reembolso/' },
  { titulo: 'Política de privacidade e cookies', href: '/politica-de-privacidade/' },
]

function OutrasPaginas({ atual }: { atual: string }) {
  const outras = INSTITUCIONAIS.filter((p) => p.titulo !== atual)
  if (outras.length === 0) return null

  return (
    <nav
      style={{
        marginTop: '2rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.4rem 1.25rem',
        fontSize: '0.85rem',
      }}
    >
      {outras.map((p) => (
        <a key={p.href} href={p.href} style={{ color: 'var(--lumini-ink-soft)' }}>
          {p.titulo}
        </a>
      ))}
    </nav>
  )
}

/** `5533999478774` vira `(33) 99947-8774`, que é como se lê um telefone. */
export function formatarWhatsapp(numero: string): string {
  const digitos = numero.replace(/\D/g, '').replace(/^55/, '')
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
  }
  return numero
}
