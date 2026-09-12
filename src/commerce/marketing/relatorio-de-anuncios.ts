/**
 * O relatório de anúncios, colado.
 *
 * O problema é de tempo, não de dado: os números já existem no Gerenciador
 * de Anúncios e no Google Ads, e redigitá-los campanha a campanha é
 * trabalho que ninguém faz por dois meses seguidos. Então não se digita:
 * seleciona as linhas na tela da plataforma, copia, cola aqui, confere e
 * confirma.
 *
 * O que é colado vem como texto separado por tabulação. Este módulo lê o
 * cabeçalho — em português ou inglês, das duas plataformas — e devolve as
 * linhas prontas. Se uma coluna não for reconhecida, ela é **listada**, e
 * não ignorada em silêncio: coluna somida vira número errado no relatório.
 *
 * ## A mesma porta que o pedido do WhatsApp
 *
 * A leitura é determinística e sem inteligência artificial: regra clara,
 * testada, que sempre dá o mesmo resultado. Quando a IA entrar, ela entra
 * como `interpretador`, no mesmo lugar em que entra na leitura da mensagem
 * da cliente — para tentar o que a regra não conseguiu, nunca para
 * sobrescrever o que ela já leu.
 *
 * ## E quando houver credencial
 *
 * A API de marketing da Meta entrega isso sozinha, todo dia. Quando o token
 * existir, o destino é o mesmo: as linhas chegam aqui no mesmo formato e
 * seguem pelo mesmo caminho. Colar deixa de ser necessário sem nada mudar
 * de lugar.
 */

export type Plataforma = 'Meta' | 'Google' | 'Outros'

export type LinhaDeCampanha = {
  campanha: string
  /** Em centavos. */
  investimento: number
  /** Pessoas distintas alcançadas. O Google não entrega alcance. */
  alcance: number | null
  impressoes: number | null
  cliques: number | null
  /** Conversas iniciadas, cadastros, compras — o que a campanha otimiza. */
  resultados: number | null
}

export type LeituraDoRelatorio = {
  plataforma: Plataforma
  linhas: LinhaDeCampanha[]
  /** O que precisa de atenção antes de confirmar. */
  avisos: string[]
  /** Colunas coladas que não foram usadas. */
  colunasIgnoradas: string[]
}

type Campo = 'campanha' | 'investimento' | 'alcance' | 'impressoes' | 'cliques' | 'resultados'

/**
 * Os nomes que cada coluna tem nas duas plataformas.
 *
 * A comparação é feita sem acento, sem maiúscula e sem o que vem entre
 * parênteses, porque a Meta escreve "Valor usado (BRL)" e o Google escreve
 * "Custo" — e o mesmo relatório em inglês escreve outra coisa.
 */
const COLUNAS: Array<{ campo: Campo; nomes: string[] }> = [
  {
    campo: 'campanha',
    nomes: ['nome da campanha', 'campanha', 'campaign name', 'campaign', 'nome do conjunto de anuncios'],
  },
  {
    campo: 'investimento',
    nomes: [
      'valor usado',
      'valor gasto',
      'valor investido',
      'custo',
      'amount spent',
      'cost',
      'spend',
      'gasto',
    ],
  },
  { campo: 'alcance', nomes: ['alcance', 'reach', 'pessoas alcancadas'] },
  { campo: 'impressoes', nomes: ['impressoes', 'impr', 'impressions', 'visualizacoes'] },
  {
    campo: 'cliques',
    nomes: [
      'cliques no link',
      'cliques todos',
      'cliques',
      'link clicks',
      'clicks',
      'cliques no link unicos',
    ],
  },
  {
    campo: 'resultados',
    nomes: ['resultados', 'results', 'conversoes', 'conversions', 'todas as conversoes'],
  },
]

/** Linhas de fechamento que a plataforma acrescenta e que não são campanha. */
const TOTAIS = [
  'total',
  'total geral',
  'resultados totais',
  'total dos resultados',
  'totais',
  'grand total',
  'results from',
]

