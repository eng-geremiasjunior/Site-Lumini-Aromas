/**
 * Situações do pedido e as regras de transição entre elas.
 *
 * Cada situação carrega o que a operação precisa saber: se o dinheiro
 * entrou, se conta como receita no DRE, se o cliente enxerga, e se o envio
 * está liberado. No WooCommerce isso ficava espalhado em filtros e ganchos,
 * e era fácil um status novo não aparecer no relatório. Aqui está tudo em
 * um lugar só, e testado.
 */

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'art_approval'
  | 'production'
  | 'shipped'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed'
  | 'disputed'

export type StatusDefinition = {
  key: OrderStatus
  /** Nome mostrado no painel e ao cliente. */
  label: string
  /** Explicação curta, para o dono não precisar decorar o que cada um faz. */
  description: string
  /** O dinheiro entrou. */
  isPaid: boolean
  /** Entra no faturamento do DRE. */
  countsInRevenue: boolean
  /** O cliente vê na área dele. */
  visibleToCustomer: boolean
  /** O cliente pode cancelar sozinho. */
  allowsCustomerCancel: boolean
  /** A equipe ainda pode mexer nos itens. */
  allowsEditItems: boolean
  /** Bloqueia a compra de etiqueta e o despacho. */
  blocksShipping: boolean
  /** Cor usada na lista de pedidos. */
  color: string
}

export const ORDER_STATUSES: Record<OrderStatus, StatusDefinition> = {
  pending: {
    key: 'pending',
    label: 'Aguardando pagamento',
    description: 'Pedido feito, pagamento ainda não confirmado. Nada é produzido nesta fase.',
    isPaid: false,
    countsInRevenue: false,
    visibleToCustomer: true,
    allowsCustomerCancel: true,
    allowsEditItems: true,
    blocksShipping: true,
    color: '#9a8f80',
  },
  processing: {
    key: 'processing',
    label: 'Pagamento confirmado',
    description: 'O dinheiro entrou. O pedido está na fila para começar a produção.',
    isPaid: true,
    countsInRevenue: true,
    visibleToCustomer: true,
    allowsCustomerCancel: true,
    allowsEditItems: true,
    blocksShipping: true,
    color: '#3f7d5c',
  },
  art_approval: {
    key: 'art_approval',
    label: 'Arte em aprovação',
    description:
      'A prova do rótulo foi enviada e aguarda o cliente aprovar. A produção só começa depois disso.',
    isPaid: true,
    countsInRevenue: true,
    visibleToCustomer: true,
    allowsCustomerCancel: true,
    allowsEditItems: true,
    blocksShipping: true,
    color: '#b08d57',
  },
  production: {
    key: 'production',
    label: 'Produção artesanal',
    description: 'As peças estão sendo feitas à mão.',
    isPaid: true,
    countsInRevenue: true,
    visibleToCustomer: true,
    allowsCustomerCancel: false,
    allowsEditItems: false,
    blocksShipping: true,
    color: '#8a6d3b',
  },
  shipped: {
    key: 'shipped',
    label: 'Pedido enviado',
    description: 'Despachado, com código de rastreio.',
    isPaid: true,
    countsInRevenue: true,
    visibleToCustomer: true,
    allowsCustomerCancel: false,
    allowsEditItems: false,
    blocksShipping: false,
    color: '#2f6f9f',
  },
  completed: {
    key: 'completed',
    label: 'Concluído',
    description: 'Entregue ao cliente.',
    isPaid: true,
    countsInRevenue: true,
    visibleToCustomer: true,
    allowsCustomerCancel: false,
    allowsEditItems: false,
    blocksShipping: false,
    color: '#2a5d2a',
  },
  cancelled: {
    key: 'cancelled',
    label: 'Cancelado',
    description: 'Cancelado antes de ser pago ou produzido.',
    isPaid: false,
    countsInRevenue: false,
    visibleToCustomer: true,
    allowsCustomerCancel: false,
    allowsEditItems: false,
    blocksShipping: true,
    color: '#8a8a8a',
  },
  refunded: {
    key: 'refunded',
    label: 'Reembolsado',
    description: 'O valor foi devolvido ao cliente.',
    isPaid: false,
    countsInRevenue: false,
    visibleToCustomer: true,
    allowsCustomerCancel: false,
    allowsEditItems: false,
    blocksShipping: true,
    color: '#8a5a5a',
  },
  failed: {
    key: 'failed',
    label: 'Malsucedido',
    description: 'O pagamento foi recusado ou expirou.',
    isPaid: false,
    countsInRevenue: false,
    visibleToCustomer: true,
    allowsCustomerCancel: false,
    allowsEditItems: true,
    blocksShipping: true,
    color: '#a33',
  },
  disputed: {
    key: 'disputed',
    label: 'Em disputa',
    description:
      'O cliente contestou a cobrança no cartão ou abriu reclamação. Não despache até resolver.',
    isPaid: false,
    countsInRevenue: false,
    visibleToCustomer: false,
    allowsCustomerCancel: false,
    allowsEditItems: false,
    blocksShipping: true,
    color: '#8a2a2a',
  },
}

