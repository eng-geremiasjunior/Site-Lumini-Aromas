// Só roda no servidor.

import { getPayloadClient } from '../../lib/payload.ts'
import { revenueStatuses } from '../orders/statuses.ts'
import {
  mesDe,
  montarDre,
  ultimosMeses,
  type LancamentoParaDre,
  type PedidoParaDre,
  type ResumoDoDre,
} from './dre.ts'
import type { Anexo } from './simples-nacional.ts'
import type { LedgerEntry, Order } from '../../payload-types.ts'

/**
 * Junta o que o DRE precisa e entrega pronto.
 *
 * A regra de ouro: **nada de venda é digitado duas vezes.** Receita, custo
 * do produto, taxa do cartão e desconto saem dos próprios pedidos pagos —
 * inclusive os lançados à mão a partir do WhatsApp, que entram pela mesma
 * porta e por isso aparecem no resultado como qualquer outra venda.
 *
 * O que é digitado à mão é só o que não tem pedido: o anúncio, o aluguel, a
 * assinatura. É essa separação que impede o relatório de contar a mesma
 * coisa duas vezes.
 */

export type DadosDoMes = {
  mes: string
  resumo: ResumoDoDre
  /** O que falta cadastrar para o número ser confiável. */
  lacunas: string[]
}

type FichaDoProduto = { categoria: string | null; anexo: Anexo; custoUnitario: number }

export type ContextoDoDre = {
  rbt12: number
  anexoPadrao: Anexo
  embalagemPadrao: number
  fichaDoProduto: Map<string, FichaDoProduto>
}

/**
 * O que não muda de um mês para o outro.
 *
 * Carregado uma vez e reaproveitado pelos doze meses do gráfico: senão
 * seriam doze leituras idênticas do catálogo para desenhar uma barra.
 */
export async function carregarContexto(): Promise<ContextoDoDre> {
  const payload = await getPayloadClient()

  const settings = (await payload
    .findGlobal({ slug: 'store-settings', depth: 0 })
    .catch(() => null)) as {
    rbt12?: number | null
    anexoPadrao?: string | null
    custoDeEmbalagemPadrao?: number | null
  } | null

  const anexoPadrao: Anexo = settings?.anexoPadrao === 'I' ? 'I' : 'II'

  const { docs: produtos } = await payload.find({
    collection: 'products',
    limit: 500,
    depth: 1,
    overrideAccess: true,
  })

  const fichaDoProduto = new Map<string, FichaDoProduto>()

  for (const produto of produtos) {
    const categoria =
      produto.category && typeof produto.category === 'object'
        ? ((produto.category as { name?: string }).name ?? null)
        : null

    fichaDoProduto.set(String(produto.id), {
      categoria,
      anexo: produto.fiscalAnnex === 'I' ? 'I' : anexoPadrao,
      custoUnitario: produto.unitCost ?? 0,
    })
  }

  return {
    rbt12: Math.round((settings?.rbt12 ?? 0) * 100),
    anexoPadrao,
    embalagemPadrao: Math.round((settings?.custoDeEmbalagemPadrao ?? 0) * 100),
    fichaDoProduto,
  }
}

type Lacunas = { semCusto: number; semTaxa: number; semEmbalagem: number }

function converterPedido(doc: Order, contexto: ContextoDoDre, lacunas: Lacunas): PedidoParaDre {
  const pedido = doc

  const itens = (pedido.items ?? []).map((item) => {
    const idDoProduto =
      item.product && typeof item.product === 'object'
        ? String((item.product as { id: string | number }).id)
        : String(item.product ?? '')

    const ficha = contexto.fichaDoProduto.get(idDoProduto)
    const qtd = item.qty ?? 0

    // O custo gravado no pedido vale mais que o do cadastro: é o custo do
    // dia da venda. Se a cera subiu depois, o mês passado não muda.
    const custoUnitario = item.unitCost ?? ficha?.custoUnitario ?? 0
    if (custoUnitario <= 0) lacunas.semCusto += 1

    return {
      categoria: ficha?.categoria ?? null,
      produto: item.productName ?? '',
      receita: item.lineTotal ?? item.lotPrice ?? 0,
      cmv: custoUnitario * qtd,
      pecas: qtd,
      anexo: ficha?.anexo ?? contexto.anexoPadrao,
    }
  })

  const taxa = pedido.mercadoPago?.feeCents ?? 0
  if (taxa <= 0) lacunas.semTaxa += 1

  const embalagemInformada = pedido.custos?.embalagem ?? 0
  if (embalagemInformada <= 0 && contexto.embalagemPadrao <= 0) lacunas.semEmbalagem += 1

  return {
    numero: String(pedido.number ?? ''),
    pagoEm: String(pedido.datePaid ?? pedido.createdAt ?? ''),
    canal: pedido.channel ?? 'site',
    itens,
    frete: pedido.shippingTotal ?? 0,
    desconto: pedido.discountTotal ?? 0,
    total: pedido.total ?? 0,
    taxaDePagamento: taxa,
    fretePago: pedido.custos?.fretePago ?? 0,
    embalagem: embalagemInformada > 0 ? embalagemInformada : contexto.embalagemPadrao,
    reembolsado: 0,
  }
}

