import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'

import { formatarReais } from '../../commerce/format/mascaras.ts'
import { ORDER_STATUSES, type OrderStatus } from '../../commerce/orders/statuses.ts'
import { getPayloadClient } from '../../lib/payload.ts'

/**
 * Quem está comprando.
 *
 * O painel de pedidos mostra o que já aconteceu. Esta tela mostra o que
 * está acontecendo: quem abriu a loja agora, o que está montando, quanto
 * já somou no carrinho e há quanto tempo parou.
 *
 * Para uma loja de ticket alto, essa é a janela mais valiosa que existe.
 * Um carrinho de R$ 2.400 parado há vinte minutos é uma mensagem no
 * WhatsApp, não um relatório no fim do mês — e é por isso que cada linha
 * aqui termina num botão de conversa, e não num botão de editar.
 *
 * ## O que "agora" significa aqui, com honestidade
 *
 * Não existe presença de verdade: o site não manda sinal de vida contínuo.
 * O que existe é o último gesto — adicionar item, mudar quantidade, enviar
 * a logo. Quem está lendo a página de um produto há dez minutos sem tocar
 * em nada aparece como parado. Por isso a coluna se chama "último sinal",
 * e não "online".
 */

const MINUTOS_ATIVO = 15

type Grupo = 'agora' | 'parados' | 'pedido' | 'todos'

