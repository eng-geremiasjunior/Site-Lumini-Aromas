/**
 * Ligação entre o clique no botão do WhatsApp e a venda que fecha na conversa.
 *
 * O clique no `wa.me` sai do site e não passa por nenhum analytics: a partir
 * dali a origem se perde. A solução usada no mercado é gerar um código curto
 * no servidor, gravar junto dele tudo o que se sabe da origem (UTM, fbclid,
 * cookies do Pixel, gclid) e embutir esse código na mensagem que o cliente
 * envia. Quando a venda fecha, o dono escolhe o código no painel e a venda
 * volta a ter origem, indo para a Meta e para o Google Ads.
 */

/** Tudo que dá para saber sobre de onde o visitante veio. */
export type Attribution = {
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmContent?: string | null
  utmTerm?: string | null
  referrer?: string | null
  landingPage?: string | null
  fbclid?: string | null
  fbp?: string | null
  fbc?: string | null
  gclid?: string | null
  gbraid?: string | null
  wbraid?: string | null
  gaClientId?: string | null
  gaSessionId?: string | null
  deviceType?: 'desktop' | 'mobile' | 'tablet' | null
}

const REF_PREFIX = 'LUM'
// Sem vogais nem caracteres que se confundem (0/O, 1/I): o código é lido
// em voz alta e digitado à mão com frequência.
const REF_ALPHABET = '23456789BCDFGHJKLMNPQRSTVWXZ'

/** Gera um código curto de lead, como LUM-7K3F. */
export function generateLeadRef(random: () => number = Math.random, length = 4): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += REF_ALPHABET[Math.floor(random() * REF_ALPHABET.length)]
  }
  return `${REF_PREFIX}-${code}`
}

const REF_PATTERN = new RegExp(`${REF_PREFIX}-[${REF_ALPHABET}]{3,8}`, 'i')

/** Acha o código dentro de uma mensagem colada do WhatsApp. */
export function parseLeadRef(message: string): string | null {
  const match = message.match(REF_PATTERN)
  return match ? match[0].toUpperCase() : null
}

export type WhatsAppLinkInput = {
  /** Número com código do país, só dígitos. Ex.: 5533999478774. */
  phone: string
  ref?: string | null
  productName?: string | null
  variantLabel?: string | null
  qty?: number | null
  /** Preço do lote em centavos, para o cliente já chegar sabendo. */
  lotPriceCents?: number | null
  pageUrl?: string | null
  /** Mensagem própria, quando o botão não está numa página de produto. */
  customText?: string | null
}

/**
 * Monta o link do botão flutuante com a mensagem já escrita.
 *
 * A mensagem é montada no servidor de propósito: assim o código do lead é
 * gravado antes de o cliente sair do site, e não depende de JavaScript.
 */
export function buildWhatsAppLink(input: WhatsAppLinkInput): string {
  const text = input.customText ?? buildWhatsAppMessage(input)
  return `https://wa.me/${input.phone}?text=${encodeURIComponent(text)}`
}

export function buildWhatsAppMessage(input: WhatsAppLinkInput): string {
  const partes: string[] = []

  if (input.productName) {
    const detalhes = [input.variantLabel, input.qty ? `${input.qty} peças` : null]
      .filter(Boolean)
      .join(', ')

    partes.push(
      detalhes
        ? `Olá! Tenho interesse em ${input.productName} (${detalhes}).`
        : `Olá! Tenho interesse em ${input.productName}.`,
    )

    if (input.lotPriceCents && input.lotPriceCents > 0) {
      const preco = (input.lotPriceCents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
      partes.push(`Vi no site por ${preco}.`)
    }
  } else {
    partes.push('Olá! Gostaria de um orçamento de lembrancinhas.')
  }

  if (input.pageUrl) partes.push(input.pageUrl)
  if (input.ref) partes.push(`Ref ${input.ref}`)

  return partes.join('\n')
}

/** Lê a origem da requisição: parâmetros da URL mais cookies do navegador. */
export function captureAttribution(input: {
  searchParams: URLSearchParams | Record<string, string | undefined>
  cookies?: Record<string, string | undefined>
  referrer?: string | null
  landingPage?: string | null
  userAgent?: string | null
}): Attribution {
  const get = (key: string): string | null => {
    if (input.searchParams instanceof URLSearchParams) return input.searchParams.get(key)
    return input.searchParams[key] ?? null
  }

  const cookies = input.cookies ?? {}
  const fbclid = get('fbclid')

  return {
    utmSource: get('utm_source'),
    utmMedium: get('utm_medium'),
    utmCampaign: get('utm_campaign'),
    utmContent: get('utm_content'),
    utmTerm: get('utm_term'),
    referrer: input.referrer ?? null,
    landingPage: input.landingPage ?? null,
    fbclid,
    fbp: cookies._fbp ?? null,
    // Quando o Pixel ainda não gravou o cookie, monta a partir do fbclid.
    fbc: cookies._fbc ?? null,
    gclid: get('gclid'),
    gbraid: get('gbraid'),
    wbraid: get('wbraid'),
    gaClientId: parseGaClientId(cookies._ga),
    gaSessionId: null,
    deviceType: detectDevice(input.userAgent),
  }
}

/** O cookie `_ga` tem o formato GA1.1.<clientId1>.<clientId2>. */
export function parseGaClientId(cookie: string | undefined | null): string | null {
  if (!cookie) return null
  const parts = cookie.split('.')
  if (parts.length < 4) return null
  return `${parts[2]}.${parts[3]}`
}

function detectDevice(userAgent: string | null | undefined): Attribution['deviceType'] {
  if (!userAgent) return null
  const ua = userAgent.toLowerCase()
  if (/ipad|tablet/.test(ua)) return 'tablet'
  if (/mobi|android|iphone/.test(ua)) return 'mobile'
  return 'desktop'
}

/**
 * Resume a origem em uma frase, para a lista de leads e a coluna Origem
 * do pedido. O dono precisa bater o olho e saber de onde veio a venda.
 */
export function describeAttribution(attribution: Attribution): string {
  if (attribution.utmSource) {
    const campanha = attribution.utmCampaign ? ` (${attribution.utmCampaign})` : ''
    return `${attribution.utmSource}${campanha}`
  }
  if (attribution.fbclid || attribution.fbc) return 'Anúncio da Meta'
  if (attribution.gclid || attribution.gbraid || attribution.wbraid) return 'Google Ads'

  if (attribution.referrer) {
    try {
      const host = new URL(attribution.referrer).hostname.replace(/^www\./, '')
      if (host.includes('instagram')) return 'Instagram'
      if (host.includes('facebook')) return 'Facebook'
      if (host.includes('google')) return 'Busca do Google'
      return host
    } catch {
      return 'Origem desconhecida'
    }
  }

  return 'Acesso direto'
}