function converterLancamento(doc: LedgerEntry): LancamentoParaDre {
  const lancamento = doc

  const categoria =
    lancamento.categoria && typeof lancamento.categoria === 'object'
      ? (lancamento.categoria as { nome?: string; grupo?: string; plataforma?: string | null })
      : null

  return {
    grupo: (categoria?.grupo ?? 'fixa') as LancamentoParaDre['grupo'],
    categoria: categoria?.nome ?? 'Sem categoria',
    valor: lancamento.valor ?? 0,
    plataforma: categoria?.plataforma ?? null,
  }
}

function avisos(
  lacunas: Lacunas,
  contexto: ContextoDoDre,
  resumo: ResumoDoDre,
  pedidos: number,
): string[] {
  const saida: string[] = []

  if (contexto.rbt12 <= 0) {
    saida.push(
      'O faturamento dos últimos 12 meses não está preenchido nas Configurações, então o imposto está na primeira faixa do Simples — quase certamente menos do que o real.',
    )
  }
  if (lacunas.semCusto > 0) {
    saida.push(
      `${lacunas.semCusto} ${lacunas.semCusto === 1 ? 'item vendido não tem' : 'itens vendidos não têm'} custo de peça cadastrado. O lucro aparece maior do que é.`,
    )
  }
  if (lacunas.semTaxa > 0 && pedidos > 0) {
    saida.push(
      `${lacunas.semTaxa} ${lacunas.semTaxa === 1 ? 'pedido está' : 'pedidos estão'} sem a taxa do meio de pagamento. Ela passa a chegar sozinha quando o Mercado Pago estiver ligado.`,
    )
  }
  if (lacunas.semEmbalagem > 0) {
    saida.push(
      'A embalagem de envio não está sendo contada. Informe o custo médio nas Configurações ou preencha pedido a pedido.',
    )
  }
  if (resumo.marketing <= 0 && pedidos > 0) {
    saida.push(
      'Nenhum investimento em tráfego lançado neste mês. Enquanto ele não entrar, o resultado aparece maior do que é.',
    )
  }

  return saida
}

export async function dreDoMes(mes: string, contextoPronto?: ContextoDoDre): Promise<DadosDoMes> {
  const payload = await getPayloadClient()
  const contexto = contextoPronto ?? (await carregarContexto())
  const [inicio, fim] = intervaloDoMes(mes)

  const { docs: pedidosDoc } = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { status: { in: revenueStatuses() } },
        { datePaid: { greater_than_equal: inicio } },
        { datePaid: { less_than: fim } },
      ],
    },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })

  const { docs: lancamentosDoc } = await payload.find({
    collection: 'ledger-entries',
    where: {
      and: [{ competencia: { greater_than_equal: inicio } }, { competencia: { less_than: fim } }],
    },
    limit: 1000,
    depth: 1,
    overrideAccess: true,
  })

  const lacunas: Lacunas = { semCusto: 0, semTaxa: 0, semEmbalagem: 0 }

  const pedidos = pedidosDoc.map((doc) =>
    converterPedido(doc, contexto, lacunas),
  )
  const lancamentos = lancamentosDoc.map((doc) => converterLancamento(doc))

  const resumo = montarDre({ pedidos, lancamentos, rbt12: contexto.rbt12 })

  return { mes, resumo, lacunas: avisos(lacunas, contexto, resumo, pedidos.length) }
}

