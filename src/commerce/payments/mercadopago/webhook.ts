import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Validação da notificação do Mercado Pago.
 *
 * Sem isso, qualquer pessoa que descubra a URL do webhook consegue marcar
 * pedidos como pagos. A assinatura vem no cabeçalho `x-signature`, no formato
 * `ts=<milissegundos>,v1=<hash>`, e o hash é um HMAC-SHA256 do texto
 * `id:{data.id};request-id:{x-request-id};ts:{ts};` com a chave secreta
 * gerada ao salvar a URL no painel.
 *
 * Regras que costumam passar despercebidas e quebram a validação:
 *   - `data.id` vem da query string da requisição, não do corpo;
 *   - se `data.id` tiver letras, precisa ser convertido para minúsculas;
 *   - partes ausentes são omitidas do texto, sem deixar o rótulo sozinho.
 */

export type SignatureParts = { ts: string; v1: string }

/** Separa `ts=...,v1=...` do cabeçalho. */
export function parseSignatureHeader(header: string | null | undefined): SignatureParts | null {
  if (!header) return null

  const parts: Record<string, string> = {}
  for (const chunk of header.split(',')) {
    const index = chunk.indexOf('=')
    if (index <= 0) continue
    const key = chunk.slice(0, index).trim()
    const value = chunk.slice(index + 1).trim()
    if (key) parts[key] = value
  }

  if (!parts.ts || !parts.v1) return null
  return { ts: parts.ts, v1: parts.v1 }
}

/** Monta o texto assinado, na ordem exigida pelo Mercado Pago. */
export function buildSignatureTemplate(input: {
  dataId?: string | null
  requestId?: string | null
  ts: string
}): string {
  let template = ''
  if (input.dataId) template += `id:${normalizeDataId(input.dataId)};`
  if (input.requestId) template += `request-id:${input.requestId};`
  template += `ts:${input.ts};`
  return template
}

/** O identificador é comparado em minúsculas quando contém letras. */
export function normalizeDataId(dataId: string): string {
  return /[a-zA-Z]/.test(dataId) ? dataId.toLowerCase() : dataId
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'sem_assinatura' | 'assinatura_invalida' | 'expirada' | 'sem_segredo' }

export type VerifyInput = {
  signatureHeader: string | null | undefined
  requestId: string | null | undefined
  /** Valor de `data.id` vindo da query string da requisição. */
  dataId: string | null | undefined
  secret: string | undefined
  /** Agora, em milissegundos. Injetado para o teste não depender do relógio. */
  now: number
  /** Janela aceita entre o carimbo da notificação e agora. Padrão: 10 minutos. */
  toleranceMs?: number
}

/**
 * Confere a assinatura e o carimbo de tempo.
 *
 * A comparação é feita em tempo constante para não vazar, pela diferença de
 * tempo de resposta, quantos caracteres do hash estavam certos.
 */
export function verifyWebhookSignature(input: VerifyInput): VerifyResult {
  if (!input.secret) return { ok: false, reason: 'sem_segredo' }

  const parts = parseSignatureHeader(input.signatureHeader)
  if (!parts) return { ok: false, reason: 'sem_assinatura' }

  const timestamp = Number(parts.ts)
  if (!Number.isFinite(timestamp)) return { ok: false, reason: 'sem_assinatura' }

  const tolerance = input.toleranceMs ?? 10 * 60 * 1000
  if (Math.abs(input.now - timestamp) > tolerance) return { ok: false, reason: 'expirada' }

  const template = buildSignatureTemplate({
    dataId: input.dataId,
    requestId: input.requestId,
    ts: parts.ts,
  })

  const expected = createHmac('sha256', input.secret).update(template).digest('hex')

  if (!safeEqualHex(expected, parts.v1)) return { ok: false, reason: 'assinatura_invalida' }
  return { ok: true }
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  } catch {
    return false
  }
}

/** Gera uma assinatura válida. Serve para testar e para simular notificações. */
export function signWebhook(input: {
  dataId?: string | null
  requestId?: string | null
  ts: string
  secret: string
}): string {
  const template = buildSignatureTemplate(input)
  const hash = createHmac('sha256', input.secret).update(template).digest('hex')
  return `ts=${input.ts},v1=${hash}`
}

/**
 * Chave de idempotência da notificação.
 *
 * O Mercado Pago reenvia a mesma notificação até receber um 200, e pode
 * mandar `payment.created` e `payment.updated` do mesmo pagamento. Guardar
 * esta chave evita disparar duas vezes o evento de compra para a Meta e
 * lançar a mesma receita duas vezes no DRE.
 */
export function webhookDedupeKey(input: { type?: string; action?: string; dataId: string }): string {
  return [input.type ?? 'payment', input.action ?? '', normalizeDataId(input.dataId)]
    .filter(Boolean)
    .join(':')
}
