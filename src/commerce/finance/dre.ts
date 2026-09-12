/**
 * O DRE do mês.
 *
 * Demonstração de Resultado do Exercício: começa no que entrou, desce
 * tirando uma camada de custo de cada vez, e termina no que sobrou. A ordem
 * importa — é ela que separa "vendi R$ 50 mil" de "ganhei R$ 8 mil", que é
 * a diferença entre uma decisão boa e uma ruim sobre quanto investir em
 * anúncio no mês seguinte.
 *
 *   Receita bruta          o que foi vendido, produtos + frete cobrado
 *   (−) deduções           cancelamentos, reembolsos, cupons
 *   (−) impostos           Simples Nacional, pela alíquota efetiva
 *   = Receita líquida
 *   (−) CMV                o custo do que saiu: cera, vidro, rótulo, embalagem da peça
 *   = Lucro bruto          ← margem bruta
 *   (−) custos variáveis   taxa do cartão, frete pago, embalagem de envio
 *   = Margem de contribuição   ← quanto cada venda deixa para pagar o fixo
 *   (−) marketing          o tráfego: Meta e Google
 *   (−) despesas fixas     o que o mês custa mesmo sem vender nada
 *   (−) financeiras        juros e tarifas
 *   = Resultado            ← margem líquida
 *
 * ## Competência, não caixa
 *
 * O pedido entra no mês em que foi **pago**, não no mês em que o dinheiro
 * caiu na conta. Uma venda no cartão em 12x aparece inteira em setembro,
 * ainda que o Mercado Pago libere ao longo do ano. Misturar os dois critérios
 * é o erro que faz um mês ótimo parecer ruim.
 *
 * ## Nada de float
 *
 * Tudo em centavos inteiros, como no resto da loja. Percentuais são a única
 * coisa que sai como número quebrado, e só para exibir.
 */

import { impostoSobre, type Anexo } from './simples-nacional.ts'

export type ItemParaDre = {
  /** A linha de produto. Sem categoria, entra como "Sem categoria". */
  categoria: string | null
  produto: string
  /** O que foi cobrado por esta linha, em centavos. */
  receita: number
  /** O custo do que foi produzido, em centavos. Zero quando não cadastrado. */
  cmv: number
  pecas: number
  /**
   * Vela feita no ateliê é indústria (Anexo II); produto comprado pronto
   * para revenda é comércio (Anexo I). Muda o imposto.
   */
  anexo: Anexo
}

export type PedidoParaDre = {
  numero: string
  /** Data do pagamento, em ISO. É ela que define o mês. */
  pagoEm: string
  canal: string
  itens: ItemParaDre[]
  /** Frete cobrado do cliente, em centavos. */
  frete: number
  /** Desconto concedido (cupom), em centavos. */
  desconto: number
  total: number
  /** Taxa do meio de pagamento, em centavos. Vem do Mercado Pago quando existe. */
  taxaDePagamento: number
  /** Frete efetivamente pago na etiqueta, em centavos. */
  fretePago: number
  /** Embalagem de envio, em centavos. */
  embalagem: number
  /** Reembolsado no período, em centavos. */
  reembolsado: number
}

/** Onde um lançamento manual entra no DRE. */
export type GrupoDoLancamento =
  | 'receita'
  | 'deducao'
  | 'variavel'
  | 'marketing'
  | 'fixa'
  | 'financeira'

export type LancamentoParaDre = {
  grupo: GrupoDoLancamento
  categoria: string
  valor: number
  /** Só no marketing: de onde saiu o investimento. */
  plataforma?: string | null
}

export type EntradaDoDre = {
  pedidos: PedidoParaDre[]
  lancamentos: LancamentoParaDre[]
  /** Receita bruta dos doze meses anteriores, em centavos. Define a alíquota. */
  rbt12: number
}

export type LinhaPorCategoria = {
  categoria: string
  receita: number
  cmv: number
  lucroBruto: number
  /** Lucro bruto sobre a receita da própria categoria, em %. */
  margem: number
  pecas: number
  /** Participação na receita do mês, em %. */
  participacao: number
}

export type ResumoDoDre = {
  receitaDeProdutos: number
  receitaDeFrete: number
  outrasReceitas: number
  receitaBruta: number

  deducoes: number
  imposto: number
  receitaLiquida: number

  cmv: number
  lucroBruto: number
  margemBruta: number

  taxaDePagamento: number
  fretePago: number
  embalagem: number
  outrosVariaveis: number
  custosVariaveis: number

  margemDeContribuicao: number
  margemDeContribuicaoPercentual: number

  marketing: number
  marketingPorPlataforma: Array<{ plataforma: string; valor: number }>
  despesasFixas: number
  financeiras: number

  resultado: number
  margemLiquida: number

  pedidos: number
  pecas: number
  ticketMedio: number
  /** Receita bruta dividida pelo investimento em tráfego. Zero sem tráfego. */
  retornoSobreTrafego: number
  /** Quanto custou, em tráfego, cada pedido do mês. */
  custoPorPedido: number

  porCategoria: LinhaPorCategoria[]
}

