/**
 * Como as coisas se escrevem no Brasil.
 *
 * Telefone é `(33) 99947-8774`. CPF é `529.982.247-25`. CEP é `35010-000`.
 * Dinheiro é `R$ 1.000,00`. Não é preciosismo: é assim que a cliente lê o
 * número dela na tela e percebe, em um segundo, que o CEP saiu trocado.
 * Campo sem máscara também esconde o erro de contagem — `3501000` tem sete
 * dígitos e parece certo até a encomenda voltar.
 *
 * As funções aqui formatam enquanto se digita: recebem o que está no campo,
 * ficam só com os dígitos e devolvem o texto já pontuado. São puras, então
 * servem igual ao painel, à vitrine e aos testes.
 */

/** (33) 99947-8774 para celular, (33) 3271-1234 para fixo. */
export function mascararTelefone(valor: string): string {
  let digitos = somenteDigitos(valor)

  // Colou com o código do país: some com ele, quem opera não digita 55.
  if (digitos.length > 11 && digitos.startsWith('55')) digitos = digitos.slice(2)
  digitos = digitos.slice(0, 11)

  if (digitos.length <= 2) return digitos.length ? `(${digitos}` : ''

  const ddd = digitos.slice(0, 2)
  const resto = digitos.slice(2)

  if (resto.length <= 4) return `(${ddd}) ${resto}`

  // Até oito dígitos é fixo; o nono é o 9 do celular.
  const corte = resto.length <= 8 ? 4 : 5
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`
}

/** 529.982.247-25, virando 11.222.333/0001-81 quando passa de onze dígitos. */
export function mascararCpfCnpj(valor: string): string {
  const digitos = somenteDigitos(valor).slice(0, 14)
  return digitos.length > 11 ? mascararCnpj(digitos) : mascararCpf(digitos)
}

export function mascararCpf(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11)

  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function mascararCnpj(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 14)

  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

/** 35010-000. */
export function mascararCep(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 8)
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`
}

/**
 * Dinheiro, preenchendo da direita para a esquerda.
 *
 * Digitar `100000` mostra `R$ 1.000,00`. É o jeito que não tem como errar:
 * quem digita não precisa lembrar de vírgula, de ponto nem de quantas casas,
 * e nunca sai um pedido de mil reais cobrado a dez.
 */
export function mascararDinheiro(valor: string): string {
  const centavos = centavosDe(valor)
  return formatarReais(centavos)
}

/** Quantos centavos há no que foi digitado. Nunca float. */
export function centavosDe(valor: string): number {
  const digitos = somenteDigitos(valor).slice(0, 12)
  return digitos ? Number(digitos) : 0
}

/** R$ 1.000,00 — com o espaço normal, não o espaço fino do Intl. */
export function formatarReais(centavos: number): string {
  const negativo = centavos < 0
  const inteiro = Math.abs(Math.trunc(centavos))

  const reais = Math.floor(inteiro / 100)
  const resto = String(inteiro % 100).padStart(2, '0')
  const comSeparador = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return `${negativo ? '-' : ''}R$ ${comSeparador},${resto}`
}

/** Governador Valadares/MG vira "MG"; qualquer coisa vira duas letras. */
export function mascararUf(valor: string): string {
  return valor.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2)
}

function somenteDigitos(valor: string): string {
  return (valor ?? '').replace(/\D/g, '')
}
