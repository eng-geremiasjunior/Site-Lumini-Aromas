/**
 * Compra para presentear.
 *
 * Quem compra não é quem recebe. Isso muda três coisas no pedido, e as três
 * são fáceis de errar:
 *
 * 1. O endereço de entrega é o de quem recebe, não o de quem paga.
 * 2. Vai um cartão na caixa, com um recado escrito por quem presenteia.
 * 3. **O pacote não pode mostrar preço.** Ninguém manda um presente com a
 *    etiqueta de R$ 2.280 por cima. É o detalhe que, esquecido uma vez,
 *    estraga o presente inteiro — e a compra não se desfaz.
 *
 * O cartão é curto de propósito. Cartão de presente não é carta: o espaço
 * físico é pequeno, e um texto de mil caracteres não cabe impresso num
 * cartão que vai dentro de uma caixa de lembrancinha.
 */

export const LIMITE_DA_MENSAGEM = 200

export type DadosDoPresente = {
  /** Quem presenteia. Vazio significa presente anônimo, que é válido. */
  de: string
  /** Quem recebe. */
  para: string
  mensagem: string
}

export type CartaoDoPresente = {
  de: string | null
  para: string
  mensagem: string | null
  /** As linhas na ordem em que vão impressas. */
  linhas: string[]
}

export type ResultadoDoPresente =
  | { ok: true; cartao: CartaoDoPresente }
  | { ok: false; mensagem: string; campo: 'para' | 'mensagem' }

/**
 * Confere e monta o cartão.
 *
 * O nome de quem recebe é o único obrigatório: sem ele o cartão não tem
 * destinatário, e quem abre a caixa não sabe se o presente é dela.
 */
export function montarCartao(dados: DadosDoPresente): ResultadoDoPresente {
  const para = limpar(dados.para)
  const de = limpar(dados.de)
  const mensagem = limpar(dados.mensagem)

  if (!para) {
    return { ok: false, mensagem: 'Escreva para quem é o presente.', campo: 'para' }
  }

  if (mensagem.length > LIMITE_DA_MENSAGEM) {
    return {
      ok: false,
      mensagem: `O recado cabe em ${LIMITE_DA_MENSAGEM} caracteres. O seu está com ${mensagem.length}.`,
      campo: 'mensagem',
    }
  }

  const linhas = [`Para ${para}`]
  if (mensagem) linhas.push(mensagem)
  if (de) linhas.push(`De ${de}`)

  return {
    ok: true,
    cartao: {
      de: de || null,
      para,
      mensagem: mensagem || null,
      linhas,
    },
  }
}

/**
 * O nome que vai na etiqueta de entrega.
 *
 * É o de quem recebe. Parece óbvio, e é exatamente o campo que se esquece
 * de trocar quando o pedido é presente: a encomenda sai com o nome de quem
 * pagou e o endereço de quem recebe, e o porteiro devolve.
 */
export function nomeParaEntrega(
  presente: { para?: string | null } | null,
  nomeDoComprador: string,
): string {
  const para = limpar(presente?.para ?? '')
  return para || nomeDoComprador
}

/**
 * O que a operação precisa lembrar na hora de embalar.
 *
 * Vira um aviso no topo do pedido no painel, porque é uma lista curta de
 * coisas que só se fazem uma vez e não dá para refazer depois de postado.
 */
export function lembretesDeEmbalagem(cartao: CartaoDoPresente): string[] {
  return [
    'Imprimir o cartão e colocar dentro da caixa.',
    'Nenhum preço à vista no pacote: nota fiscal em envelope fechado.',
    `Etiqueta no nome de ${cartao.para}.`,
  ]
}

function limpar(texto: string): string {
  return (texto ?? '').replace(/\s+/g, ' ').trim()
}
