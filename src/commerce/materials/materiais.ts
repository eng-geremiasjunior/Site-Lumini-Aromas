/**
 * Da venda para a lista de compras.
 *
 * O problema, nas palavras do dono: vendeu 100 velas no copinho e precisa
 * saber quanto comprar de cada coisa. O que se compra e o que se usa estão
 * em unidades diferentes — cera vem em quilo e vai em mililitro no copo,
 * pavio vem em caixa de 50 e vai um por peça, fita vem em rolo e vai em
 * centímetros. Hoje essa conversão é feita de cabeça, a cada pedido.
 *
 * Três ideias sustentam o cálculo:
 *
 * **O preço do material não é fixo.** O quilo da cera é comprado entre
 * R$ 24 e R$ 30. Guardar um preço único daria um custo errado quase sempre,
 * e o erro entra direto na margem. Por isso o insumo guarda o histórico de
 * compras, e o preço é derivado: o último para estimar a próxima compra, o
 * médio ponderado para custear o que foi vendido.
 *
 * **Nem todo insumo é fixo.** A essência de lavanda e a de bamboo são
 * frascos diferentes; a fita verde e a fita bege são rolos diferentes.
 * Somar tudo junto daria um número que não se compra. Por isso a lista sai
 * quebrada pela escolha da cliente.
 *
 * **A essência não segue a peça, segue a cera.** São 200 ml para cada 7 kg
 * de cera derretida. Calcular por vela erraria sempre que o tamanho da peça
 * mudasse.
 *
 * ## Sobre o dinheiro
 *
 * Todo valor guardado é centavo inteiro, como no resto da loja. O custo por
 * grama não é um valor guardado: é uma razão entre dois inteiros, que só
 * vira dinheiro depois de multiplicada pela quantidade. Por isso a divisão
 * e a multiplicação acontecem na mesma expressão, e o arredondamento só no
 * fim — dividir antes seria perder centavos em cada grama.
 */

export type UnidadeDeUso = 'un' | 'g' | 'ml' | 'cm'

export type UnidadeDeCompra = 'unidade' | 'kg' | 'litro' | 'metro' | 'rolo' | 'caixa'

export type CompraDeInsumo = {
  /** Data em ISO. */
  em: string
  /** Quantas embalagens foram compradas. */
  embalagens: number
  /** O que foi pago no total, em centavos. */
  valorPago: number
  fornecedor?: string | null
}

export type Insumo = {
  id: string
  nome: string
  unidadeDeUso: UnidadeDeUso
  unidadeDeCompra: UnidadeDeCompra
  /** Quanto vem em uma embalagem, na unidade de uso. 1 kg de cera = 1000 g. */
  quantidadePorEmbalagem: number
  /** Resíduo na panela, evaporação, manuseio. Em pontos percentuais. */
  perdaPercentual?: number | null
  /** Gramas por mililitro da cera derretida. Só faz sentido em quem é pesado e usado em volume. */
  densidade?: number | null
  /** Em estoque agora, na unidade de uso. */
  estoqueAtual?: number | null
  compras?: CompraDeInsumo[] | null
}

/** De onde vem o insumo desta linha da ficha. */
export type Vinculo = 'fixo' | 'escolha' | 'proporcional'

export type LinhaDaFicha = {
  vinculo: Vinculo
  /** Em 'fixo' e 'proporcional': o insumo consumido. */
  insumoId?: string | null
  /**
   * Em 'escolha': de onde vem a resposta. `aroma` para a variação do
   * produto; qualquer outro texto é o rótulo de um campo de personalização
   * (ex.: "Cor do laço").
   */
  campo?: string | null
  /** Em 'escolha': cada resposta possível e o insumo que ela consome. */
  opcoes?: Array<{ valor: string; insumoId: string }> | null
  /** Quanto entra em UMA peça, na unidade de uso do insumo. */
  quantidadePorPeca?: number | null
  /**
   * A quantidade foi informada em mililitros, mas o insumo é comprado por
   * peso. É o caso da cera: o dono sabe que o copo recebe 60 ml, não que
   * leva 51,6 g. A densidade faz a ponte.
   */
  informadaEmMililitros?: boolean | null
  /** Em 'proporcional': o insumo que puxa o consumo deste. */
  insumoBaseId?: string | null
  /** Em 'proporcional': `quantidadePorPeca` deste para cada `paraCada` do base. */
  paraCada?: number | null
}

