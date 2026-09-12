/**
 * Leitura da mensagem da cliente.
 *
 * A maioria das vendas fecha no WhatsApp, e no fim da conversa a cliente
 * manda um bloco com os dados dela: nome, CPF, endereço, data do evento,
 * quantidade, a frase do rótulo. Hoje esses dados são redigitados à mão no
 * WooCommerce, campo por campo, e é aí que nasce o CEP trocado e o nome com
 * um "s" a menos no rótulo de 100 peças.
 *
 * Este módulo faz a leitura determinística: o que dá para reconhecer com
 * certeza — CPF com dígito verificador conferido, CEP, telefone, e-mail,
 * data, quantidade, aroma — é reconhecido aqui, sem depender de nada
 * externo, sem rede e sem custo por mensagem.
 *
 * ── Onde a IA entra ────────────────────────────────────────────────────
 *
 * O que sobra é o texto solto: "é pro casamento da minha filha, ela quer
 * uma coisa delicada, o nome é Marina e o dele é Téo". Isso um modelo lê
 * melhor do que qualquer expressão regular.
 *
 * Por isso `lerMensagem` aceita um `interpretador`. Ele roda DEPOIS da
 * leitura determinística e só preenche o que ficou vazio — nunca sobrescreve
 * um CPF cujo dígito já foi conferido nem um CEP de oito dígitos. A ordem
 * importa: o modelo é ótimo em entender intenção e péssimo em não inventar
 * número. Quem pode ser verificado, verifica-se; o resto pode ser adivinhado
 * com revisão humana na tela.
 */

export type TipoDePessoa = 'PF' | 'PJ'

export type DadosDaMensagem = {
  nome: string | null
  email: string | null
  telefone: string | null
  documento: string | null
  tipoPessoa: TipoDePessoa | null
  cep: string | null
  rua: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  /** ISO, só a data. */
  dataDoEvento: string | null
  tipoDoEvento: string | null
  quantidade: number | null
  aroma: string | null
  /** O que vai impresso no rótulo. */
  frase: string | null
  observacao: string | null
}

export type Leitura = {
  dados: DadosDaMensagem
  /** O que merece um olhar antes de salvar. */
  avisos: string[]
  /** Linhas que a leitura não soube aproveitar. */
  naoLido: string[]
}

export type Interpretador = (texto: string) => Promise<Partial<DadosDaMensagem>>

const VAZIO: DadosDaMensagem = {
  nome: null,
  email: null,
  telefone: null,
  documento: null,
  tipoPessoa: null,
  cep: null,
  rua: null,
  numero: null,
  complemento: null,
  bairro: null,
  cidade: null,
  estado: null,
  dataDoEvento: null,
  tipoDoEvento: null,
  quantidade: null,
  aroma: null,
  frase: null,
  observacao: null,
}

/** Campos que, uma vez verificados, nenhum interpretador pode sobrescrever. */
const VERIFICADOS = ['documento', 'cep', 'telefone', 'email'] as const

export async function lerMensagem(
  texto: string,
  opcoes: { aromas?: string[]; interpretador?: Interpretador; hoje?: Date } = {},
): Promise<Leitura> {
  const leitura = lerSemIA(texto, opcoes)

  if (!opcoes.interpretador) return leitura

  let sugerido: Partial<DadosDaMensagem> = {}
  try {
    sugerido = await opcoes.interpretador(texto)
  } catch {
    // Modelo fora do ar não pode impedir a venda de ser lançada: o que foi
    // lido sem ele continua valendo, e a tela pede o resto.
    return { ...leitura, avisos: [...leitura.avisos, 'A leitura assistida falhou; confira os campos vazios.'] }
  }

  const dados = { ...leitura.dados }

  for (const [campo, valor] of Object.entries(sugerido) as Array<
    [keyof DadosDaMensagem, DadosDaMensagem[keyof DadosDaMensagem]]
  >) {
    if (valor === null || valor === undefined || valor === '') continue
    if (dados[campo] !== null) continue
    if ((VERIFICADOS as readonly string[]).includes(campo) && leitura.dados[campo] !== null) continue

    // @ts-expect-error atribuição campo a campo, com o tipo certo em cada um
    dados[campo] = valor
  }

  return { ...leitura, dados }
}

