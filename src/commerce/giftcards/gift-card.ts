/**
 * Cartão-presente.
 *
 * Diferente de cupom em tudo o que importa. Cupom é desconto: a loja abre
 * mão de uma parte do preço. Cartão-presente é **dinheiro que já entrou**
 * por mercadoria que ainda não saiu — enquanto não for usado, é obrigação,
 * não receita. Por isso ele tem saldo, tem validade e tem histórico de uso,
 * coisas que um cupom não precisa ter.
 *
 * Os valores saem da tabela de lotes do catálogo. Um cartão de R$ 500 num
 * negócio de lote mínimo de R$ 760 é uma armadilha: quem recebe descobre,
 * na hora de usar, que precisa completar a diferença — e completar a
 * diferença de um presente é constrangedor. Valor colado no lote garante
 * que o cartão compra alguma coisa inteira.
 *
 * Uso parcial é permitido e o saldo fica guardado: quem ganhou R$ 1.140 e
 * gastou R$ 760 continua com R$ 380 para usar depois. O contrário — perder
 * o troco — é prática abusiva.
 */

/** Letras e números sem os que se confundem à mão: O/0, I/1, S/5. */
const ALFABETO = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789'

export type SituacaoDoCartao = 'ativo' | 'usado' | 'expirado' | 'cancelado'

export type CartaoPresente = {
  codigo: string
  /** Valor de face, em centavos. Nunca muda. */
  valorCentavos: number
  /** O que ainda dá para gastar, em centavos. */
  saldoCentavos: number
  situacao: SituacaoDoCartao
  /** ISO. */
  validoAte?: string | null
}

export type ResultadoDoCartao =
  | { ok: true; abatido: number; saldoRestante: number }
  | { ok: false; motivo: string }

/**
 * Validade padrão: um ano.
 *
 * O Código de Defesa do Consumidor não fixa prazo para cartão-presente, mas
 * prazo curto é tratado como cláusula abusiva pelos Procons e pela
 * jurisprudência — e num negócio onde a cliente compra para um evento que
 * acontece daqui a seis meses, prazo curto seria absurdo além de arriscado.
 */
export const MESES_DE_VALIDADE = 12

export function validadePadrao(aPartirDe: Date = new Date()): string {
  const data = new Date(aPartirDe)
  data.setMonth(data.getMonth() + MESES_DE_VALIDADE)
  return data.toISOString()
}

/**
 * Código do cartão.
 *
 * Quatro grupos de quatro, como se lê ao telefone. O alfabeto exclui os
 * caracteres que se confundem quando alguém copia do papel para a tela.
 */
export function gerarCodigo(sorteio: () => number = Math.random): string {
  const grupos: string[] = []

  for (let g = 0; g < 4; g += 1) {
    let grupo = ''
    for (let i = 0; i < 4; i += 1) {
      grupo += ALFABETO[Math.floor(sorteio() * ALFABETO.length)]
    }
    grupos.push(grupo)
  }

  return grupos.join('-')
}

/** "abcd efgh" e "ABCD-EFGH" são o mesmo cartão. */
export function normalizarCodigo(codigo: string): string {
  const limpo = (codigo ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return (limpo.match(/.{1,4}/g) ?? []).join('-')
}

/**
 * Quanto este cartão paga de um total, e quanto sobra nele.
 *
 * Não recusa por saldo insuficiente: abate o que tem e o resto é pago
 * normalmente. É assim que a pessoa espera que funcione, e é o contrário de
 * "seu cartão não cobre o pedido, escolha outra coisa".
 */
export function aplicarCartao(
  cartao: CartaoPresente,
  totalCentavos: number,
  agora: Date = new Date(),
): ResultadoDoCartao {
  if (cartao.situacao === 'cancelado') {
    return { ok: false, motivo: 'Este cartão-presente foi cancelado.' }
  }

  if (cartao.situacao === 'usado' || cartao.saldoCentavos <= 0) {
    return { ok: false, motivo: 'Este cartão-presente já foi usado por inteiro.' }
  }

  if (estaExpirado(cartao, agora)) {
    return { ok: false, motivo: 'Este cartão-presente perdeu a validade. Fale com a gente.' }
  }

  if (totalCentavos <= 0) {
    return { ok: false, motivo: 'Não há valor a pagar neste pedido.' }
  }

  const abatido = Math.min(cartao.saldoCentavos, totalCentavos)

  return { ok: true, abatido, saldoRestante: cartao.saldoCentavos - abatido }
}

export function estaExpirado(
  cartao: Pick<CartaoPresente, 'validoAte'>,
  agora: Date = new Date(),
): boolean {
  if (!cartao.validoAte) return false
  const limite = new Date(cartao.validoAte)
  if (Number.isNaN(limite.getTime())) return false
  return limite.getTime() < agora.getTime()
}

/** A situação do cartão depois de um uso. */
export function situacaoAposUso(saldoRestante: number): SituacaoDoCartao {
  return saldoRestante <= 0 ? 'usado' : 'ativo'
}

/**
 * Os valores oferecidos, tirados da tabela de lotes do catálogo.
 *
 * Recebe os preços de lote de todos os produtos publicados e devolve a
 * lista sem repetição, do menor para o maior. Nenhum valor redondo
 * inventado: todo cartão compra um lote inteiro de alguma coisa.
 */
export function valoresDisponiveis(precosDeLote: number[], quantos = 6): number[] {
  const unicos = [...new Set(precosDeLote.filter((preco) => preco > 0))].sort((a, b) => a - b)
  if (unicos.length <= quantos) return unicos

  // Espalha a escolha ao longo da lista em vez de pegar os primeiros, para
  // a vitrine não oferecer só os lotes pequenos.
  const passo = (unicos.length - 1) / (quantos - 1)
  const escolhidos = new Set<number>()

  for (let i = 0; i < quantos; i += 1) {
    escolhidos.add(unicos[Math.round(i * passo)])
  }

  return [...escolhidos].sort((a, b) => a - b)
}