export function lerRelatorio(texto: string): LeituraDoRelatorio {
  const avisos: string[] = []
  const linhasBrutas = (texto ?? '')
    .split(/\r?\n/)
    .map((linha) => linha.trimEnd())
    .filter((linha) => linha.trim() !== '')

  if (linhasBrutas.length === 0) {
    return { plataforma: 'Outros', linhas: [], avisos: ['Nada foi colado.'], colunasIgnoradas: [] }
  }

  const separador = descobrirSeparador(linhasBrutas)
  const tabela = linhasBrutas.map((linha) => dividir(linha, separador))

  const indiceDoCabecalho = tabela.findIndex((celulas) => ehCabecalho(celulas))

  if (indiceDoCabecalho === -1) {
    return {
      plataforma: 'Outros',
      linhas: [],
      avisos: [
        'Não encontrei o cabeçalho com os nomes das colunas. Copie as linhas junto com a primeira linha de títulos.',
      ],
      colunasIgnoradas: [],
    }
  }

  const cabecalho = tabela[indiceDoCabecalho] as string[]
  const posicoes = new Map<Campo, number>()
  const ignoradas: string[] = []

  cabecalho.forEach((titulo, indice) => {
    const campo = reconhecer(titulo)
    if (campo && !posicoes.has(campo)) posicoes.set(campo, indice)
    else if (titulo.trim() !== '') ignoradas.push(titulo.trim())
  })

  if (!posicoes.has('campanha')) {
    avisos.push('Não achei a coluna com o nome da campanha.')
  }
  if (!posicoes.has('investimento')) {
    avisos.push('Não achei a coluna de valor gasto. Sem ela não dá para lançar o custo.')
  }

  const linhas: LinhaDeCampanha[] = []

  for (const celulas of tabela.slice(indiceDoCabecalho + 1)) {
    const nome = (celulas[posicoes.get('campanha') ?? 0] ?? '').trim()
    if (nome === '') continue

    if (TOTAIS.some((total) => normalizar(nome).startsWith(total))) continue

    const investimento = valorEmCentavos(celulas[posicoes.get('investimento') ?? -1] ?? '')

    linhas.push({
      campanha: nome,
      investimento,
      alcance: inteiroOuNulo(celulas[posicoes.get('alcance') ?? -1]),
      impressoes: inteiroOuNulo(celulas[posicoes.get('impressoes') ?? -1]),
      cliques: inteiroOuNulo(celulas[posicoes.get('cliques') ?? -1]),
      resultados: inteiroOuNulo(celulas[posicoes.get('resultados') ?? -1]),
    })
  }

  if (linhas.length === 0) avisos.push('Nenhuma campanha foi encontrada abaixo do cabeçalho.')

  const semValor = linhas.filter((linha) => linha.investimento === 0).length
  if (semValor > 0 && posicoes.has('investimento')) {
    avisos.push(
      `${semValor} ${semValor === 1 ? 'campanha veio' : 'campanhas vieram'} com valor zero. Confira antes de confirmar.`,
    )
  }

  return {
    plataforma: descobrirPlataforma(cabecalho),
    linhas,
    avisos,
    colunasIgnoradas: [...new Set(ignoradas)],
  }
}

export type Metricas = {
  /** Custo por mil impressões, em centavos. */
  cpm: number | null
  /** Custo por clique, em centavos. */
  cpc: number | null
  /** Cliques sobre impressões, em %. */
  ctr: number | null
  /** Custo por resultado, em centavos. */
  custoPorResultado: number | null
  /** Quantas vezes, em média, a mesma pessoa viu o anúncio. */
  frequencia: number | null
}

/**
 * As métricas saem de conta, e não da coluna colada.
 *
 * A plataforma arredonda para exibir; recalcular a partir do investimento e
 * do volume mantém o número coerente com o que foi lançado, e funciona
 * mesmo quando a coluna não veio na cópia.
 */
