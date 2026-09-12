/**
 * A etiqueta do Google: uma só, montada aqui.
 *
 * O site antigo carrega o Google por três caminhos ao mesmo tempo — Site
 * Kit, GTM4WP e PixelYourSite — e cada um dispara a sua versão do mesmo
 * evento. O resultado é o que se vê hoje: números que não batem, compras
 * contadas duas vezes e públicos de remarketing em que não dá para confiar.
 *
 * Aqui existe **um único ponto de emissão**. Nenhuma tag é colada por fora,
 * nenhum contêiner do Tag Manager entra no meio. Quem dispara é o código da
 * loja, que já sabe o preço certo (vem do motor de lote) e o identificador
 * certo (vem do mesmo lugar que o feed).
 *
 * ## Por que o identificador importa tanto
 *
 * O remarketing dinâmico do Google — o anúncio que mostra exatamente a vela
 * que a pessoa olhou — funciona cruzando o `id` que o navegador envia com o
 * `id` que está no feed do Merchant Center. Se os dois diferirem em um
 * caractere, nada dá erro: o evento chega, o público enche, e o anúncio
 * mostra um produto genérico. Por isso o id vem de `ofertaId()`, a mesma
 * função que gera o feed.
 *
 * ## Consentimento
 *
 * Tudo começa negado (Consent Mode). Sem aceite, o Google recebe no máximo
 * um sinal anônimo e sem cookie; com aceite, passa a receber o evento
 * completo. É o que a LGPD exige para cookie de publicidade e é o que
 * mantém o remarketing legítimo.
 */

/** O que o visitante autorizou. Começa tudo em falso. */
export type Consentimento = {
  /** Medição de audiência: GA4. */
  analise: boolean
  /** Publicidade e remarketing: Google Ads, Meta. */
  publicidade: boolean
}

/**
 * Muda quando o texto do aviso muda. Fica gravado junto com a escolha, para
 * provar *o que* a pessoa aceitou, e não só que aceitou.
 */
export const VERSAO_DO_AVISO = '2026-09-12'

export const COOKIE_DO_CONSENTIMENTO = 'lumini_consentimento'

/** Um ano. Depois disso o aviso volta a aparecer. */
export const DIAS_DE_VALIDADE_DO_CONSENTIMENTO = 365

export const SEM_CONSENTIMENTO: Consentimento = { analise: false, publicidade: false }

export type EscolhaGravada = Consentimento & {
  versao: string
  em: string
}

/** Serializa a escolha para o cookie. */
export function gravarEscolha(consentimento: Consentimento, agora: Date): string {
  const escolha: EscolhaGravada = {
    analise: consentimento.analise,
    publicidade: consentimento.publicidade,
    versao: VERSAO_DO_AVISO,
    em: agora.toISOString(),
  }

  return JSON.stringify(escolha)
}

/**
 * Lê a escolha do cookie.
 *
 * Devolve `null` quando não há escolha — que é diferente de ter recusado.
 * Sem escolha, o aviso aparece; com recusa, ele não volta a incomodar.
 * Escolha feita sobre uma versão antiga do aviso também conta como sem
 * escolha, porque a pessoa aceitou outro texto.
 */
export function lerEscolha(valorDoCookie: string | null | undefined): EscolhaGravada | null {
  if (!valorDoCookie) return null

  try {
    const bruto = JSON.parse(valorDoCookie) as Partial<EscolhaGravada>
    if (typeof bruto.analise !== 'boolean' || typeof bruto.publicidade !== 'boolean') return null
    if (bruto.versao !== VERSAO_DO_AVISO) return null

    return {
      analise: bruto.analise,
      publicidade: bruto.publicidade,
      versao: bruto.versao,
      em: typeof bruto.em === 'string' ? bruto.em : '',
    }
  } catch {
    return null
  }
}

// --------------------------------------------------------------- destinos

export type Destinos = {
  /** Medição: G-XXXXXXX. */
  ga4: string | null
  /** Anúncios e remarketing: AW-XXXXXXXXX. */
  ads: string | null
  /** Rótulo da conversão de compra: AW-XXXXXXXXX/abcDEfgh. */
  conversaoDeCompra: string | null
  /** O que foi descartado e por quê, para aparecer na saúde das integrações. */
  avisos: string[]
}