export type FichaDoProduto = {
  produtoId: string
  linhas: LinhaDaFicha[]
}

export type ItemProduzido = {
  produtoId: string
  /** A chave do aroma escolhido. */
  variante?: string | null
  /** As respostas de personalização, por rótulo do campo. */
  personalizacao?: Record<string, string> | null
  /** Quantas peças. */
  pecas: number
}

export type CriterioDePreco = 'ultimo' | 'medio'

// ------------------------------------------------------------------ preços

/** O preço da embalagem na compra mais recente, em centavos. */
export function ultimoPreco(insumo: Insumo): number | null {
  const compras = (insumo.compras ?? []).filter((compra) => compra.embalagens > 0)
  if (compras.length === 0) return null

  const maisRecente = [...compras].sort((a, b) => (a.em < b.em ? 1 : -1))[0] as CompraDeInsumo
  return Math.round(maisRecente.valorPago / maisRecente.embalagens)
}

/**
 * O preço médio ponderado da embalagem, em centavos.
 *
 * Ponderado pela quantidade, e não a média dos preços: dez quilos a R$ 24 e
 * um quilo a R$ 30 dão uma média de R$ 24,55, não de R$ 27.
 */
export function precoMedio(insumo: Insumo, ultimas = 6): number | null {
  const compras = [...(insumo.compras ?? [])]
    .filter((compra) => compra.embalagens > 0)
    .sort((a, b) => (a.em < b.em ? 1 : -1))
    .slice(0, ultimas)

  if (compras.length === 0) return null

  const pago = compras.reduce((soma, compra) => soma + compra.valorPago, 0)
  const embalagens = compras.reduce((soma, compra) => soma + compra.embalagens, 0)

  return embalagens > 0 ? Math.round(pago / embalagens) : null
}

/** A faixa observada, para o dono enxergar a variação em vez de um número que finge ser exato. */
export function faixaDePrecos(insumo: Insumo): { minimo: number; maximo: number } | null {
  const precos = (insumo.compras ?? [])
    .filter((compra) => compra.embalagens > 0)
    .map((compra) => Math.round(compra.valorPago / compra.embalagens))

  if (precos.length === 0) return null

  return { minimo: Math.min(...precos), maximo: Math.max(...precos) }
}

export function precoDaEmbalagem(insumo: Insumo, criterio: CriterioDePreco): number | null {
  return criterio === 'ultimo' ? ultimoPreco(insumo) : precoMedio(insumo)
}

/**
 * Quanto custa uma quantidade de insumo, em centavos.
 *
 * A divisão e a multiplicação ficam na mesma expressão de propósito: o
 * preço por grama tem casas decimais, e arredondar antes de multiplicar
 * perderia centavos em cada peça.
 */
export function custoDe(
  insumo: Insumo,
  quantidade: number,
  criterio: CriterioDePreco = 'medio',
): number | null {
  const preco = precoDaEmbalagem(insumo, criterio)
  if (preco === null || insumo.quantidadePorEmbalagem <= 0) return null

  return Math.round((quantidade * preco) / insumo.quantidadePorEmbalagem)
}

// ------------------------------------------------------------- consumo

/** O insumo que esta linha consome, dada a escolha da cliente. */
export function insumoDaLinha(linha: LinhaDaFicha, item: ItemProduzido): string | null {
  if (linha.vinculo !== 'escolha') return linha.insumoId ?? null

  const campo = (linha.campo ?? '').trim()
  const resposta =
    campo.toLowerCase() === 'aroma'
      ? (item.variante ?? '')
      : (item.personalizacao?.[campo] ?? '')

  if (!resposta) return null

  const opcao = (linha.opcoes ?? []).find(
    (cada) => normalizar(cada.valor) === normalizar(resposta),
  )

  return opcao?.insumoId ?? null
}

/**
 * A quantidade de uma linha para um item, na unidade de uso do insumo.
 *
 * Quando a quantidade foi informada em mililitros e o insumo é comprado por
 * peso, a densidade converte: 60 ml de cera a 0,86 g/ml são 51,6 g. Sem
 * isso, 60 "gramas" de cera por vela inflariam a compra em quase 20%.
 */
