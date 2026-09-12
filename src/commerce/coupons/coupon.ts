/**
 * Cupons.
 *
 * A Lumini vende lembrancinhas de luxo, não varejo de volume: cupom aqui
 * não é ferramenta de promoção diária. Serve para três coisas concretas —
 * o desconto combinado com cerimonialistas e parceiros, o crédito do Kit
 * Descoberta, e o gesto pontual para uma cliente que merece.
 *
 * Por isso são três tipos, e não os quatro do WooCommerce: percentual,
 * valor fixo e frete grátis. O "desconto fixo por produto" do Woo não faz
 * sentido quando o que se vende é lote fechado — ninguém entende R$ 5 de
 * desconto "por produto" num lote de 60 peças.
 *
 * Como no resto da loja, dinheiro é inteiro em centavos, e a validação é
 * uma função só, usada pelo carrinho, pelo checkout, pelo orçamento e pela
 * venda lançada à mão.
 */

export type TipoDeCupom = 'percentual' | 'valor' | 'frete_gratis'

export type Cupom = {
  codigo: string
  tipo: TipoDeCupom
  /** 0 a 100. Só para o tipo percentual. */
  percentual?: number | null
  /** Em centavos. Só para o tipo valor. */
  valorCentavos?: number | null
  ativo: boolean
  validoDe?: string | null
  validoAte?: string | null
  gastoMinimoCentavos?: number | null
  /** Quantas vezes o cupom pode ser usado no total. */
  usoMaximo?: number | null
  /** Quantas vezes a mesma pessoa pode usar. */
  usoMaximoPorCliente?: number | null
  /** Quando preenchido, o desconto só vale sobre estes produtos. */
  produtos?: string[] | null
  /** Quando preenchido, o desconto só vale sobre estas categorias. */
  categorias?: string[] | null
  /**
   * E-mails autorizados. Aceita curinga por domínio ("*@hospital.com.br"),
   * que é como o cupom corporativo costuma ser combinado.
   */
  emailsPermitidos?: string[] | null
}

export type LinhaParaCupom = {
  produtoId: string
  categoriaId?: string | null
  /** Total da linha em centavos, já com acabamentos. */
  total: number
}

export type ContextoDoCupom = {
  linhas: LinhaParaCupom[]
  subtotal: number
  freteCentavos?: number
  email?: string | null
  /** Quantas vezes o cupom já foi usado em pedidos pagos. */
  usos?: number
  /** Quantas vezes esta pessoa já usou. */
  usosDoCliente?: number
  agora?: Date
}

export type CupomAplicado = {
  codigo: string
  tipo: TipoDeCupom
  /** Quanto sai do subtotal, em centavos. */
  descontoCentavos: number
  /** O frete deixa de ser cobrado. */
  freteGratis: boolean
  /** Sobre quanto o desconto foi calculado. Zero quando é frete grátis. */
  baseCentavos: number
}

export type ResultadoDoCupom =
  | { ok: true; cupom: CupomAplicado }
  | { ok: false; motivo: string }

/** Códigos são comparados sem acento de maiúscula, espaço ou diferença de caixa. */
export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase().replace(/\s+/g, '')
}

/**
 * Vale? E quanto desconta?
 *
 * Único ponto de validação de cupom — mesmo princípio do `guardLot`. Se o
 * carrinho aceitasse por uma regra e o checkout por outra, a cliente veria
 * um valor na tela e pagaria outro.
 */