export const ORDER_STATUS_OPTIONS = Object.values(ORDER_STATUSES).map((status) => ({
  label: status.label,
  value: status.key,
}))

/**
 * Para onde cada situação pode ir.
 *
 * Existe para impedir salto que não faz sentido, como mandar para
 * "enviado" um pedido que ainda não foi pago.
 */
const TRANSICOES: Record<OrderStatus, OrderStatus[]> = {
  pending: ['processing', 'cancelled', 'failed'],
  processing: ['art_approval', 'production', 'cancelled', 'refunded', 'disputed'],
  art_approval: ['production', 'cancelled', 'refunded', 'disputed'],
  production: ['shipped', 'cancelled', 'refunded', 'disputed'],
  shipped: ['completed', 'refunded', 'disputed'],
  completed: ['refunded', 'disputed'],
  cancelled: ['pending'],
  refunded: [],
  failed: ['pending', 'processing', 'cancelled'],
  disputed: ['processing', 'refunded', 'cancelled'],
}

export type TransitionContext = {
  /** O pedido tem peça com arte a aprovar. */
  requiresArtApproval?: boolean
  /** A arte já foi aprovada pelo cliente. */
  artApprovedAt?: string | null
  /** A nota fiscal já saiu, quando a loja emite. */
  invoiceIssued?: boolean
  /** A loja exige nota antes de despachar. */
  requiresInvoice?: boolean
}

export type TransitionResult = { ok: true } | { ok: false; motivo: string }

/** Diz se a mudança de situação é permitida, e por que não, quando não é. */
export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  contexto: TransitionContext = {},
): TransitionResult {
  if (from === to) return { ok: true }

  if (!TRANSICOES[from]?.includes(to)) {
    return {
      ok: false,
      motivo: `Um pedido em "${ORDER_STATUSES[from].label}" não pode ir direto para "${ORDER_STATUSES[to].label}".`,
    }
  }

  // Não se produz peça personalizada antes de o cliente aprovar a arte.
  // É a proteção contra refazer um lote inteiro por causa de um nome errado.
  if (to === 'production' && contexto.requiresArtApproval && !contexto.artApprovedAt) {
    return {
      ok: false,
      motivo: 'A arte precisa ser aprovada pelo cliente antes de começar a produção.',
    }
  }

  if (to === 'shipped' && contexto.requiresInvoice && !contexto.invoiceIssued) {
    return {
      ok: false,
      motivo: 'Emita a nota fiscal antes de despachar.',
    }
  }

  return { ok: true }
}

/** Situações que contam como faturamento no DRE. */
export function revenueStatuses(): OrderStatus[] {
  return Object.values(ORDER_STATUSES)
    .filter((status) => status.countsInRevenue)
    .map((status) => status.key)
}

/** Situações em que o dinheiro entrou. */
export function paidStatuses(): OrderStatus[] {
  return Object.values(ORDER_STATUSES)
    .filter((status) => status.isPaid)
    .map((status) => status.key)
}

/** Próximo passo natural, usado no botão de ação rápida da lista de pedidos. */
export function nextStatus(from: OrderStatus, contexto: TransitionContext = {}): OrderStatus | null {
  const caminho: Partial<Record<OrderStatus, OrderStatus>> = {
    pending: 'processing',
    processing: contexto.requiresArtApproval ? 'art_approval' : 'production',
    art_approval: 'production',
    production: 'shipped',
    shipped: 'completed',
  }

  const proximo = caminho[from]
  if (!proximo) return null
  return canTransition(from, proximo, contexto).ok ? proximo : null
}
