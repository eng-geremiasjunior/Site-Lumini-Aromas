import { createHash } from 'node:crypto'

/**
 * Montagem dos eventos enviados à Conversions API da Meta.
 *
 * Resolve o problema central do negócio: hoje a maior parte das vendas fecha
 * no WhatsApp e a Meta nunca fica sabendo, então o algoritmo continua
 * otimizando para quem conversa, e não para quem compra.
 *
 * Duas regras verificadas na documentação que definem o desenho:
 *   - a Offline Conversions API foi desligada em 14/05/2025; toda venda
 *     manual passa pela própria Conversions API, com o `action_source` certo;
 *   - o `ctwa_clid`, que liga a conversa ao anúncio, só chega pelo webhook da
 *     WhatsApp Cloud API e vale por 7 dias. Sem ele, o vínculo é feito por
 *     e-mail e telefone com hash, ou pelos cookies gravados no clique do botão.
 */

/** Dados do cliente. Alguns campos vão com hash, outros não podem ir. */
export type UserData = {
  email?: string | null
  phone?: string | null
  firstName?: string | null
  lastName?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  country?: string | null
  /** Identificador do cliente na loja. */
  externalId?: string | null
  /** Cookie _fbp. Vai sem hash. */
  fbp?: string | null
  /** Cookie _fbc, ou montado a partir do fbclid. Vai sem hash. */
  fbc?: string | null
  clientIpAddress?: string | null
  clientUserAgent?: string | null
  /** Identificador do clique no anúncio que abriu a conversa no WhatsApp. */
  ctwaClid?: string | null
  whatsappBusinessAccountId?: string | null
}

export type ActionSource = 'website' | 'business_messaging' | 'chat' | 'phone_call' | 'other'

export type MetaEventName =
  | 'Purchase'
  | 'Lead'
  | 'Contact'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'CustomizeProduct'

export type ContentItem = {
  id: string
  quantity: number
  itemPrice: number
}

export type MetaEvent = {
  event_name: MetaEventName
  event_time: number
  event_id: string
  action_source: ActionSource
  event_source_url?: string
  messaging_channel?: 'whatsapp'
  opt_out?: boolean
  user_data: Record<string, string | string[]>
  custom_data?: Record<string, unknown>
}

const MAX_EVENT_AGE_SECONDS = 7 * 24 * 60 * 60

// --------------------------------------------------------------- normalização

/** E-mail: sem espaços e em minúsculas antes do hash. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Telefone: só dígitos, com código do país e sem zeros à esquerda.
 * "(33) 99947-8774" vira "5533999478774".
 */
export function normalizePhone(value: string, defaultCountryCode = '55'): string {
  let digits = value.replace(/\D/g, '')
  if (digits === '') return ''

  digits = digits.replace(/^0+/, '')
  if (!digits.startsWith(defaultCountryCode)) digits = `${defaultCountryCode}${digits}`
  return digits
}

/** Nome, cidade e estado: minúsculas, sem acento e sem pontuação. */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
}

