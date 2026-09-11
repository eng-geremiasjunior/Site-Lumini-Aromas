/**
 * A caixa de saída.
 *
 * Toda consequência de um pedido — e-mail para a cliente, conversão para a
 * Meta, evento para o GA4, lançamento no DRE — passa por aqui antes de sair.
 * Nada dispara direto de dentro de uma tela.
 *
 * O motivo é simples: no WooCommerce, quando a integração da Meta falhava,
 * ninguém ficava sabendo. A venda acontecia, o anúncio não recebia a
 * conversão, e o relatório mentia por semanas. Com a caixa de saída, uma
 * falha vira uma linha na lista com o erro do lado e um botão de reenviar.
 *
 * E é o que garante que a venda fechada no WhatsApp, lançada à mão no
 * painel, produza exatamente os mesmos efeitos da venda feita no site.
 *
 * Este módulo é a parte que pensa: decide o que sai, com que chave, e
 * quando tentar de novo. Quem fala com o mundo é `src/lib/outbox.ts`.
 */

import type { OrderStatus } from '../orders/statuses.ts'
import type { TipoDeEmail } from '../notifications/emails.ts'

export type TipoDeEvento = 'email' | 'meta_capi' | 'ga4' | 'google_ads' | 'whatsapp' | 'dre'

export type SituacaoDoEvento = 'pendente' | 'enviado' | 'falhou' | 'desistiu'

export type EventoASair = {
  tipo: TipoDeEvento
  /**
   * Identidade do efeito. Duas tentativas com a mesma chave são o mesmo
   * efeito, e o segundo não sai. É o que impede a cliente de receber
   * "pagamento aprovado" duas vezes porque o webhook do Mercado Pago
   * chegou repetido, coisa que ele faz com frequência.
   */
  dedupeKey: string
  payload: Record<string, unknown>
}

export type ContextoDoPedido = {
  numero: string
  /** A situação anterior. Ausente quando o pedido acabou de ser criado. */
  de?: OrderStatus | null
  para: OrderStatus
}

/**
 * O que uma mudança de situação deve produzir.
 *
 * Por enquanto só e-mail: Meta, GA4 e DRE entram aqui quando tiverem
 * credencial, e entram como mais itens desta mesma lista — não como outro
 * caminho paralelo.
 */
export function eventosDaTransicao(contexto: ContextoDoPedido): EventoASair[] {
  const { de, para, numero } = contexto

  // Nada a fazer quando a situação não mudou de verdade.
  if (de === para) return []

  const email = EMAIL_POR_SITUACAO[para]
  if (!email) return []

  return [
    {
      tipo: 'email',
      dedupeKey: `email:${email}:${numero}`,
      payload: { tipoDeEmail: email, numero },
    },
  ]
}

const EMAIL_POR_SITUACAO: Partial<Record<OrderStatus, TipoDeEmail>> = {
  pending: 'pedido_recebido',
  processing: 'pagamento_aprovado',
  art_approval: 'arte_para_aprovar',
  production: 'em_producao',
  shipped: 'pedido_enviado',
  completed: 'pedido_entregue',
  cancelled: 'pedido_cancelado',
}

/**
 * Espera antes da próxima tentativa, em minutos.
 *
 * Cresce depressa de propósito: se a Resend ou a Meta estão fora do ar,
 * insistir de minuto em minuto só enche a fila. Depois da última tentativa
 * o evento não some — fica marcado como desistido, visível no painel, para
 * alguém reenviar à mão.
 */
export const ESPERAS_EM_MINUTOS = [1, 5, 15, 60, 360]

export const MAXIMO_DE_TENTATIVAS = ESPERAS_EM_MINUTOS.length + 1

export function proximaTentativa(tentativas: number, agora: Date = new Date()): Date | null {
  if (tentativas >= MAXIMO_DE_TENTATIVAS) return null

  const minutos = ESPERAS_EM_MINUTOS[tentativas - 1] ?? ESPERAS_EM_MINUTOS.at(-1)!
  return new Date(agora.getTime() + minutos * 60_000)
}

export function situacaoAposFalha(tentativas: number): SituacaoDoEvento {
  return tentativas >= MAXIMO_DE_TENTATIVAS ? 'desistiu' : 'falhou'
}

/** Está na hora de tentar de novo? */
export function estaNaVez(
  evento: { situacao: SituacaoDoEvento; proximaTentativaEm?: string | null },
  agora: Date = new Date(),
): boolean {
  if (evento.situacao === 'enviado' || evento.situacao === 'desistiu') return false
  if (!evento.proximaTentativaEm) return true
  return new Date(evento.proximaTentativaEm).getTime() <= agora.getTime()
}