/** A leitura determinística, sem rede e sem custo. */
export function lerSemIA(
  texto: string,
  opcoes: { aromas?: string[]; hoje?: Date } = {},
): Leitura {
  const dados: DadosDaMensagem = { ...VAZIO }
  const avisos: string[] = []
  const linhas = texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean)

  const usadas = new Set<number>()

  // ------------------------------------------------------- campos rotulados
  for (const [indice, linha] of linhas.entries()) {
    const rotulada = lerLinhaRotulada(linha)
    if (!rotulada) continue

    const { campo, valor } = rotulada
    if (!valor) continue

    if (campo === 'nome' && !dados.nome) dados.nome = limparNome(valor)
    else if (campo === 'rua' && !dados.rua) aplicarEndereco(dados, valor)
    else if (campo === 'numero' && !dados.numero) dados.numero = valor
    else if (campo === 'complemento' && !dados.complemento) dados.complemento = valor
    else if (campo === 'bairro' && !dados.bairro) dados.bairro = valor
    else if (campo === 'cidade' && !dados.cidade) aplicarCidade(dados, valor)
    else if (campo === 'frase' && !dados.frase) dados.frase = tirarAspas(valor)
    else if (campo === 'observacao' && !dados.observacao) dados.observacao = valor
    else if (campo === 'evento' && !dados.tipoDoEvento) dados.tipoDoEvento = normalizarEvento(valor)
    else continue

    usadas.add(indice)
  }

  // ------------------------------------------------- reconhecíveis por forma
  const textoTodo = linhas.join('\n')

  dados.email = extrairEmail(textoTodo)

  const documento = extrairDocumento(textoTodo)
  if (documento) {
    dados.documento = documento.formatado
    dados.tipoPessoa = documento.tipo
    if (!documento.valido) {
      avisos.push(
        `O ${documento.tipo === 'PF' ? 'CPF' : 'CNPJ'} ${documento.formatado} não passou na conferência dos dígitos. Confira com a cliente.`,
      )
    }
  }

  dados.cep = extrairCep(textoTodo)
  dados.telefone = extrairTelefone(textoTodo, dados.documento)

  const data = extrairData(textoTodo, opcoes.hoje)
  if (data) {
    dados.dataDoEvento = data.iso
    if (data.aviso) avisos.push(data.aviso)
  }

  dados.quantidade = extrairQuantidade(textoTodo)
  dados.aroma = extrairAroma(textoTodo, opcoes.aromas)
  if (!dados.tipoDoEvento) dados.tipoDoEvento = extrairTipoDeEvento(textoTodo)
  if (!dados.frase) dados.frase = extrairFraseEntreAspas(textoTodo)
  if (!dados.estado) dados.estado = extrairUf(textoTodo)

  // Nome: quando não veio rotulado, a primeira linha que parece nome de
  // gente costuma ser ele — é assim que as mensagens chegam.
  if (!dados.nome) {
    const candidata = linhas.find((linha, indice) => !usadas.has(indice) && pareceNome(linha))
    if (candidata) dados.nome = limparNome(candidata)
  }

  const naoLido = linhas.filter((linha, indice) => !usadas.has(indice) && !foiAproveitada(linha, dados))

  if (!dados.nome) avisos.push('Não achei o nome da cliente.')
  if (!dados.cep && !dados.cidade) avisos.push('Não achei o endereço de entrega.')

  return { dados, avisos, naoLido }
}

// ---------------------------------------------------------------- rotulados

const ROTULOS: Array<{ campo: string; padrao: RegExp }> = [
  { campo: 'nome', padrao: /^(nome( completo)?|cliente|noiva|aniversariante)\s*[:\-–]\s*(.+)$/i },
  { campo: 'rua', padrao: /^(endere[çc]o|rua|avenida|av|logradouro)\s*[:\-–]\s*(.+)$/i },
  { campo: 'numero', padrao: /^(n[úu]mero|n[ºo°]|num)\s*[:\-–]\s*(.+)$/i },
  { campo: 'complemento', padrao: /^(complemento|compl|apto?|apartamento|bloco)\s*[:\-–]\s*(.+)$/i },
  { campo: 'bairro', padrao: /^bairro\s*[:\-–]\s*(.+)$/i },
  { campo: 'cidade', padrao: /^(cidade|munic[íi]pio)\s*[:\-–]\s*(.+)$/i },
  {
    campo: 'frase',
    padrao: /^(frase|texto( do r[óo]tulo)?|r[óo]tulo|escrita|personaliza[çc][ãa]o|dizeres)\s*[:\-–]\s*(.+)$/i,
  },
  { campo: 'observacao', padrao: /^(observa[çc][ãa]o|obs|recado|detalhe)\s*[:\-–]\s*(.+)$/i },
  { campo: 'evento', padrao: /^(evento|tipo de evento|ocasi[ãa]o)\s*[:\-–]\s*(.+)$/i },
]