export function aplicarCupom(cupom: Cupom, contexto: ContextoDoCupom): ResultadoDoCupom {
  const agora = contexto.agora ?? new Date()

  if (!cupom.ativo) {
    return { ok: false, motivo: 'Este cupom não está mais válido.' }
  }

  if (cupom.validoDe && agora < new Date(cupom.validoDe)) {
    return { ok: false, motivo: 'Este cupom ainda não começou a valer.' }
  }

  if (cupom.validoAte && agora > new Date(cupom.validoAte)) {
    return { ok: false, motivo: 'Este cupom expirou.' }
  }

  if (cupom.gastoMinimoCentavos && contexto.subtotal < cupom.gastoMinimoCentavos) {
    return {
      ok: false,
      motivo: `Este cupom vale em pedidos a partir de ${emReais(cupom.gastoMinimoCentavos)}.`,
    }
  }

  if (typeof cupom.usoMaximo === 'number' && (contexto.usos ?? 0) >= cupom.usoMaximo) {
    return { ok: false, motivo: 'Este cupom já foi todo utilizado.' }
  }

  if (
    typeof cupom.usoMaximoPorCliente === 'number' &&
    (contexto.usosDoCliente ?? 0) >= cupom.usoMaximoPorCliente
  ) {
    return { ok: false, motivo: 'Você já usou este cupom.' }
  }

  if (!emailAutorizado(cupom, contexto.email)) {
    return { ok: false, motivo: 'Este cupom é de uso exclusivo e não vale para este e-mail.' }
  }

  if (cupom.tipo === 'frete_gratis') {
    return {
      ok: true,
      cupom: {
        codigo: normalizarCodigo(cupom.codigo),
        tipo: cupom.tipo,
        descontoCentavos: 0,
        freteGratis: true,
        baseCentavos: 0,
      },
    }
  }

  const base = baseElegivel(cupom, contexto.linhas)

  if (base <= 0) {
    return { ok: false, motivo: 'Este cupom não vale para os itens que estão no carrinho.' }
  }

  const desconto =
    cupom.tipo === 'percentual'
      ? Math.round((base * (cupom.percentual ?? 0)) / 100)
      : (cupom.valorCentavos ?? 0)

  if (desconto <= 0) {
    return { ok: false, motivo: 'Este cupom não está configurado com um desconto.' }
  }

  return {
    ok: true,
    cupom: {
      codigo: normalizarCodigo(cupom.codigo),
      tipo: cupom.tipo,
      // O desconto nunca passa do que ele pode descontar: cupom de R$ 200
      // num carrinho de R$ 150 desconta R$ 150, e o pedido não fica negativo.
      descontoCentavos: Math.min(desconto, base),
      freteGratis: false,
      baseCentavos: base,
    },
  }
}

/**
 * Sobre quanto o desconto incide.
 *
 * Sem restrição, é o carrinho inteiro. Com restrição de produto ou
 * categoria, só as linhas que se encaixam — é assim que o cupom do parceiro
 * não acaba dando desconto na coleção inteira sem querer.
 */
function baseElegivel(cupom: Cupom, linhas: LinhaParaCupom[]): number {
  const produtos = cupom.produtos ?? []
  const categorias = cupom.categorias ?? []

  if (produtos.length === 0 && categorias.length === 0) {
    return linhas.reduce((soma, linha) => soma + linha.total, 0)
  }

  return linhas
    .filter(
      (linha) =>
        produtos.includes(linha.produtoId) ||
        (linha.categoriaId ? categorias.includes(linha.categoriaId) : false),
    )
    .reduce((soma, linha) => soma + linha.total, 0)
}

function emailAutorizado(cupom: Cupom, email?: string | null): boolean {
  const permitidos = cupom.emailsPermitidos ?? []
  if (permitidos.length === 0) return true
  if (!email) return false

  const alvo = email.trim().toLowerCase()

  return permitidos.some((padrao) => {
    const limpo = padrao.trim().toLowerCase()
    if (!limpo) return false
    if (limpo.startsWith('*@')) return alvo.endsWith(limpo.slice(1))
    return alvo === limpo
  })
}

/**
 * Totais do pedido com o cupom.
 *
 * Devolve tudo o que a tela precisa mostrar, para nenhuma soma ser refeita
 * em JavaScript do navegador.
 */
export function totalComCupom(
  subtotal: number,
  frete: number,
  cupom?: CupomAplicado | null,
): { desconto: number; frete: number; total: number } {
  if (!cupom) return { desconto: 0, frete, total: subtotal + frete }

  const freteCobrado = cupom.freteGratis ? 0 : frete
  const desconto = Math.min(cupom.descontoCentavos, subtotal)

  return {
    desconto,
    frete: freteCobrado,
    total: Math.max(0, subtotal - desconto + freteCobrado),
  }
}

function emReais(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
