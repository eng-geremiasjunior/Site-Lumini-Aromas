/**
 * Tradução do estado do pagamento no Mercado Pago para o estado do pedido.
 *
 * O Mercado Pago tem nove estados e dezenas de motivos de recusa. A loja
 * trabalha com um conjunto pequeno e legível, e cada estado carrega o que
 * a operação precisa saber: se o dinheiro entrou, se o pedido pode ser
 * produzido e se o envio fica bloqueado.
 */

export type OrderStatusKey =
  | 'pending'
  | 'processing'
  | 'production'
  | 'shipped'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed'
  | 'disputed'

export type PaymentStatus =
  | 'pending'
  | 'approved'
  | 'authorized'
  | 'in_process'
  | 'in_mediation'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back'
  | (string & {})

export type PaymentMapping = {
  orderStatus: OrderStatusKey
  /** O dinheiro entrou: conta como receita no DRE. */
  paid: boolean
  /** Envio bloqueado, mesmo que o pedido já esteja pronto. */
  blocksShipping: boolean
  /** Texto mostrado ao cliente. */
  customerMessage: string
  /** Texto registrado no histórico do pedido, para a equipe. */
  internalNote: string
}

/**
 * Mensagens das recusas mais comuns de cartão.
 * Traduzir importa: "cc_rejected_call_for_authorize" não diz nada ao cliente,
 * e a venda se perde quando bastava ele ligar para o banco.
 */
const REJECTION_MESSAGES: Record<string, string> = {
  cc_rejected_bad_filled_card_number: 'Confira o número do cartão.',
  cc_rejected_bad_filled_date: 'Confira a data de validade do cartão.',
  cc_rejected_bad_filled_security_code: 'Confira o código de segurança do cartão.',
  cc_rejected_bad_filled_other: 'Confira os dados do cartão.',
  cc_rejected_call_for_authorize: 'Ligue para o seu banco e autorize o valor desta compra.',
  cc_rejected_card_disabled: 'Ligue para o seu banco e ative o cartão.',
  cc_rejected_insufficient_amount: 'O cartão não tem limite suficiente para esta compra.',
  cc_rejected_invalid_installments: 'Este cartão não aceita esse número de parcelas.',
  cc_rejected_max_attempts: 'Muitas tentativas com este cartão. Use outro cartão ou pague com Pix.',
  cc_rejected_duplicated_payment: 'Este pagamento já foi feito. Confira antes de tentar de novo.',
  cc_rejected_high_risk: 'O pagamento não foi aprovado. Tente com Pix ou outro cartão.',
  cc_rejected_blacklist: 'O pagamento não foi aprovado. Tente com Pix ou outro cartão.',
  cc_rejected_card_error: 'Não foi possível processar o cartão. Tente novamente.',
  cc_rejected_3ds_challenge: 'A verificação do banco não foi concluída. Tente novamente.',
  rejected_by_bank: 'O banco não autorizou a compra.',
  bank_error: 'O banco não respondeu. Tente novamente em alguns minutos.',
  insufficient_amount: 'O valor disponível não cobre esta compra.',
}

export function rejectionMessage(statusDetail?: string | null): string {
  if (!statusDetail) return 'O pagamento não foi aprovado.'
  return REJECTION_MESSAGES[statusDetail] ?? 'O pagamento não foi aprovado. Tente outra forma de pagamento.'
}