function lerLinhaRotulada(linha: string): { campo: string; valor: string } | null {
  for (const { campo, padrao } of ROTULOS) {
    const encontrado = linha.match(padrao)
    if (encontrado) {
      const valor = encontrado[encontrado.length - 1]?.trim() ?? ''
      return { campo, valor }
    }
  }
  return null
}

// ------------------------------------------------------------------ pedaços

export function extrairEmail(texto: string): string | null {
  const encontrado = texto.match(/[\w.+-]+@[\w-]+\.[\w.-]+[\w]/)
  return encontrado ? encontrado[0].toLowerCase() : null
}

export function extrairCep(texto: string): string | null {
  // Com hífen é inequívoco. Sem hífen, exige a palavra CEP por perto, senão
  // um CPF sem pontuação viraria CEP.
  const comHifen = texto.match(/\b(\d{5})-(\d{3})\b/)
  if (comHifen) return `${comHifen[1]}-${comHifen[2]}`

  const rotulado = texto.match(/cep\s*[:\-–]?\s*(\d{5})[.\s]?(\d{3})\b/i)
  if (rotulado) return `${rotulado[1]}-${rotulado[2]}`

  return null
}

export function extrairDocumento(
  texto: string,
): { formatado: string; digitos: string; tipo: TipoDePessoa; valido: boolean } | null {
  const cnpj = texto.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/)
  if (cnpj) {
    const digitos = cnpj[0].replace(/\D/g, '')
    return {
      digitos,
      formatado: formatarCnpj(digitos),
      tipo: 'PJ',
      valido: cnpjValido(digitos),
    }
  }

  const cpf = texto.match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/)
  if (cpf) {
    const digitos = cpf[0].replace(/\D/g, '')
    return {
      digitos,
      formatado: formatarCpf(digitos),
      tipo: 'PF',
      valido: cpfValido(digitos),
    }
  }

  return null
}

/**
 * Telefone.
 *
 * O documento é passado de lado para não ser confundido com telefone: um
 * CPF sem pontuação é onze dígitos, exatamente como um celular com DDD.
 */
export function extrairTelefone(texto: string, documento?: string | null): string | null {
  const digitosDoDocumento = (documento ?? '').replace(/\D/g, '')

  const candidatos = texto.match(
    /(?:\+?55\s*)?\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}/g,
  )
  if (!candidatos) return null

  for (const candidato of candidatos) {
    let digitos = candidato.replace(/\D/g, '')
    if (digitos.startsWith('55') && digitos.length > 11) digitos = digitos.slice(2)
    if (digitos.length !== 10 && digitos.length !== 11) continue
    if (digitos === digitosDoDocumento) continue
    if (digitosDoDocumento.includes(digitos)) continue

    const ddd = digitos.slice(0, 2)
    const resto = digitos.slice(2)
    return resto.length === 9
      ? `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`
      : `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`
  }

  return null
}