/**
 * Aceita só o que é do tipo certo.
 *
 * Um `GTM-XXXX` no campo do GA4 não carrega o Analytics: carrega um
 * contêiner do Tag Manager que pode conter qualquer coisa. Em vez de
 * aceitar em silêncio e refazer a bagunça de tags sobrepostas, o valor é
 * descartado com um aviso explícito.
 */
export function destinosConfigurados(env: {
  ga4?: string | null
  ads?: string | null
  conversaoDeCompra?: string | null
}): Destinos {
  const avisos: string[] = []

  const ga4 = limpar(env.ga4)
  const ads = limpar(env.ads)
  const rotulo = limpar(env.conversaoDeCompra)

  let ga4Valido: string | null = null
  if (ga4) {
    if (/^G-[A-Z0-9]{6,}$/i.test(ga4)) {
      ga4Valido = ga4.toUpperCase()
    } else if (/^GTM-/i.test(ga4)) {
      avisos.push(
        'O campo do Google Analytics recebeu um identificador do Tag Manager (GTM-). A loja dispara os eventos direto, sem Tag Manager: use o identificador da propriedade, que começa com G-.',
      )
    } else {
      avisos.push('Identificador do Google Analytics ignorado por não ter o formato G-: ' + ga4)
    }
  }

  let adsValido: string | null = null
  if (ads) {
    if (/^AW-[0-9]{6,}$/i.test(ads)) adsValido = ads.toUpperCase()
    else avisos.push('Identificador do Google Ads ignorado por não ter o formato AW-: ' + ads)
  }

  let conversaoValida: string | null = null
  if (rotulo) {
    const completo = rotulo.includes('/')
      ? rotulo
      : adsValido
        ? adsValido + '/' + rotulo
        : null

    if (completo && /^AW-[0-9]{6,}\/[\w-]+$/i.test(completo)) conversaoValida = completo
    else
      avisos.push(
        'Rótulo da conversão de compra ignorado. Ele tem o formato AW-000000000/AbCdEfGhIj e aparece no Google Ads em Objetivos › Conversões › a ação de compra.',
      )
  }

  if (adsValido && !conversaoValida) {
    avisos.push(
      'O Google Ads está configurado, mas sem o rótulo da conversão de compra: o remarketing funciona e a venda não é contada como conversão.',
    )
  }

  return { ga4: ga4Valido, ads: adsValido, conversaoDeCompra: conversaoValida, avisos }
}

function limpar(valor: string | null | undefined): string | null {
  const texto = (valor ?? '').trim()
  return texto === '' ? null : texto
}

// ----------------------------------------------------------- consentimento

export type EstadoDeConsentimento = Record<string, 'granted' | 'denied' | number>

/**
 * O estado inicial, aplicado **antes** de carregar o gtag.
 *
 * `wait_for_update` dá meio segundo para a escolha já gravada ser aplicada
 * antes do primeiro disparo, senão a visita de quem já aceitou seria
 * contada como anônima.
 */
export function consentimentoInicial(): EstadoDeConsentimento {
  return {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500,
  }
}

export function consentimentoAtualizado(consentimento: Consentimento): EstadoDeConsentimento {
  const publicidade = consentimento.publicidade ? 'granted' : 'denied'

  return {
    ad_storage: publicidade,
    ad_user_data: publicidade,
    ad_personalization: publicidade,
    analytics_storage: consentimento.analise ? 'granted' : 'denied',
  }
}

// -------------------------------------------------------------- os eventos

export type ItemDoEvento = {
  /** O mesmo id do feed. Vem de `ofertaId()`. */
  id: string
  nome: string
  /** Em centavos, como todo dinheiro na loja. */
  precoEmCentavos: number
  /** Quantos lotes. A peça é detalhe do lote, não a unidade vendida. */
  quantidade: number
  categoria?: string | null
  /** O aroma. */
  variacao?: string | null
}

export type EventoDaLoja =
  | 'view_item'
  | 'add_to_cart'
  | 'begin_checkout'
  | 'purchase'
  | 'generate_lead'

export type DadosDoEvento = {
  itens: ItemDoEvento[]
  /** Total em centavos. Quando ausente, é a soma dos itens. */
  valorEmCentavos?: number
  /** Só na compra. */
  idDoPedido?: string | null
  freteEmCentavos?: number | null
  cupom?: string | null
}