export function metricas(linha: LinhaDeCampanha): Metricas {
  const { investimento, impressoes, cliques, resultados, alcance } = linha

  return {
    cpm: impressoes && impressoes > 0 ? Math.round((investimento / impressoes) * 1000) : null,
    cpc: cliques && cliques > 0 ? Math.round(investimento / cliques) : null,
    ctr:
      impressoes && impressoes > 0 && cliques !== null
        ? Math.round((cliques / impressoes) * 1000) / 10
        : null,
    custoPorResultado:
      resultados && resultados > 0 ? Math.round(investimento / resultados) : null,
    frequencia:
      alcance && alcance > 0 && impressoes
        ? Math.round((impressoes / alcance) * 10) / 10
        : null,
  }
}

// ------------------------------------------------------------------ apoio

function descobrirSeparador(linhas: string[]): string {
  const amostra = linhas.slice(0, 5).join('\n')

  if (amostra.includes('\t')) return '\t'
  if (amostra.includes(';')) return ';'
  return ','
}

/**
 * Divide respeitando aspas.
 *
 * Nome de campanha com vírgula é comum ("Casamento - MG, ES e RJ"), e sem
 * isso a linha inteira sairia deslocada uma coluna.
 */
function dividir(linha: string, separador: string): string[] {
  if (separador === '\t') return linha.split('\t')

  const celulas: string[] = []
  let atual = ''
  let dentroDeAspas = false

  for (let i = 0; i < linha.length; i++) {
    const caractere = linha[i]

    if (caractere === '"') {
      if (dentroDeAspas && linha[i + 1] === '"') {
        atual += '"'
        i++
      } else {
        dentroDeAspas = !dentroDeAspas
      }
      continue
    }

    if (caractere === separador && !dentroDeAspas) {
      celulas.push(atual)
      atual = ''
      continue
    }

    atual += caractere
  }

  celulas.push(atual)
  return celulas
}

function ehCabecalho(celulas: string[]): boolean {
  const campos = celulas.map(reconhecer).filter(Boolean)
  return campos.includes('campanha') && campos.length >= 2
}

function reconhecer(titulo: string): Campo | null {
  const limpo = normalizar(titulo)
  if (limpo === '') return null

  for (const coluna of COLUNAS) {
    if (coluna.nomes.some((nome) => limpo === nome || limpo.startsWith(nome + ' '))) {
      return coluna.campo
    }
  }

  return null
}

function descobrirPlataforma(cabecalho: string[]): Plataforma {
  const texto = cabecalho.map(normalizar).join(' ')

  if (texto.includes('alcance') || texto.includes('reach') || texto.includes('valor usado')) {
    return 'Meta'
  }
  if (texto.includes('impr') && texto.includes('custo')) return 'Google'

  return 'Outros'
}

/**
 * Tira acento, maiúscula, moeda e o que estiver entre parênteses.
 *
 * "Valor usado (BRL)" e "Valor gasto" precisam bater com a mesma regra.
 */
function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * Converte o valor colado em centavos.
 *
 * A vírgula manda: "1.234,56" são mil duzentos e trinta e quatro reais e
 * cinquenta e seis centavos. Sem vírgula, o ponto separando três casas é
 * milhar, e não decimal — "1.234" é mil duzentos e trinta e quatro, não um
 * e vinte e três.
 */
export function valorEmCentavos(texto: string | undefined): number {
  const limpo = (texto ?? '').replace(/[^\d.,-]/g, '').trim()
  if (limpo === '' || limpo === '-') return 0

  let normalizado: string

  if (limpo.includes(',')) {
    normalizado = limpo.replace(/\./g, '').replace(',', '.')
  } else {
    const partes = limpo.split('.')
    const ultima = partes[partes.length - 1] ?? ''
    normalizado = partes.length > 1 && ultima.length !== 3 ? limpo : limpo.replace(/\./g, '')
  }

  const numero = Number(normalizado)
  return Number.isFinite(numero) ? Math.round(numero * 100) : 0
}

function inteiroOuNulo(texto: string | undefined): number | null {
  if (texto === undefined) return null

  const digitos = texto.replace(/[^\d]/g, '')
  if (digitos === '') return null

  const numero = Number(digitos)
  return Number.isFinite(numero) ? numero : null
}