const MESES = [
  'janeiro',
  'fevereiro',
  'mar[çc]o',
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

export function extrairData(
  texto: string,
  hoje: Date = new Date(),
): { iso: string; aviso?: string } | null {
  const numerica = texto.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/)
  const porExtenso = texto.match(
    new RegExp(`\\b(\\d{1,2})\\s*de\\s*(${MESES.join('|')})(?:\\s*de\\s*(\\d{4}))?`, 'i'),
  )

  let dia: number | null = null
  let mes: number | null = null
  let ano: number | null = null

  if (porExtenso) {
    dia = Number(porExtenso[1])
    mes = MESES.findIndex((nome) => new RegExp(`^${nome}$`, 'i').test(porExtenso[2])) + 1
    ano = porExtenso[3] ? Number(porExtenso[3]) : null
  } else if (numerica) {
    dia = Number(numerica[1])
    mes = Number(numerica[2])
    ano = numerica[3] ? Number(numerica[3]) : null
    if (ano !== null && ano < 100) ano += 2000
  }

  if (dia === null || mes === null || mes < 1 || mes > 12 || dia < 1 || dia > 31) return null

  // Sem ano, vale a próxima vez que a data acontece: quem manda "12/10" em
  // setembro está falando do mês que vem, não do ano passado.
  let aviso: string | undefined
  if (ano === null) {
    ano = hoje.getUTCFullYear()
    const candidata = Date.UTC(ano, mes - 1, dia)
    if (candidata < Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate())) {
      ano += 1
    }
    aviso = `A mensagem não trouxe o ano do evento; considerei ${ano}.`
  }

  const data = new Date(Date.UTC(ano, mes - 1, dia))
  if (data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null

  return { iso: data.toISOString().slice(0, 10), aviso }
}

export function extrairQuantidade(texto: string): number | null {
  const padroes = [
    /\b(\d{2,4})\s*(?:pe[çc]as?|unidades?|un\b|lembrancinhas?|velas?|potes?|kits?)/i,
    /\bquantidade\s*[:\-–]?\s*(\d{2,4})\b/i,
    /\bs[ãa]o\s+(\d{2,4})\b/i,
  ]

  for (const padrao of padroes) {
    const encontrado = texto.match(padrao)
    if (encontrado) return Number(encontrado[1])
  }

  return null
}

const AROMAS_PADRAO = ['Capim Limão', 'Vanilla', 'Chá Branco', 'Lavanda']

export function extrairAroma(texto: string, aromas: string[] = AROMAS_PADRAO): string | null {
  const alvo = semAcento(texto)

  for (const aroma of aromas) {
    const procurado = semAcento(aroma)
    if (new RegExp(`\\b${escaparRegex(procurado)}\\b`, 'i').test(alvo)) return aroma
  }

  // A cliente escreve "baunilha", o catálogo diz "Vanilla".
  const apelidos: Record<string, string> = {
    baunilha: 'Vanilla',
    'capim cidreira': 'Capim Limão',
    'cha verde': 'Chá Branco',
    alfazema: 'Lavanda',
  }

  for (const [apelido, oficial] of Object.entries(apelidos)) {
    if (!aromas.includes(oficial)) continue
    if (new RegExp(`\\b${escaparRegex(apelido)}\\b`, 'i').test(alvo)) return oficial
  }

  return null
}

const EVENTOS: Array<{ padrao: RegExp; nome: string }> = [
  { padrao: /\bcasamento\b|\bnoiv[ao]s?\b/i, nome: 'Casamento' },
  { padrao: /\bbodas?\b/i, nome: 'Bodas' },
  { padrao: /\b15\s*anos\b|\bdebutante\b/i, nome: '15 anos' },
  { padrao: /\bbatiza(do|o)\b/i, nome: 'Batizado' },
  { padrao: /\bch[áa]\s*de\s*beb[êe]\b|\bmaternidade\b/i, nome: 'Maternidade' },
  { padrao: /\bcorporativ[oa]\b|\bempresa\b|\bbrinde\b/i, nome: 'Corporativo' },
  { padrao: /\banivers[áa]rio\b/i, nome: 'Aniversário' },
]

export function extrairTipoDeEvento(texto: string): string | null {
  for (const { padrao, nome } of EVENTOS) {
    if (padrao.test(texto)) return nome
  }
  return null
}

function normalizarEvento(valor: string): string {
  return extrairTipoDeEvento(valor) ?? valor
}

export function extrairFraseEntreAspas(texto: string): string | null {
  const encontrado = texto.match(/["“']([^"”']{2,60})["”']/)
  return encontrado ? encontrado[1].trim() : null
}

export function extrairUf(texto: string): string | null {
  const ufs =
    'AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO'
  const encontrado = texto.match(new RegExp(`[\\s,/-]\\s*(${ufs})\\b`))
  return encontrado ? encontrado[1].toUpperCase() : null
}

// ----------------------------------------------------------------- endereço

/**
 * Quebra "Rua Sete de Setembro, 100, apto 202 - Centro" em partes.
 *
 * É a linha que mais varia de mensagem para mensagem, então o que não
 * couber com clareza fica no complemento, à vista, em vez de ser descartado.
 */
