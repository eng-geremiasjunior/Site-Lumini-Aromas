/**
 * Carrinho abandonado.
 *
 * O ciclo aqui não é o do varejo. Entre o primeiro contato e o fechamento
 * passam-se semanas, às vezes meses: a cliente está escolhendo a
 * lembrancinha do casamento dela, não comprando uma capinha de celular.
 * Carrinho parado, em boa parte das vezes, é alguém pensando — não alguém
 * que desistiu.
 *
 * Por isso são três lembretes espaçados, e **nenhum deles oferece
 * desconto**. Numa marca de luxo, o cupom que chega sozinho ensina que o
 * preço da etiqueta não é o preço de verdade, e quem ia pagar inteiro passa
 * a esperar o e-mail. O que os lembretes fazem é outra coisa: lembram que o
 * carrinho continua guardado, mostram o trabalho, e deixam claro que a data
 * do evento tem prazo de produção.
 */

export type EstadoDoCarrinho = {
  status: string
  /** Sem e-mail não há como lembrar ninguém. */
  email?: string | null
  /** ISO. */
  lastActivityAt?: string | null
  /** Qual lembrete já saiu: 0 ou vazio = nenhum. */
  recoveryStep?: number | null
  /** O carrinho tem itens. */
  temItens: boolean
}

/** Depois de quanto tempo parado o carrinho conta como abandonado. */
export const MINUTOS_ATE_ABANDONAR = 20

/**
 * Horas de silêncio até cada lembrete, contadas da última atividade.
 *
 * 1 h: ainda está na cabeça dela.
 * 24 h: um dia depois, com o portfólio.
 * 72 h: três dias, falando de prazo e data do evento.
 */
export const HORAS_DOS_LEMBRETES = [1, 24, 72]

/** Depois disso o carrinho é história: não se insiste mais. */
export const DIAS_ATE_DESISTIR = 7

export function estaAbandonado(carrinho: EstadoDoCarrinho, agora: Date = new Date()): boolean {
  if (carrinho.status !== 'active') return false
  if (!carrinho.temItens) return false

  const parado = minutosParado(carrinho, agora)
  return parado !== null && parado >= MINUTOS_ATE_ABANDONAR
}

/**
 * Qual lembrete deve sair agora — 1, 2 ou 3 — ou nenhum.
 *
 * Devolve um número só quando o tempo daquele passo já passou e ele ainda
 * não saiu. Nunca pula passo e nunca repete.
 */
export function proximoLembrete(
  carrinho: EstadoDoCarrinho,
  agora: Date = new Date(),
): number | null {
  if (carrinho.status !== 'active' && carrinho.status !== 'abandoned') return null
  if (!carrinho.temItens) return null
  if (!carrinho.email) return null

  const horas = horasParado(carrinho, agora)
  if (horas === null) return null

  // Carrinho antigo demais não recebe mais nada. Insistir uma semana
  // depois não recupera venda, só irrita e queima o remetente.
  if (horas > DIAS_ATE_DESISTIR * 24) return null

  const jaEnviados = carrinho.recoveryStep ?? 0
  if (jaEnviados >= HORAS_DOS_LEMBRETES.length) return null

  const proximo = jaEnviados + 1
  const esperaNecessaria = HORAS_DOS_LEMBRETES[proximo - 1]

  return horas >= esperaNecessaria ? proximo : null
}

/** Carrinho velho o bastante para sair da lista de recuperação. */
export function deveDesistir(carrinho: EstadoDoCarrinho, agora: Date = new Date()): boolean {
  if (carrinho.status !== 'active' && carrinho.status !== 'abandoned') return false

  const horas = horasParado(carrinho, agora)
  if (horas === null) return false

  return horas > DIAS_ATE_DESISTIR * 24
}

function minutosParado(carrinho: EstadoDoCarrinho, agora: Date): number | null {
  if (!carrinho.lastActivityAt) return null
  const desde = new Date(carrinho.lastActivityAt).getTime()
  if (Number.isNaN(desde)) return null
  return (agora.getTime() - desde) / 60_000
}

function horasParado(carrinho: EstadoDoCarrinho, agora: Date): number | null {
  const minutos = minutosParado(carrinho, agora)
  return minutos === null ? null : minutos / 60
}