export async function Clientes(props: AdminViewServerProps) {
  const busca = props.searchParams ?? {}
  const grupo: Grupo = (['agora', 'parados', 'pedido', 'todos'] as const).includes(
    busca.grupo as Grupo,
  )
    ? (busca.grupo as Grupo)
    : 'agora'

  const dados = await carregar()
  const linhas = dados[grupo]

  const abas: Array<{ chave: Grupo; rotulo: string; quantas: number }> = [
    { chave: 'agora', rotulo: 'Mexendo agora', quantas: dados.agora.length },
    { chave: 'parados', rotulo: 'Carrinho parado', quantas: dados.parados.length },
    { chave: 'pedido', rotulo: 'Com pedido aberto', quantas: dados.pedido.length },
    { chave: 'todos', rotulo: 'Todos os clientes', quantas: dados.todos.length },
  ]

  return (
    <DefaultTemplate
      i18n={props.initPageResult.req.i18n}
      locale={props.initPageResult.locale}
      params={props.params}
      payload={props.initPageResult.req.payload}
      permissions={props.initPageResult.permissions}
      searchParams={props.searchParams}
      user={props.initPageResult.req.user ?? undefined}
      visibleEntities={props.initPageResult.visibleEntities}
    >
      <Gutter>
        <header style={{ marginBottom: '1.25rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em' }}>
            Clientes
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: 13, color: 'var(--theme-elevation-500)' }}>
            Quem está montando um pedido agora, o que já somou e há quanto tempo parou.
          </p>
        </header>

        {/* ------------------------------------------------------------ abas */}
        <nav
          style={{
            display: 'flex',
            gap: 2,
            padding: 3,
            marginBottom: '1.1rem',
            background: 'var(--theme-elevation-100)',
            borderRadius: 8,
            width: 'fit-content',
            maxWidth: '100%',
            overflowX: 'auto',
          }}
        >
          {abas.map((aba) => {
            const ativa = aba.chave === grupo

            return (
              <a
                key={aba.chave}
                href={`/admin/clientes?grupo=${aba.chave}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: 6,
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                  background: ativa ? 'var(--theme-elevation-0)' : 'transparent',
                  color: ativa ? 'var(--theme-elevation-900)' : 'var(--theme-elevation-600)',
                  boxShadow: ativa ? '0 1px 2px rgb(0 0 0 / 8%)' : 'none',
                  fontWeight: ativa ? 600 : 400,
                }}
              >
                {aba.rotulo}
                <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--theme-elevation-450)' }}>
                  {aba.quantas}
                </span>
              </a>
            )
          })}
        </nav>

        {linhas.length === 0 ? (
          <p
            style={{
              padding: '2.5rem 1rem',
              textAlign: 'center',
              color: 'var(--theme-elevation-500)',
              fontSize: 13,
              border: '1px dashed var(--theme-border-color)',
              borderRadius: 8,
            }}
          >
            {vazio(grupo)}
          </p>
        ) : (
          <div style={{ border: '1px solid var(--theme-border-color)', borderRadius: 8, overflow: 'hidden' }}>
            {linhas.map((linha, i) => (
              <article
                key={linha.chave}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(13rem, 1.3fr) minmax(14rem, 1.6fr) 9rem 7rem',
                  gap: '1rem',
                  alignItems: 'center',
                  padding: '0.85rem 1rem',
                  background: 'var(--theme-elevation-0)',
                  borderTop: i === 0 ? 'none' : '1px solid var(--theme-border-color)',
                }}
              >
                {/* ------------------------------------------------- quem é */}
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      aria-hidden="true"
                      title={linha.ativo ? 'Mexeu nos últimos 15 minutos' : 'Parado'}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        flex: '0 0 7px',
                        background: linha.ativo ? 'var(--lumini-ok)' : 'var(--theme-elevation-300)',
                      }}
                    />
                    {linha.nome}
                  </p>
                  <p style={{ margin: '0.15rem 0 0 1rem', fontSize: 12, color: 'var(--theme-elevation-500)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {[linha.email, linha.telefone].filter(Boolean).join(' · ') || 'sem contato informado'}
                  </p>
                </div>

                {/* ------------------------------------------- o que monta */}
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--theme-elevation-800)' }}>
                    {linha.montando}
                  </p>
                  {linha.detalhe && (
                    <p style={{ margin: '0.15rem 0 0', fontSize: 12, color: 'var(--theme-elevation-500)' }}>
                      {linha.detalhe}
                    </p>
                  )}
                </div>

                {/* ------------------------------------------------ situação */}
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {linha.valor > 0 ? formatarReais(linha.valor) : '—'}
                  </p>
                  <p style={{ margin: '0.15rem 0 0', fontSize: 12, color: 'var(--theme-elevation-500)' }}>
                    {linha.quando}
                  </p>
                </div>

                {/* --------------------------------------------------- ação */}
                <div style={{ textAlign: 'right' }}>
                  {linha.whatsapp ? (
                    <a
                      href={linha.whatsapp}
                      target="_blank"
                      rel="noopener"
                      style={{
                        display: 'inline-block',
                        padding: '0.4rem 0.8rem',
                        borderRadius: 6,
                        border: '1px solid var(--theme-border-color)',
                        fontSize: 12.5,
                        textDecoration: 'none',
                        color: 'var(--theme-elevation-700)',
                      }}
                    >
                      Conversar
                    </a>
                  ) : (
                    <a
                      href={linha.link}
                      style={{ fontSize: 12.5, color: 'var(--theme-elevation-500)', textDecoration: 'none' }}
                    >
                      Abrir
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <p style={{ marginTop: '0.9rem', fontSize: 12, color: 'var(--theme-elevation-450)' }}>
          O ponto verde quer dizer que a pessoa mexeu no carrinho nos últimos {MINUTOS_ATIVO}{' '}
          minutos. Quem está só lendo a página de um produto não emite sinal — para isso seria
          preciso um aviso contínuo do site, que hoje não existe.
        </p>
      </Gutter>
    </DefaultTemplate>
  )
}

function vazio(grupo: Grupo): string {
  if (grupo === 'agora') return 'Ninguém montando pedido neste momento.'
  if (grupo === 'parados') return 'Nenhum carrinho parado. Tudo foi fechado ou nunca começou.'
  if (grupo === 'pedido') return 'Nenhum pedido em aberto.'
  return 'Nenhum cliente cadastrado ainda.'
}

type Linha = {
  chave: string
  nome: string
  email: string | null
  telefone: string | null
  montando: string
  detalhe: string | null
  valor: number
  quando: string
  ativo: boolean
  whatsapp: string | null
  link: string
}

async function carregar(): Promise<Record<Grupo, Linha[]>> {
  const payload = await getPayloadClient()
  const agora = Date.now()
  const corte = agora - MINUTOS_ATIVO * 60 * 1000

  const [carrinhos, pedidos, clientes] = await Promise.all([
    payload
      .find({
        collection: 'carts',
        where: { status: { in: ['active', 'abandoned'] } },
        limit: 100,
        depth: 1,
        sort: '-lastActivityAt',
        overrideAccess: true,
      })
      .catch(() => ({ docs: [] as Array<Record<string, unknown>> })),
    payload
      .find({
        collection: 'orders',
        where: { status: { in: ['pending', 'processing', 'art_approval', 'production', 'shipped'] } },
        limit: 100,
        depth: 0,
        sort: '-createdAt',
        overrideAccess: true,
      })
      .catch(() => ({ docs: [] as Array<Record<string, unknown>> })),
    payload
      .find({ collection: 'customers', limit: 200, depth: 0, sort: '-createdAt', overrideAccess: true })
      .catch(() => ({ docs: [] as Array<Record<string, unknown>> })),
  ])

  const deCarrinho: Linha[] = (carrinhos.docs as Array<Record<string, unknown>>).map((bruto) => {
    const carrinho = bruto as {
      id: string | number
      customerName?: string | null
      contato?: { email?: string | null; phone?: string | null } | null
      items?: Array<Record<string, unknown>> | null
      lastActivityAt?: string | null
      updatedAt?: string
      status?: string
    }

    const itens = carrinho.items ?? []
    const pecas = itens.reduce((soma, i) => soma + Number((i as { qty?: number }).qty ?? 0), 0)
    const quando = carrinho.lastActivityAt ?? carrinho.updatedAt ?? null
    const ativo = quando ? new Date(quando).getTime() >= corte : false
    const telefone = carrinho.contato?.phone ?? null

    const primeiro = itens[0] as { product?: unknown; variantKey?: string | null; qty?: number } | undefined
    const nomeDoProduto =
      primeiro?.product && typeof primeiro.product === 'object'
        ? ((primeiro.product as { name?: string }).name ?? 'produto')
        : 'produto'

    return {
      chave: `carrinho-${carrinho.id}`,
      nome: carrinho.customerName?.trim() || 'Visitante sem nome',
      email: carrinho.contato?.email ?? null,
      telefone,
      montando:
        itens.length === 0
          ? 'Carrinho vazio'
          : `${nomeDoProduto}${primeiro?.variantKey ? ` · ${primeiro.variantKey}` : ''}`,
      detalhe:
        itens.length > 1
          ? `${pecas} peças em ${itens.length} itens`
          : pecas > 0
            ? `${pecas} peças`
            : null,
      valor: somaDoCarrinho(itens),
      quando: desde(quando),
      ativo,
      whatsapp: linkDoWhatsapp(telefone, carrinho.customerName),
      link: `/admin/collections/carts/${carrinho.id}`,
    }
  })

  const comPedido: Linha[] = (pedidos.docs as Array<Record<string, unknown>>).map((bruto) => {
    const pedido = bruto as {
      id: string | number
      number?: string
      customerName?: string
      email?: string | null
      phone?: string | null
      status?: string
      total?: number
      createdAt?: string
      items?: Array<{ productName?: string; qty?: number }> | null
    }

    const itens = pedido.items ?? []
    const pecas = itens.reduce((soma, i) => soma + Number(i.qty ?? 0), 0)

    return {
      chave: `pedido-${pedido.id}`,
      nome: pedido.customerName ?? 'Sem nome',
      email: pedido.email ?? null,
      telefone: pedido.phone ?? null,
      montando: `Pedido ${pedido.number ?? ''} · ${ORDER_STATUSES[pedido.status as OrderStatus]?.label ?? pedido.status}`,
      detalhe: itens.length > 0 ? `${itens[0]?.productName ?? ''} · ${pecas} peças` : null,
      valor: pedido.total ?? 0,
      quando: desde(pedido.createdAt ?? null),
      ativo: false,
      whatsapp: linkDoWhatsapp(pedido.phone ?? null, pedido.customerName),
      link: `/admin/collections/orders/${pedido.id}`,
    }
  })

  const todos: Linha[] = (clientes.docs as Array<Record<string, unknown>>).map((bruto) => {
    const cliente = bruto as {
      id: string | number
      name?: string
      email?: string
      phone?: string | null
      createdAt?: string
    }

    return {
      chave: `cliente-${cliente.id}`,
      nome: cliente.name ?? cliente.email ?? 'Sem nome',
      email: cliente.email ?? null,
      telefone: cliente.phone ?? null,
      montando: 'Cadastro de cliente',
      detalhe: null,
      valor: 0,
      quando: desde(cliente.createdAt ?? null),
      ativo: false,
      whatsapp: linkDoWhatsapp(cliente.phone ?? null, cliente.name),
      link: `/admin/collections/customers/${cliente.id}`,
    }
  })

  return {
    agora: deCarrinho.filter((l) => l.ativo),
    parados: deCarrinho.filter((l) => !l.ativo),
    pedido: comPedido,
    todos,
  }
}

function somaDoCarrinho(itens: Array<Record<string, unknown>>): number {
  // O valor do carrinho é recalculado no servidor a cada leitura, então o
  // que está gravado na linha é só a quantidade. Aqui mostra-se o que dá
  // para afirmar sem recalcular: zero quando não há preço gravado.
  return itens.reduce((soma, item) => {
    const linha = item as { lotPrice?: number; total?: number }
    return soma + Number(linha.total ?? linha.lotPrice ?? 0)
  }, 0)
}

function linkDoWhatsapp(telefone: string | null, nome?: string | null): string | null {
  const digitos = (telefone ?? '').replace(/\D/g, '')
  if (digitos.length < 10) return null

  const numero = digitos.startsWith('55') ? digitos : `55${digitos}`
  const texto = encodeURIComponent(
    `Olá${nome ? `, ${String(nome).split(' ')[0]}` : ''}! Vi que você estava montando um pedido na Lumini Aromas. Posso ajudar a fechar?`,
  )

  return `https://wa.me/${numero}?text=${texto}`
}

/** "há 3 minutos", "há 2 horas", "ontem". */
function desde(iso: string | null): string {
  if (!iso) return 'sem registro'

  const quando = new Date(iso).getTime()
  if (Number.isNaN(quando)) return 'sem registro'

  const minutos = Math.round((Date.now() - quando) / 60000)

  if (minutos < 1) return 'agora mesmo'
  if (minutos < 60) return `há ${minutos} min`

  const horas = Math.round(minutos / 60)
  if (horas < 24) return `há ${horas} h`

  const dias = Math.round(horas / 24)
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`

  return new Date(iso).toLocaleDateString('pt-BR')
}

export default Clientes
