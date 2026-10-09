import {
  destinosConfigurados,
  eventoParaAds,
  eventoParaGa4,
  type DadosDoEvento,
  type EventoDaLoja,
} from '../../../commerce/marketing/google-tag.ts'
import { dispararNaMeta } from './pixel.ts'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

/**
 * Os destinos, decididos uma vez quando o pacote carrega.
 *
 * Os identificadores entram no código no momento da compilação, então isto
 * não custa nada em tempo de execução e mantém a validação — inclusive a
 * que recusa um `GTM-` no lugar do `G-` — valendo também no navegador.
 */
export const DESTINOS = destinosConfigurados({
  ga4: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
  ads: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID,
  conversaoDeCompra: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSAO_COMPRA,
})

/**
 * Manda um evento para o Google.
 *
 * Dois envios, de propósito: um no formato do Analytics, outro no formato do
 * Google Ads. Ver o comentário de `eventoParaAds` para o porquê de não
 * economizar um objeto aqui.
 *
 * Se o gtag ainda não carregou, não faz nada — em vez de guardar numa fila
 * própria. O gtag já mantém a sua (`dataLayer`), e uma segunda fila só
 * criaria a chance de mandar o mesmo evento duas vezes.
 */
export function dispararEvento(
  nome: EventoDaLoja,
  dados: DadosDoEvento,
  comprador?: Record<string, unknown> | null,
): void {
  const gtag = typeof window === 'undefined' ? undefined : window.gtag

  if (gtag) {
    if (comprador) gtag('set', 'user_data', comprador)

    if (DESTINOS.ga4) {
      gtag('event', nome, { ...eventoParaGa4(nome, dados), send_to: DESTINOS.ga4 })
    }

    // Na compra, o envio vai com o rótulo da conversão e leva o nome
    // `conversion`, que é como o Google Ads registra a venda. Nos demais
    // passos vai para a conta, alimentando os públicos de remarketing.
    const destinoDoAds =
      nome === 'purchase' ? (DESTINOS.conversaoDeCompra ?? DESTINOS.ads) : DESTINOS.ads

    if (destinoDoAds) {
      gtag(
        'event',
        nome === 'purchase' ? 'conversion' : nome,
        eventoParaAds(nome, dados, destinoDoAds),
      )
    }
  }

  // A Meta vem no mesmo disparo, nunca em uma chamada separada espalhada
  // pelas páginas. É o que garante que um passo novo do funil não seja
  // medido só em uma das duas plataformas — e hoje o Instagram é de onde
  // vem praticamente todo o tráfego pago da loja.
  dispararNaMeta(nome, dados)
}

/**
 * A compra vale uma vez por número de pedido.
 *
 * A página de confirmação é atualizada, é reaberta pelo histórico, é
 * compartilhada no WhatsApp. Sem esta trava, uma venda de R$ 2.000 vira
 * três no relatório — e o Google passa a otimizar em cima de um faturamento
 * que não existe.
 */
export function jaContou(idDoPedido: string): boolean {
  const chave = `lumini_compra_${idDoPedido}`

  try {
    if (window.sessionStorage.getItem(chave)) return true
    window.sessionStorage.setItem(chave, '1')
    return false
  } catch {
    // Navegador sem armazenamento: segue em frente. Contar a compra
    // importa mais do que o risco de repetir.
    return false
  }
}