export function quantidadeDaLinha(
  linha: LinhaDaFicha,
  insumo: Insumo,
  pecas: number,
): number {
  const porPeca = linha.quantidadePorPeca ?? 0
  if (porPeca <= 0 || pecas <= 0) return 0

  const densidade = insumo.densidade ?? 0
  const convertida =
    linha.informadaEmMililitros && insumo.unidadeDeUso === 'g' && densidade > 0
      ? porPeca * densidade
      : porPeca

  return convertida * pecas
}

export type LinhaDaLista = {
  insumoId: string
  nome: string
  unidadeDeUso: UnidadeDeUso
  unidadeDeCompra: UnidadeDeCompra
  /** Consumo puro, sem perda, na unidade de uso. */
  consumo: number
  /** Consumo já com a perda aplicada. É o que precisa existir. */
  necessario: number
  estoque: number
  /** O que falta comprar, na unidade de uso. */
  aComprar: number
  /** Quantas embalagens, sempre arredondado para cima. */
  embalagens: number
  /** O que vem nessas embalagens, para o dono ver quanto vai sobrar. */
  compraArredondada: number
  /** Custo estimado, em centavos. Nulo quando o insumo nunca foi comprado. */
  custoEstimado: number | null
}

export type ListaDeCompras = {
  linhas: LinhaDaLista[]
  /** Soma dos custos conhecidos, em centavos. */
  total: number
  /** Insumos sem histórico de compra, que ficaram de fora do total. */
  semPreco: string[]
  /** Linhas da ficha que não encontraram insumo — escolha sem material cadastrado. */
  semInsumo: string[]
  pecas: number
}

/**
 * A lista de compras de um conjunto de itens.
 *
 * A ordem importa: primeiro os insumos que dependem da peça, depois os que
 * dependem de outro insumo. A essência só pode ser calculada depois de se
 * saber quantos quilos de cera o lote inteiro consome.
 */
export function listaDeCompras(
  itens: ItemProduzido[],
  fichas: FichaDoProduto[],
  insumos: Insumo[],
  criterio: CriterioDePreco = 'ultimo',
): ListaDeCompras {
  const porId = new Map(insumos.map((insumo) => [insumo.id, insumo]))
  const fichaPorProduto = new Map(fichas.map((ficha) => [ficha.produtoId, ficha]))

  const consumo = new Map<string, number>()
  const semInsumo = new Set<string>()
  let pecas = 0

  const proporcionais: LinhaDaFicha[] = []

  for (const item of itens) {
    pecas += item.pecas
    const ficha = fichaPorProduto.get(item.produtoId)
    if (!ficha) continue

    for (const linha of ficha.linhas) {
      if (linha.vinculo === 'proporcional') {
        if (!proporcionais.includes(linha)) proporcionais.push(linha)
        continue
      }

      const insumoId = insumoDaLinha(linha, item)
      if (!insumoId) {
        semInsumo.add(descreverLinha(linha, item))
        continue
      }

      const insumo = porId.get(insumoId)
      if (!insumo) {
        semInsumo.add(descreverLinha(linha, item))
        continue
      }

      const quantidade = quantidadeDaLinha(linha, insumo, item.pecas)
      if (quantidade > 0) consumo.set(insumoId, (consumo.get(insumoId) ?? 0) + quantidade)
    }
  }

  // Os proporcionais entram agora, sobre o total já consolidado do insumo
  // base. A essência do lote inteiro, e não vela por vela.
  //
  // E sobre a cera **com a perda já somada**: a essência é misturada na
  // cera que foi de fato derretida, inclusive a parte que vira resíduo.
  for (const linha of proporcionais) {
    const insumoId = linha.insumoId
    const baseId = linha.insumoBaseId
    const paraCada = linha.paraCada ?? 0
    const porQuantidade = linha.quantidadePorPeca ?? 0

    if (!insumoId || !baseId || paraCada <= 0 || porQuantidade <= 0) continue

    const base = porId.get(baseId)
    const consumoDoBase = consumo.get(baseId) ?? 0
    if (!base || consumoDoBase <= 0) continue

    const necessarioDoBase = consumoDoBase * (1 + (base.perdaPercentual ?? 0) / 100)
    const quantidade = (necessarioDoBase / paraCada) * porQuantidade

    consumo.set(insumoId, (consumo.get(insumoId) ?? 0) + quantidade)
  }

  const linhas: LinhaDaLista[] = []
  const semPreco: string[] = []
  let total = 0

  for (const [insumoId, bruto] of consumo) {
    const insumo = porId.get(insumoId)
    if (!insumo) continue

    const perda = insumo.perdaPercentual ?? 0
    const necessario = bruto * (1 + perda / 100)
    const estoque = insumo.estoqueAtual ?? 0
    const aComprar = Math.max(necessario - estoque, 0)

    const embalagens =
      insumo.quantidadePorEmbalagem > 0 ? Math.ceil(aComprar / insumo.quantidadePorEmbalagem) : 0

    const compraArredondada = embalagens * insumo.quantidadePorEmbalagem
    const custoEstimado = embalagens > 0 ? custoDe(insumo, compraArredondada, criterio) : 0

    if (custoEstimado === null) semPreco.push(insumo.nome)
    else total += custoEstimado

    linhas.push({
      insumoId,
      nome: insumo.nome,
      unidadeDeUso: insumo.unidadeDeUso,
      unidadeDeCompra: insumo.unidadeDeCompra,
      consumo: arredondar(bruto),
      necessario: arredondar(necessario),
      estoque,
      aComprar: arredondar(aComprar),
      embalagens,
      compraArredondada: arredondar(compraArredondada),
      custoEstimado,
    })
  }

  linhas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  return { linhas, total, semPreco, semInsumo: [...semInsumo], pecas }
}