export function montarDre(entrada: EntradaDoDre): ResumoDoDre {
  const { pedidos, lancamentos, rbt12 } = entrada

  let receitaDeProdutos = 0
  let receitaDeFrete = 0
  let descontos = 0
  let reembolsos = 0
  let cmv = 0
  let taxaDePagamento = 0
  let fretePago = 0
  let embalagem = 0
  let imposto = 0
  let pecas = 0

  const categorias = new Map<string, LinhaPorCategoria>()

  for (const pedido of pedidos) {
    receitaDeFrete += pedido.frete
    descontos += pedido.desconto
    reembolsos += pedido.reembolsado
    taxaDePagamento += pedido.taxaDePagamento
    fretePago += pedido.fretePago
    embalagem += pedido.embalagem

    for (const item of pedido.itens) {
      receitaDeProdutos += item.receita
      cmv += item.cmv
      pecas += item.pecas

      // O imposto é calculado item a item porque a tabela depende do que
      // foi vendido: a vela fabricada e o difusor revendido não pagam a
      // mesma alíquota.
      imposto += impostoSobre(item.receita, rbt12, item.anexo)

      const nome = item.categoria ?? 'Sem categoria'
      const linha = categorias.get(nome) ?? {
        categoria: nome,
        receita: 0,
        cmv: 0,
        lucroBruto: 0,
        margem: 0,
        pecas: 0,
        participacao: 0,
      }

      linha.receita += item.receita
      linha.cmv += item.cmv
      linha.pecas += item.pecas
      categorias.set(nome, linha)
    }
  }

  let outrasReceitas = 0
  let outrasDeducoes = 0
  let outrosVariaveis = 0
  let marketing = 0
  let despesasFixas = 0
  let financeiras = 0

  const porPlataforma = new Map<string, number>()

  for (const lancamento of lancamentos) {
    switch (lancamento.grupo) {
      case 'receita':
        outrasReceitas += lancamento.valor
        break
      case 'deducao':
        outrasDeducoes += lancamento.valor
        break
      case 'variavel':
        outrosVariaveis += lancamento.valor
        break
      case 'marketing': {
        marketing += lancamento.valor
        const plataforma = lancamento.plataforma ?? 'Outros'
        porPlataforma.set(plataforma, (porPlataforma.get(plataforma) ?? 0) + lancamento.valor)
        break
      }
      case 'fixa':
        despesasFixas += lancamento.valor
        break
      case 'financeira':
        financeiras += lancamento.valor
        break
    }
  }

  const receitaBruta = receitaDeProdutos + receitaDeFrete + outrasReceitas
  const deducoes = descontos + reembolsos + outrasDeducoes
  const receitaLiquida = receitaBruta - deducoes - imposto
  const lucroBruto = receitaLiquida - cmv
  const custosVariaveis = taxaDePagamento + fretePago + embalagem + outrosVariaveis
  const margemDeContribuicao = lucroBruto - custosVariaveis
  const resultado = margemDeContribuicao - marketing - despesasFixas - financeiras

  const porCategoria = [...categorias.values()]
    .map((linha) => ({
      ...linha,
      lucroBruto: linha.receita - linha.cmv,
      margem: percentual(linha.receita - linha.cmv, linha.receita),
      participacao: percentual(linha.receita, receitaDeProdutos),
    }))
    .sort((a, b) => b.receita - a.receita)

  return {
    receitaDeProdutos,
    receitaDeFrete,
    outrasReceitas,
    receitaBruta,

    deducoes,
    imposto,
    receitaLiquida,

    cmv,
    lucroBruto,
    margemBruta: percentual(lucroBruto, receitaBruta),

    taxaDePagamento,
    fretePago,
    embalagem,
    outrosVariaveis,
    custosVariaveis,

    margemDeContribuicao,
    margemDeContribuicaoPercentual: percentual(margemDeContribuicao, receitaBruta),

    marketing,
    marketingPorPlataforma: [...porPlataforma.entries()]
      .map(([plataforma, valor]) => ({ plataforma, valor }))
      .sort((a, b) => b.valor - a.valor),
    despesasFixas,
    financeiras,

    resultado,
    margemLiquida: percentual(resultado, receitaBruta),

    pedidos: pedidos.length,
    pecas,
    ticketMedio: pedidos.length > 0 ? Math.round(receitaBruta / pedidos.length) : 0,
    retornoSobreTrafego: marketing > 0 ? arredondar(receitaBruta / marketing, 2) : 0,
    custoPorPedido: pedidos.length > 0 ? Math.round(marketing / pedidos.length) : 0,

    porCategoria,
  }
}

/**
 * Um percentual com uma casa decimal.
 *
 * Divisão por zero devolve zero, e não infinito: mês sem venda mostra
 * "0,0%", que é informação; "Infinity%" é defeito na tela.
 */
export function percentual(parte: number, total: number): number {
  if (!total) return 0
  return arredondar((parte / total) * 100, 1)
}

function arredondar(valor: number, casas: number): number {
  const fator = 10 ** casas
  return Math.round(valor * fator) / fator
}

/** O mês de uma data ISO, no formato AAAA-MM, no fuso de Brasília. */
export function mesDe(iso: string): string {
  return iso.slice(0, 7)
}

/** Os últimos N meses até o mês informado, do mais antigo para o mais novo. */
export function ultimosMeses(mes: string, quantos: number): string[] {
  const [ano, numero] = mes.split('-').map(Number) as [number, number]
  const saida: string[] = []

  for (let i = quantos - 1; i >= 0; i--) {
    const data = new Date(Date.UTC(ano, numero - 1 - i, 1))
    saida.push(`${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}`)
  }

  return saida
}

/** O nome do mês por extenso, para o relatório. */
export function nomeDoMes(mes: string): string {
  const [ano, numero] = mes.split('-').map(Number) as [number, number]
  const nomes = [
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
  return `${nomes[numero - 1] ?? ''} de ${ano}`
}
