/**
 * O e-mail que quem ganhou o cartão abre.
 *
 * É a única mensagem da loja que não fala com quem comprou. Quem abre não
 * conhece a Lumini, não fez pedido nenhum, e vai decidir em cinco segundos
 * se aquilo é golpe ou presente. Por isso três coisas aparecem antes de
 * qualquer outra: quem mandou, o que é, e quanto vale.
 *
 * O valor gasto não aparece como "compra de R$ 1.140" — aparece como saldo.
 * Presente com preço à vista é presente estragado, e aqui o preço é o
 * próprio conteúdo.
 */

import type { Email } from './emails.ts'

export type DadosDoCartaoPresente = {
  codigo: string
  valorCentavos: number
  de?: string | null
  para?: string | null
  mensagem?: string | null
  /** ISO. */
  validoAte?: string | null
  urlDaLoja: string
  whatsapp: string
}

export function montarEmailDoCartao(d: DadosDoCartaoPresente): Email {
  const quem = d.de?.trim()
  const nome = d.para?.trim()

  return {
    assunto: quem ? `${quem} mandou um presente para você` : 'Você recebeu um presente',
    texto: [
      nome ? `${nome},` : 'Olá,',
      '',
      quem
        ? `${quem} comprou um cartão-presente da Lumini Aromas para você.`
        : 'Você recebeu um cartão-presente da Lumini Aromas.',
      '',
      d.mensagem ? `"${d.mensagem}"` : null,
      d.mensagem ? '' : null,
      `Saldo: ${emReais(d.valorCentavos)}`,
      `Código: ${d.codigo}`,
      d.validoAte ? `Válido até ${porExtenso(d.validoAte)}.` : null,
      '',
      'Fazemos velas aromáticas artesanais para eventos — casamentos, bodas, 15 anos, batizados. Cada peça é feita à mão, com o aroma e a frase que você escolher.',
      '',
      `Escolher as suas: ${d.urlDaLoja.replace(/\/$/, '')}/`,
      '',
      'Na hora de fechar, é só digitar o código no carrinho. Se sobrar saldo, ele fica guardado para uma próxima.',
      '',
      '—',
      `Dúvidas? Chame no WhatsApp: https://wa.me/${d.whatsapp}`,
      '',
      'Lumini Aromas — velas artesanais para eventos',
      'Governador Valadares, MG · CNPJ 34.499.353/0001-08',
    ]
      .filter((linha) => linha !== null)
      .join('\n'),
  }
}

/** A confirmação para quem comprou, com o código, caso queira entregar em mãos. */
export function montarEmailDeConfirmacaoDoCartao(d: DadosDoCartaoPresente): Email {
  const nome = d.para?.trim()

  return {
    assunto: `Seu cartão-presente de ${emReais(d.valorCentavos)} está pronto`,
    texto: [
      'Tudo certo: o cartão foi criado.',
      '',
      nome ? `Ele foi enviado para ${nome}.` : 'Ele já pode ser usado.',
      `Código: ${d.codigo}`,
      `Valor: ${emReais(d.valorCentavos)}`,
      d.validoAte ? `Válido até ${porExtenso(d.validoAte)}.` : null,
      '',
      'Guardamos o código aqui caso você queira entregar em mãos, escrito num cartão.',
      '',
      '—',
      `Dúvidas? Chame no WhatsApp: https://wa.me/${d.whatsapp}`,
      '',
      'Lumini Aromas — velas artesanais para eventos',
    ]
      .filter((linha) => linha !== null)
      .join('\n'),
  }
}

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

function porExtenso(iso: string): string {
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return ''
  return `${data.getUTCDate()} de ${MESES[data.getUTCMonth()]} de ${data.getUTCFullYear()}`
}

function emReais(centavos: number): string {
  const reais = Math.floor(centavos / 100)
  const resto = String(centavos % 100).padStart(2, '0')
  return `R$ ${String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${resto}`
}
