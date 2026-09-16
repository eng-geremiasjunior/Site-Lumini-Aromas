/**
 * Leitura do catálogo do WooCommerce.
 *
 * O site atual guarda o preço do lote digitado variação a variação — são
 * 36 variações num produto só, e foi assim que nasceram os 8 preços errados
 * e as 21 variações sem preço que sumiram da loja. Aqui a conta é invertida:
 * lê-se **todas** as variações com preço, divide cada uma pela quantidade, e
 * o preço de uma peça é o valor que mais se repete.
 *
 * É o que torna a importação auto-corretiva. Se 34 variações dizem R$ 38 e
 * duas dizem R$ 37,67, a maioria ganha e as duas são **relatadas** — em vez
 * de entrarem no sistema novo como estão. O erro do WooCommerce não é
 * copiado: ele é apontado.
 *
 * Nada aqui faz rede nem toca no banco: recebe o que a API devolveu e
 * devolve o produto pronto para cadastrar.
 */

export type VariacaoDoWoo = {
  id: number
  /** Em centavos, como a Store API já entrega. */
  precoEmCentavos: number
  /** Valores por atributo, pelo slug do termo: { aroma: 'lavanda', quantidade: '20' }. */
  aroma: string | null
  quantidade: number | null
}

export type PrecoApurado = {
  /** Preço de uma peça, em centavos. */
  unitPrice: number
  /** Quantas variações confirmam esse preço. */
  confirmam: number
  /** Variações que discordam — os preços digitados errado no site atual. */
  divergencias: Array<{ id: number; quantidade: number; esperado: number; encontrado: number }>
  /** Variações sem preço, que hoje estão invisíveis na loja. */
  semPreco: number
}

/**
 * O preço de uma peça, apurado pela maioria.
 *
 * A moda, e não a média: média seria puxada pelos próprios erros que a
 * importação precisa ignorar.
 */
export function apurarPrecoUnitario(variacoes: VariacaoDoWoo[]): PrecoApurado | null {
  const candidatos = new Map<number, number>()
  let semPreco = 0

  for (const variacao of variacoes) {
    if (!variacao.quantidade || variacao.quantidade <= 0) continue

    if (variacao.precoEmCentavos <= 0) {
      semPreco += 1
      continue
    }

    const unitario = Math.round(variacao.precoEmCentavos / variacao.quantidade)
    candidatos.set(unitario, (candidatos.get(unitario) ?? 0) + 1)
  }

  if (candidatos.size === 0) return null

  // Empate desempata pelo maior preço: entre um valor certo e um digitado
  // a menos, errar para cima é recuperável; errar para baixo é prejuízo.
  const [unitPrice, confirmam] = [...candidatos.entries()].sort(
    (a, b) => b[1] - a[1] || b[0] - a[0],
  )[0] as [number, number]

  const divergencias = variacoes
    .filter((variacao) => variacao.quantidade && variacao.precoEmCentavos > 0)
    .map((variacao) => ({
      id: variacao.id,
      quantidade: variacao.quantidade as number,
      esperado: unitPrice * (variacao.quantidade as number),
      encontrado: variacao.precoEmCentavos,
    }))
    .filter((linha) => linha.esperado !== linha.encontrado)

  return { unitPrice, confirmam, divergencias, semPreco }
}

/** "20 PEÇAS" e "120 PEÇAS" viram 20 e 120. */
export function quantidadeDoTermo(nome: string): number | null {
  const digitos = (nome ?? '').replace(/\D/g, '')
  if (digitos === '') return null

  const numero = Number(digitos)
  return Number.isFinite(numero) && numero > 0 ? numero : null
}

export type FichaTecnica = {
  durationHours: number | null
  weight: string | null
  height: string | null
  width: string | null
  container: string | null
  includes: string | null
}

/**
 * A ficha técnica que hoje mora dentro do texto da descrição.
 *
 * "Duração Aproximada: 08hs / Peso líq: 60g / Altura: 09cm" é informação
 * estruturada escrita como parágrafo. Solta do texto, ela alimenta a página
 * do produto, o feed do Google e o cálculo de frete — e para de depender de
 * alguém repetir o mesmo formato na próxima descrição.
 */