/** CEP: só dígitos. */
export function normalizeZip(value: string): string {
  return value.replace(/\D/g, '')
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/**
 * Monta o cookie `_fbc` a partir do `fbclid` da URL, quando o Pixel ainda
 * não gravou o cookie. Formato exigido: fb.1.<milissegundos>.<fbclid>.
 */
export function buildFbc(fbclid: string, timestampMs: number): string {
  return `fb.1.${timestampMs}.${fbclid}`
}

// -------------------------------------------------------------------- payload

/**
 * Aplica hash nos campos que exigem, e deixa em texto os que não podem ter.
 * Enviar `fbp` ou `ctwa_clid` com hash faz a Meta descartar o vínculo em
 * silêncio: o evento chega, mas não casa com o anúncio.
 */
export function buildUserData(user: UserData): Record<string, string | string[]> {
  const data: Record<string, string | string[]> = {}

  const hashed = (value: string | null | undefined, normalizer: (input: string) => string) => {
    if (!value) return undefined
    const normalized = normalizer(value)
    return normalized === '' ? undefined : [sha256(normalized)]
  }

  const em = hashed(user.email, normalizeEmail)
  if (em) data.em = em

  const ph = hashed(user.phone, (value) => normalizePhone(value))
  if (ph) data.ph = ph

  const fn = hashed(user.firstName, normalizeName)
  if (fn) data.fn = fn

  const ln = hashed(user.lastName, normalizeName)
  if (ln) data.ln = ln

  const ct = hashed(user.city, normalizeName)
  if (ct) data.ct = ct

  const st = hashed(user.state, normalizeName)
  if (st) data.st = st

  const zp = hashed(user.zip, normalizeZip)
  if (zp) data.zp = zp

  // O país deve ir sempre que houver endereço.
  const country = user.country ?? (user.zip || user.city ? 'br' : null)
  const cn = hashed(country, normalizeName)
  if (cn) data.country = cn

  if (user.externalId) data.external_id = [sha256(user.externalId)]

  // Estes NÃO levam hash.
  if (user.fbp) data.fbp = user.fbp
  if (user.fbc) data.fbc = user.fbc
  if (user.clientIpAddress) data.client_ip_address = user.clientIpAddress
  if (user.clientUserAgent) data.client_user_agent = user.clientUserAgent
  if (user.ctwaClid) data.ctwa_clid = user.ctwaClid
  if (user.whatsappBusinessAccountId) {
    data.whatsapp_business_account_id = user.whatsappBusinessAccountId
  }

  return data
}

export type ActionSourceDecision = {
  actionSource: ActionSource
  messagingChannel?: 'whatsapp'
  reason: string
}

/**
 * Decide como o evento será atribuído.
 *
 * A ordem importa e um pedido só pode ser enviado por um caminho. Mandar a
 * mesma venda duas vezes com `action_source` diferente conta duas compras.
 */
export function chooseActionSource(input: {
  channel: 'site' | 'whatsapp' | 'instagram_dm' | 'admin'
  user: UserData
  /** Momento do clique no anúncio, em segundos. */
  ctwaClickedAt?: number | null
  /** Momento do evento, em segundos. */
  eventTime: number
}): ActionSourceDecision {
  if (input.channel === 'site') {
    return { actionSource: 'website', reason: 'Compra feita no site.' }
  }

  const temCtwa = Boolean(input.user.ctwaClid && input.user.whatsappBusinessAccountId)
  const dentroDaJanela =
    input.ctwaClickedAt === null || input.ctwaClickedAt === undefined
      ? true
      : input.eventTime - input.ctwaClickedAt <= MAX_EVENT_AGE_SECONDS

  if (temCtwa && dentroDaJanela) {
    return {
      actionSource: 'business_messaging',
      messagingChannel: 'whatsapp',
      reason: 'Conversa nasceu de um anúncio de clique para WhatsApp.',
    }
  }

  if (temCtwa && !dentroDaJanela) {
    // Passou dos 7 dias: a Meta não processa mais o vínculo com o anúncio.
    return {
      actionSource: 'chat',
      reason:
        'O clique no anúncio tem mais de 7 dias, então o vínculo direto com o anúncio não é aceito. Enviado como conversa, com e-mail e telefone.',
    }
  }

  if (input.user.fbc || input.user.fbp) {
    return {
      actionSource: 'website',
      reason: 'Cliente veio do site antes de chamar no WhatsApp; usa os cookies gravados no clique.',
    }
  }

  return {
    actionSource: 'chat',
    reason: 'Venda de conversa, sem clique rastreado. Vínculo por e-mail e telefone.',
  }
}

export type BuildEventInput = {
  eventName: MetaEventName
  /** Número do pedido no Purchase; identificador único nos demais. */
  eventId: string
  /** Momento do evento, em segundos. */
  eventTime: number
  channel: 'site' | 'whatsapp' | 'instagram_dm' | 'admin'
  user: UserData
  ctwaClickedAt?: number | null
  eventSourceUrl?: string | null
  valueCents?: number | null
  contents?: ContentItem[]
  orderId?: string | null
  optOut?: boolean
}

export type BuildEventResult =
  | { ok: true; event: MetaEvent; decision: ActionSourceDecision }
  | { ok: false; code: 'EVENTO_ANTIGO' | 'SEM_VALOR' | 'SEM_IDENTIFICADOR'; message: string }

export function buildEvent(input: BuildEventInput, now: number): BuildEventResult {
  const age = now - input.eventTime
  if (age > MAX_EVENT_AGE_SECONDS) {
    return {
      ok: false,
      code: 'EVENTO_ANTIGO',
      message:
        'A Meta só aceita eventos com até 7 dias. Lance a venda do WhatsApp em até uma semana para ela contar no anúncio.',
    }
  }

  if (input.eventName === 'Purchase' && (!input.valueCents || input.valueCents <= 0)) {
    return { ok: false, code: 'SEM_VALOR', message: 'Uma compra precisa de valor para ser enviada.' }
  }

  const userData = buildUserData(input.user)
  const temIdentificador = Object.keys(userData).some((key) =>
    ['em', 'ph', 'fbp', 'fbc', 'ctwa_clid', 'external_id'].includes(key),
  )
  if (!temIdentificador) {
    return {
      ok: false,
      code: 'SEM_IDENTIFICADOR',
      message:
        'Sem e-mail, telefone ou cookie de origem a Meta não consegue ligar a venda a ninguém. Peça ao menos o telefone do cliente.',
    }
  }

  const decision = chooseActionSource({
    channel: input.channel,
    user: input.user,
    ctwaClickedAt: input.ctwaClickedAt,
    eventTime: input.eventTime,
  })

  const event: MetaEvent = {
    event_name: input.eventName,
    event_time: input.eventTime,
    event_id: input.eventId,
    action_source: decision.actionSource,
    user_data: userData,
  }

  if (decision.messagingChannel) event.messaging_channel = decision.messagingChannel
  // `event_source_url` é obrigatório quando o evento é do site.
  if (decision.actionSource === 'website' && input.eventSourceUrl) {
    event.event_source_url = input.eventSourceUrl
  }
  if (input.optOut) event.opt_out = true

  const customData: Record<string, unknown> = {}
  if (input.valueCents && input.valueCents > 0) {
    customData.value = Number((input.valueCents / 100).toFixed(2))
    customData.currency = 'BRL'
  }
  if (input.contents?.length) {
    customData.content_type = 'product'
    customData.contents = input.contents.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      item_price: Number((item.itemPrice / 100).toFixed(2)),
    }))
    customData.content_ids = input.contents.map((item) => item.id)
  }
  if (input.orderId) customData.order_id = input.orderId

  if (Object.keys(customData).length > 0) event.custom_data = customData

  return { ok: true, event, decision }
}

/** Corpo do POST para /{DATASET_ID}/events. Até 1.000 eventos por chamada. */
export function buildEventsPayload(
  events: MetaEvent[],
  options?: { testEventCode?: string | null },
): { data: MetaEvent[]; test_event_code?: string } {
  const payload: { data: MetaEvent[]; test_event_code?: string } = { data: events.slice(0, 1000) }
  if (options?.testEventCode) payload.test_event_code = options.testEventCode
  return payload
}