/**
 * Os últimos meses, para o gráfico.
 *
 * Duas consultas no total, e não duas por mês: a janela inteira vem de uma
 * vez e é separada por mês aqui. Com o pooler do Supabase, doze consultas
 * paralelas custam mais que a conta que elas evitam.
 */
export async function serieDeMeses(mes: string, quantos = 12): Promise<DadosDoMes[]> {
  const payload = await getPayloadClient()
  const contexto = await carregarContexto()

  const meses = ultimosMeses(mes, quantos)
  const [inicio] = intervaloDoMes(meses[0] as string)
  const [, fim] = intervaloDoMes(mes)

  const { docs: pedidosDoc } = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { status: { in: revenueStatuses() } },
        { datePaid: { greater_than_equal: inicio } },
        { datePaid: { less_than: fim } },
      ],
    },
    limit: 5000,
    depth: 0,
    overrideAccess: true,
  })

  const { docs: lancamentosDoc } = await payload.find({
    collection: 'ledger-entries',
    where: {
      and: [{ competencia: { greater_than_equal: inicio } }, { competencia: { less_than: fim } }],
    },
    limit: 5000,
    depth: 1,
    overrideAccess: true,
  })

  const pedidosPorMes = new Map<string, PedidoParaDre[]>()
  const lancamentosPorMes = new Map<string, LancamentoParaDre[]>()
  const lacunasPorMes = new Map<string, Lacunas>()

  for (const cada of meses) {
    pedidosPorMes.set(cada, [])
    lancamentosPorMes.set(cada, [])
    lacunasPorMes.set(cada, { semCusto: 0, semTaxa: 0, semEmbalagem: 0 })
  }

  for (const doc of pedidosDoc) {
    const quando = String((doc as { datePaid?: string }).datePaid ?? '')
    const mesDoPedido = mesDe(noFusoLocal(quando))
    const balde = pedidosPorMes.get(mesDoPedido)
    if (!balde) continue

    balde.push(
      converterPedido(
        doc,
        contexto,
        lacunasPorMes.get(mesDoPedido) as Lacunas,
      ),
    )
  }

  for (const doc of lancamentosDoc) {
    const quando = String((doc as { competencia?: string }).competencia ?? '')
    const balde = lancamentosPorMes.get(mesDe(noFusoLocal(quando)))
    if (!balde) continue
    balde.push(converterLancamento(doc))
  }

  return meses.map((cada) => {
    const pedidos = pedidosPorMes.get(cada) ?? []
    const lancamentos = lancamentosPorMes.get(cada) ?? []
    const lacunas = lacunasPorMes.get(cada) as Lacunas
    const resumo = montarDre({ pedidos, lancamentos, rbt12: contexto.rbt12 })

    return { mes: cada, resumo, lacunas: avisos(lacunas, contexto, resumo, pedidos.length) }
  })
}

/**
 * A data em Brasília, para decidir a que mês ela pertence.
 *
 * Uma venda do dia 1º às 8h da manhã é gravada como 11h UTC; do dia 31 às
 * 23h, como 02h UTC do dia seguinte. Sem o ajuste, a segunda cairia no mês
 * seguinte e o fechamento nunca bateria com o extrato.
 */
function noFusoLocal(iso: string): string {
  if (!iso) return iso
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return iso
  return new Date(data.getTime() - 3 * 60 * 60 * 1000).toISOString()
}

/** O primeiro instante do mês e o primeiro do mês seguinte, em ISO. */
export function intervaloDoMes(mes: string): [string, string] {
  const [ano, numero] = mes.split('-').map(Number) as [number, number]

  const inicio = new Date(Date.UTC(ano, numero - 1, 1, 3, 0, 0))
  const fim = new Date(Date.UTC(ano, numero, 1, 3, 0, 0))

  return [inicio.toISOString(), fim.toISOString()]
}

/** O mês atual no formato AAAA-MM, no fuso de Brasília. */
export function mesAtual(agora = new Date()): string {
  const brasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000)
  return `${brasilia.getUTCFullYear()}-${String(brasilia.getUTCMonth() + 1).padStart(2, '0')}`
}