/**
 * Reais com duas casas, a partir de centavos.
 *
 * Soma em inteiro e divide uma vez só no fim: dividir item a item e somar
 * depois é o caminho curto para o total do evento ficar um centavo diferente
 * do total do pedido.
 */
export function emReais(centavos: number): number {
  return Math.round(centavos) / 100
}

function totalDosItens(itens: ItemDoEvento[]): number {
  return itens.reduce((soma, item) => soma + item.precoEmCentavos * item.quantidade, 0)
}

/** O evento no formato do Google Analytics 4. */
export function eventoParaGa4(nome: EventoDaLoja, dados: DadosDoEvento): Record<string, unknown> {
  const valor = dados.valorEmCentavos ?? totalDosItens(dados.itens)

  const params: Record<string, unknown> = {
    currency: 'BRL',
    value: emReais(valor),
    items: dados.itens.map((item) => ({
      item_id: item.id,
      item_name: item.nome,
      item_category: item.categoria ?? undefined,
      item_variant: item.variacao ?? undefined,
      price: emReais(item.precoEmCentavos),
      quantity: item.quantidade,
    })),
  }

  if (nome === 'purchase' && dados.idDoPedido) params.transaction_id = dados.idDoPedido
  if (dados.freteEmCentavos != null) params.shipping = emReais(dados.freteEmCentavos)
  if (dados.cupom) params.coupon = dados.cupom

  return params
}

/**
 * O mesmo evento no formato do Google Ads.
 *
 * Vai separado de propósito. O GA4 quer `item_id`; o Ads quer `id` e
 * `google_business_vertical`. Um objeto que serve para os dois funciona por
 * acidente e quebra quando um dos lados muda de formato — e quebra em
 * silêncio, que é o pior tipo de quebra em publicidade.
 */
export function eventoParaAds(
  nome: EventoDaLoja,
  dados: DadosDoEvento,
  destino: string,
): Record<string, unknown> {
  const valor = dados.valorEmCentavos ?? totalDosItens(dados.itens)

  const params: Record<string, unknown> = {
    send_to: destino,
    currency: 'BRL',
    value: emReais(valor),
    items: dados.itens.map((item) => ({
      id: item.id,
      google_business_vertical: 'retail',
      price: emReais(item.precoEmCentavos),
      quantity: item.quantidade,
    })),
  }

  if (nome === 'purchase' && dados.idDoPedido) params.transaction_id = dados.idDoPedido

  return params
}

/**
 * Dados do comprador para a conversão aprimorada.
 *
 * O gtag aplica o hash no navegador antes de enviar; nada sai em texto
 * aberto. Serve para o Google reconhecer a compra quando o cookie não
 * sobreviveu — que é a maioria dos casos no iPhone.
 */
export function dadosDoComprador(entrada: {
  email?: string | null
  telefone?: string | null
  nome?: string | null
  cidade?: string | null
  uf?: string | null
  cep?: string | null
}): Record<string, unknown> | null {
  const email = (entrada.email ?? '').trim().toLowerCase()
  const telefone = normalizarTelefone(entrada.telefone)

  if (!email && !telefone) return null

  const partes = (entrada.nome ?? '').trim().split(/\s+/).filter(Boolean)

  const endereco: Record<string, string> = { country: 'BR' }
  if (partes[0]) endereco.first_name = partes[0].toLowerCase()
  if (partes.length > 1) endereco.last_name = partes[partes.length - 1].toLowerCase()
  if (entrada.cidade) endereco.city = entrada.cidade.trim().toLowerCase()
  if (entrada.uf) endereco.region = entrada.uf.trim().toLowerCase()
  if (entrada.cep) endereco.postal_code = entrada.cep.replace(/\D/g, '')

  const saida: Record<string, unknown> = {}
  if (email) saida.email = email
  if (telefone) saida.phone_number = telefone
  if (Object.keys(endereco).length > 1) saida.address = endereco

  return saida
}

/** O Google exige E.164: mais, código do país e só dígitos. */
function normalizarTelefone(valor: string | null | undefined): string | null {
  const digitos = (valor ?? '').replace(/\D/g, '')
  if (digitos.length < 10) return null
  return digitos.startsWith('55') ? '+' + digitos : '+55' + digitos
}
