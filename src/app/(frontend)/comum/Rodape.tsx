import { dadosDaEmpresa, formatarWhatsapp } from '../../../commerce/store/configuracoes.ts'
import { Eyebrow, Selo, Wordmark } from './pecas.tsx'

/**
 * O rodapé.
 *
 * É a única superfície grande em verde escuro que o design system
 * autoriza — e justamente porque nenhuma foto de produto fica aqui: área
 * escura ao lado de terracota puxa a foto para um outono que mata o rosa
 * envelhecido das peças.
 *
 * Os dados da empresa vêm do painel, não do código: razão social, CNPJ,
 * endereço e contato são exigência do Decreto 7.962 e precisam poder ser
 * corrigidos sem publicação.
 */
export async function Rodape() {
  const empresa = await dadosDaEmpresa()

  const linkDoWhatsapp = empresa.whatsapp
    ? `https://wa.me/${empresa.whatsapp}?text=${encodeURIComponent('Olá! Vim pelo site da Lumini Aromas e gostaria de um orçamento.')}`
    : null

  return (
    <footer
      style={{
        background: 'var(--surface-dark)',
        color: 'var(--text-on-dark)',
        marginTop: 'var(--section-y)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--container)',
          margin: '0 auto',
          padding: 'clamp(56px, 8vw, 96px) 24px 48px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '48px',
        }}
      >
        <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Selo tamanho={44} />
            <Wordmark tamanho="lg" tom="light" />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: 'var(--sage-200)',
              maxWidth: '26em',
              lineHeight: 1.7,
            }}
          >
            Lembrancinhas montadas à mão para casamentos, 15 anos e eventos. Cada pedido é produzido
            do zero para uma data.
          </p>
        </div>

        <Coluna titulo="Navegar">
          <Link href="/?ocasiao=Todas#vitrine">Peças</Link>
          <Link href="/#ocasioes">Ocasiões</Link>
          <Link href="/minhaconta/">Minha conta</Link>
          <Link href="/meucarrinho/">Sacola</Link>
        </Coluna>

        <Coluna titulo="Conversar">
          {linkDoWhatsapp && empresa.whatsapp && (
            <Link href={linkDoWhatsapp} externo>
              WhatsApp · {formatarWhatsapp(empresa.whatsapp)}
            </Link>
          )}
          {empresa.email && <Link href={`mailto:${empresa.email}`}>{empresa.email}</Link>}
          <Texto>Instagram · @luminiaromas</Texto>
          {empresa.cidade && <Texto>{empresa.cidade} · atendemos todo o Brasil</Texto>}
          {empresa.horario && <Texto>{empresa.horario}</Texto>}
        </Coluna>

        <Coluna titulo="A loja">
          <Link href="/contato/">Contato</Link>
          <Link href="/termos-de-uso/">Termos de uso</Link>
          <Link href="/politica-de-reembolso/">Trocas e devoluções</Link>
          <Link href="/politica-de-privacidade/">Privacidade</Link>
        </Coluna>
      </div>

      <div style={{ maxWidth: 'var(--container)', margin: '0 auto', padding: '0 24px 48px' }}>
        <div style={{ height: 1, background: 'rgba(248,249,246,.18)' }} />
        <div
          style={{
            paddingTop: 24,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px 32px',
            justifyContent: 'space-between',
            fontSize: 13,
            color: 'var(--sage-200)',
            lineHeight: 1.7,
          }}
        >
          <span>
            © {new Date().getFullYear()} {empresa.razaoSocial ?? 'Lumini Aromas'}
            {empresa.cnpj ? ` · CNPJ ${empresa.cnpj}` : ''}
          </span>
          <span>
            Pedido mínimo de {empresa.pedidoMinimo} peças · Produção artesanal sob encomenda
          </span>
        </div>
        {empresa.endereco && (
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--sage-200)' }}>
            {empresa.endereco}
          </div>
        )}
      </div>
    </footer>
  )
}

function Coluna({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
      <Eyebrow tom="light" style={{ marginBottom: 4 }}>
        {titulo}
      </Eyebrow>
      {children}
    </div>
  )
}

function Link({
  href,
  children,
  externo = false,
}: {
  href: string
  children: React.ReactNode
  externo?: boolean
}) {
  return (
    <a
      href={href}
      className="lumini-link-rodape"
      style={{
        fontSize: 14,
        color: 'var(--sage-200)',
        textDecoration: 'none',
        width: 'fit-content',
        transition: 'color var(--dur-fast) var(--ease-standard)',
      }}
      {...(externo ? { target: '_blank', rel: 'noopener' } : {})}
    >
      {children}
    </a>
  )
}

function Texto({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 14, color: 'var(--sage-200)' }}>{children}</span>
}