/**
 * O custo de uma peça pela ficha, em centavos.
 *
 * É o que substitui o "custo de uma peça" digitado à mão no cadastro do
 * produto: em vez de alguém lembrar de atualizar o número quando a cera
 * sobe, ele passa a sair do que foi realmente comprado.
 *
 * Devolve `null` quando falta preço de algum insumo — um custo parcial
 * parece certo e é pior do que um custo ausente.
 */
export function custoDaPeca(
  ficha: FichaDoProduto,
  insumos: Insumo[],
  opcoes: { variante?: string | null; personalizacao?: Record<string, string> | null } = {},
  criterio: CriterioDePreco = 'medio',
): number | null {
  const item: ItemProduzido = {
    produtoId: ficha.produtoId,
    variante: opcoes.variante ?? null,
    personalizacao: opcoes.personalizacao ?? null,
    pecas: 1,
  }

  const lista = listaDeCompras([item], [ficha], insumos, criterio)
  if (lista.linhas.length === 0) return null

  const porId = new Map(insumos.map((insumo) => [insumo.id, insumo]))
  let total = 0

  for (const linha of lista.linhas) {
    const insumo = porId.get(linha.insumoId)
    if (!insumo) return null

    // Custo pelo que a peça consome, e não pela embalagem inteira: a
    // sobra do rolo de fita não é custo desta vela.
    const custo = custoDe(insumo, linha.necessario, criterio)
    if (custo === null) return null

    total += custo
  }

  return total
}

/** Texto pronto para a tela: "6 kg (5,8 kg necessários)". */
export function descreverCompra(linha: LinhaDaLista): string {
  const unidade = rotuloDaCompra(linha.unidadeDeCompra, linha.embalagens)
  return `${linha.embalagens} ${unidade}`
}

export function rotuloDaCompra(unidade: UnidadeDeCompra, quantidade: number): string {
  const plural = quantidade === 1 ? 0 : 1
  const rotulos: Record<UnidadeDeCompra, [string, string]> = {
    unidade: ['unidade', 'unidades'],
    kg: ['kg', 'kg'],
    litro: ['litro', 'litros'],
    metro: ['metro', 'metros'],
    rolo: ['rolo', 'rolos'],
    caixa: ['caixa', 'caixas'],
  }

  return rotulos[unidade][plural] as string
}

export function rotuloDoUso(unidade: UnidadeDeUso): string {
  const rotulos: Record<UnidadeDeUso, string> = { un: 'un', g: 'g', ml: 'ml', cm: 'cm' }
  return rotulos[unidade]
}

function descreverLinha(linha: LinhaDaFicha, item: ItemProduzido): string {
  const campo = (linha.campo ?? '').trim()

  if (linha.vinculo === 'escolha') {
    const resposta =
      campo.toLowerCase() === 'aroma'
        ? (item.variante ?? 'sem escolha')
        : (item.personalizacao?.[campo] ?? 'sem escolha')

    return `${campo || 'escolha'}: ${resposta}`
  }

  return linha.insumoId ?? 'insumo não informado'
}

function normalizar(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Duas casas bastam: ninguém compra um centésimo de grama. */
function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100
}