function aplicarEndereco(dados: DadosDaMensagem, valor: string): void {
  const partes = valor.split(/\s*[,–-]\s*/).filter(Boolean)

  dados.rua = partes[0]?.trim() ?? valor.trim()

  for (const parte of partes.slice(1)) {
    const limpa = parte.trim()

    if (!dados.numero && /^n?[ºo°]?\s*\d+[a-z]?$/i.test(limpa)) {
      dados.numero = limpa.replace(/^n?[ºo°]?\s*/i, '')
      continue
    }

    if (!dados.complemento && /^(apto?|apartamento|bloco|casa|fundos|sala|qd|lote)/i.test(limpa)) {
      dados.complemento = limpa
      continue
    }

    if (!dados.bairro) {
      dados.bairro = limpa
      continue
    }

    dados.complemento = [dados.complemento, limpa].filter(Boolean).join(' · ')
  }
}

function aplicarCidade(dados: DadosDaMensagem, valor: string): void {
  const comUf = valor.match(/^(.+?)\s*[/\-–]\s*([A-Za-z]{2})\s*$/)
  if (comUf) {
    dados.cidade = comUf[1].trim()
    dados.estado = comUf[2].toUpperCase()
    return
  }
  dados.cidade = valor.trim()
}

// -------------------------------------------------------------------- apoio

function pareceNome(linha: string): boolean {
  if (/\d/.test(linha)) return false
  if (linha.includes('@')) return false
  if (linha.length < 5 || linha.length > 60) return false

  const palavras = linha.split(/\s+/)
  if (palavras.length < 2 || palavras.length > 6) return false

  // Duas ou mais palavras começando com maiúscula.
  const maiusculas = palavras.filter((palavra) => /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(palavra))
  return maiusculas.length >= 2
}

function limparNome(valor: string): string {
  return valor.replace(/\s+/g, ' ').trim()
}

function tirarAspas(valor: string): string {
  return valor.replace(/^["“']|["”']$/g, '').trim()
}

/** A linha já virou algum campo? Serve para não listá-la como não lida. */
function foiAproveitada(linha: string, dados: DadosDaMensagem): boolean {
  const digitos = linha.replace(/\D/g, '')

  if (dados.email && linha.toLowerCase().includes(dados.email)) return true
  if (dados.documento && digitos.includes(dados.documento.replace(/\D/g, ''))) return true
  if (dados.telefone && digitos.includes(dados.telefone.replace(/\D/g, ''))) return true
  if (dados.cep && digitos.includes(dados.cep.replace(/\D/g, ''))) return true
  if (dados.nome && linha.includes(dados.nome)) return true
  if (dados.frase && linha.includes(dados.frase)) return true
  if (dados.quantidade && new RegExp(`\\b${dados.quantidade}\\b`).test(linha)) return true
  if (dados.aroma && semAcento(linha).toLowerCase().includes(semAcento(dados.aroma).toLowerCase())) {
    return true
  }

  return false
}

function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// -------------------------------------------------------- CPF, CNPJ e forma

export function cpfValido(digitos: string): boolean {
  if (digitos.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digitos)) return false

  for (const [posicao, peso] of [
    [9, 10],
    [10, 11],
  ] as const) {
    let soma = 0
    for (let i = 0; i < posicao; i += 1) soma += Number(digitos[i]) * (peso - i)
    const resto = (soma * 10) % 11
    const esperado = resto === 10 ? 0 : resto
    if (esperado !== Number(digitos[posicao])) return false
  }

  return true
}

export function cnpjValido(digitos: string): boolean {
  if (digitos.length !== 14) return false
  if (/^(\d)\1{13}$/.test(digitos)) return false

  const conferir = (tamanho: number): boolean => {
    const pesos =
      tamanho === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

    let soma = 0
    for (let i = 0; i < tamanho; i += 1) soma += Number(digitos[i]) * pesos[i]

    const resto = soma % 11
    const esperado = resto < 2 ? 0 : 11 - resto
    return esperado === Number(digitos[tamanho])
  }

  return conferir(12) && conferir(13)
}

function formatarCpf(digitos: string): string {
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`
}

function formatarCnpj(digitos: string): string {
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`
}