export function mapPaymentStatus(
  status: PaymentStatus,
  statusDetail?: string | null,
): PaymentMapping {
  switch (status) {
    case 'approved':
      return {
        orderStatus: 'processing',
        paid: true,
        blocksShipping: false,
        customerMessage: 'Pagamento confirmado. Seu pedido entrou na fila de produção.',
        internalNote: 'Pagamento aprovado no Mercado Pago.',
      }

    case 'authorized':
      // Valor reservado no cartão, ainda não capturado. Não é receita.
      return {
        orderStatus: 'pending',
        paid: false,
        blocksShipping: true,
        customerMessage: 'Pagamento autorizado, aguardando confirmação.',
        internalNote: 'Pagamento autorizado mas não capturado. Capturar antes de produzir.',
      }

    case 'pending':
    case 'in_process':
      return {
        orderStatus: 'pending',
        paid: false,
        blocksShipping: true,
        customerMessage:
          statusDetail === 'pending_waiting_transfer'
            ? 'Estamos aguardando o pagamento do Pix.'
            : 'Estamos aguardando a confirmação do pagamento.',
        internalNote: `Pagamento pendente${statusDetail ? ` (${statusDetail})` : ''}.`,
      }

    case 'rejected':
      return {
        orderStatus: 'failed',
        paid: false,
        blocksShipping: true,
        customerMessage: rejectionMessage(statusDetail),
        internalNote: `Pagamento recusado${statusDetail ? ` (${statusDetail})` : ''}.`,
      }

    case 'cancelled':
      return {
        orderStatus: 'cancelled',
        paid: false,
        blocksShipping: true,
        customerMessage: 'O pagamento foi cancelado.',
        internalNote: `Pagamento cancelado${statusDetail ? ` (${statusDetail})` : ''}.`,
      }

    case 'refunded':
      return {
        orderStatus: 'refunded',
        paid: false,
        blocksShipping: true,
        customerMessage: 'O valor foi devolvido.',
        internalNote:
          statusDetail === 'partially_refunded'
            ? 'Reembolso parcial feito no Mercado Pago.'
            : 'Reembolso total feito no Mercado Pago.',
      }

    case 'charged_back':
      return {
        orderStatus: 'disputed',
        paid: false,
        blocksShipping: true,
        customerMessage: 'Há uma contestação em andamento sobre este pagamento.',
        internalNote:
          'Chargeback aberto. Envie nota fiscal, rastreio e conversa com o cliente como defesa e não despache o pedido.',
      }

    case 'in_mediation':
      return {
        orderStatus: 'disputed',
        paid: false,
        blocksShipping: true,
        customerMessage: 'Há uma disputa em andamento sobre este pagamento.',
        internalNote: 'Pagamento em mediação. Não despachar até a resolução.',
      }

    default:
      return {
        orderStatus: 'pending',
        paid: false,
        blocksShipping: true,
        customerMessage: 'Estamos conferindo o pagamento.',
        internalNote: `Estado de pagamento não reconhecido: ${status}.`,
      }
  }
}

/**
 * Custo real da venda, tirado do próprio pagamento.
 *
 * A taxa varia por meio de pagamento, prazo de recebimento e número de
 * parcelas, então estimar por percentual erra a margem. O DRE usa o valor
 * que o Mercado Pago informou nesta transação.
 */
export function extractFees(payment: {
  transaction_amount?: number
  transaction_details?: { net_received_amount?: number; total_paid_amount?: number }
  fee_details?: Array<{ type?: string; amount?: number; fee_payer?: string }>
}): {
  grossCents: number
  netCents: number
  feeCents: number
  feeBreakdown: Array<{ type: string; cents: number }>
} {
  const toCents = (value: number | undefined) =>
    typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 100) : 0

  const grossCents = toCents(payment.transaction_amount)
  const netCents = toCents(payment.transaction_details?.net_received_amount)

  const feeBreakdown = (payment.fee_details ?? [])
    .filter((fee) => fee.fee_payer !== 'payer')
    .map((fee) => ({ type: fee.type ?? 'desconhecida', cents: toCents(fee.amount) }))

  const feeFromDetails = feeBreakdown.reduce((sum, fee) => sum + fee.cents, 0)
  // Quando o detalhamento não vem, a taxa é a diferença entre bruto e líquido.
  const feeCents = feeFromDetails > 0 ? feeFromDetails : Math.max(0, grossCents - netCents)

  return {
    grossCents,
    netCents: netCents > 0 ? netCents : grossCents - feeCents,
    feeCents,
    feeBreakdown,
  }
}