export function lerFichaTecnica(html: string): FichaTecnica {
  const texto = paraTexto(html)

  return {
    durationHours: numeroApos(texto, /dura[çc][ãa]o[^:]*:\s*([\d.,]+)/i),
    weight: textoApos(texto, /peso[^:]*:\s*([^\n]+)/i),
    height: textoApos(texto, /altura[^:]*:\s*([^\n]+)/i),
    width: textoApos(texto, /largura[^:]*:\s*([^\n]+)/i),
    container: textoApos(texto, /recipiente[^:]*:\s*([^\n]+)/i),
    includes: textoApos(texto, /lembrancinhas?\s+acompanham?\s+([^\n]+)/i),
  }
}

/**
 * O resumo do produto.
 *
 * O campo de resumo do site atual não serve: em quase todos os produtos ele
 * diz "Escolha a quantidade abaixo", que é instrução de tela e não descrição.
 * O primeiro parágrafo da descrição é o texto de verdade.
 */
export function lerResumo(shortHtml: string, descricaoHtml: string): string | null {
  const curto = paraTexto(shortHtml)

  const ehInstrucao = /^escolha|^selecione/i.test(curto)
  if (curto.length > 20 && !ehInstrucao) return limitar(curto, 300)

  const primeiro = paraTexto(descricaoHtml)
    .split('\n')
    .map((linha) => linha.trim())
    .find((linha) => linha.length > 40)

  return primeiro ? limitar(primeiro, 300) : null
}

/** As faixas de quantidade que o produto oferece, em ordem. */
export function faixasDe(variacoes: VariacaoDoWoo[]): number[] {
  const faixas = new Set<number>()

  for (const variacao of variacoes) {
    if (variacao.quantidade && variacao.precoEmCentavos > 0) faixas.add(variacao.quantidade)
  }

  return [...faixas].sort((a, b) => a - b)
}

/**
 * Os aromas que realmente estão à venda.
 *
 * Aroma cujas variações estão todas sem preço não entra: é o caso da
 * Vanilla na gota de cristal, que aparece no site mas não é comprável.
 * Trazer o aroma para o sistema novo repetiria o problema em silêncio.
 */
export function aromasDe(variacoes: VariacaoDoWoo[]): string[] {
  const aromas = new Set<string>()

  for (const variacao of variacoes) {
    if (variacao.aroma && variacao.precoEmCentavos > 0) aromas.add(variacao.aroma)
  }

  return [...aromas]
}

/** A variação do lote mínimo de um aroma, que é o item anunciado no Google. */
export function variacaoDoLoteMinimo(
  variacoes: VariacaoDoWoo[],
  aroma: string | null,
): number | null {
  const candidatas = variacoes
    .filter((variacao) => variacao.precoEmCentavos > 0 && variacao.quantidade)
    .filter((variacao) => (aroma === null ? true : variacao.aroma === aroma))
    .sort((a, b) => (a.quantidade as number) - (b.quantidade as number))

  return candidatas[0]?.id ?? null
}

// ------------------------------------------------------------------ apoio

function paraTexto(html: string): string {
  return (html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#8217;|&rsquo;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*/g, '\n')
    .trim()
}

function textoApos(texto: string, expressao: RegExp): string | null {
  const achado = texto.match(expressao)
  if (!achado?.[1]) return null

  const valor = achado[1].trim().replace(/[.;]+$/, '')
  return valor === '' ? null : limitar(valor, 120)
}

function numeroApos(texto: string, expressao: RegExp): number | null {
  const achado = texto.match(expressao)
  if (!achado?.[1]) return null

  const numero = Number(achado[1].replace(',', '.'))
  return Number.isFinite(numero) && numero > 0 ? numero : null
}

function limitar(valor: string, maximo: number): string {
  return valor.length <= maximo ? valor : `${valor.slice(0, maximo - 1).trimEnd()}…`
}
