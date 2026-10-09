import type { DadosDoEvento, EventoDaLoja } from '../../../commerce/marketing/google-tag.ts'
import {
  eventoParaPixel,
  idDoEvento,
  nomeNaMeta,
  pixelConfigurado,
} from '../../../commerce/marketing/meta-pixel.ts'

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void
      queue?: unknown[]
      push?: unknown
      loaded?: boolean
      version?: string
    }
    _fbq?: unknown
  }
}

/** O identificador entra na compilação, então validar aqui não custa nada. */
export const PIXEL = pixelConfigurado(process.env.NEXT_PUBLIC_META_PIXEL_ID)

const ENDERECO_DO_PIXEL = 'https://connect.facebook.net/en_US/fbevents.js'

/**
 * Carrega o Pixel — e só depois do aceite.
 *
 * O Google tem o Consent Mode: a tag carrega sempre e obedece a um estado
 * de consentimento. A Meta não tem equivalente de verdade; o Pixel grava o
 * cookie `_fbp` no instante em que carrega. Então aqui o caminho é outro:
 * o script só entra na página quando a pessoa já disse sim para
 * publicidade. É por isso que isto é uma função chamada, e não uma tag
 * escrita no HTML como a do Google.
 *
 * Chamar duas vezes não faz nada: o `window.fbq` já existente é a trava.
 */
export function carregarPixel(): void {
  if (!PIXEL) return
  if (typeof window === 'undefined') return
  if (window.fbq) return

  const fila: unknown[] = []

  const fbq = function (this: unknown, ...args: unknown[]) {
    if (fbq.callMethod) {
      fbq.callMethod.apply(fbq, args)
      return
    }
    fbq.queue?.push(args)
  } as NonNullable<Window['fbq']>

  fbq.queue = fila
  fbq.loaded = true
  fbq.version = '2.0'
  // O `fbevents.js` lê `push` de dentro de si mesmo; a referência circular
  // é do próprio trecho oficial da Meta, não um descuido.
  fbq.push = fbq

  window.fbq = fbq
  if (!window._fbq) window._fbq = fbq

  const tag = document.createElement('script')
  tag.async = true
  tag.src = ENDERECO_DO_PIXEL
  document.head.appendChild(tag)

  fbq('init', PIXEL)
  fbq('track', 'PageView')
}

/**
 * Desliga o envio quando a pessoa muda de ideia.
 *
 * O script já carregado não sai da página, mas para de mandar evento. É o
 * que a própria Meta documenta para revogação.
 */
export function revogarPixel(): void {
  window.fbq?.('consent', 'revoke')
}

/**
 * Manda um evento para a Meta.
 *
 * O `eventID` vai junto porque o mesmo evento também sai do servidor pela
 * CAPI. Igual nos dois lados, a Meta junta e conta uma venda; diferente,
 * conta duas.
 */
export function dispararNaMeta(nome: EventoDaLoja, dados: DadosDoEvento): void {
  const fbq = typeof window === 'undefined' ? undefined : window.fbq
  // Sem aceite, o Pixel nunca foi carregado e `fbq` não existe. Não há o
  // que enfileirar: o evento simplesmente não acontece, que é o combinado.
  if (!fbq) return

  fbq('track', nomeNaMeta(nome), eventoParaPixel(nome, dados), {
    eventID: idDoEvento(nome, dados, sortearId),
  })
}

function sortearId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}
