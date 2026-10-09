import type { DadosDoEvento, EventoDaLoja, ItemDoEvento } from './google-tag.ts'
import { emReais } from './google-tag.ts'
import type { MetaEventName } from './meta-capi.ts'

/**
 * O Pixel da Meta no navegador.
 *
 * O outro lado desta mesma conversa já existe: `meta-capi.ts` monta o
 * evento que sai do servidor. Os dois precisam concordar em duas coisas,
 * ou o resultado é pior do que não medir:
 *
 *   1. **o nome do evento** — `AddToCart`, e não `add_to_cart`, que é o
 *      nome do Google. São vocabulários diferentes para o mesmo passo;
 *   2. **o `eventID`** — o Pixel e a CAPI mandam o mesmo evento, um do
 *      navegador e outro do servidor, de propósito (bloqueador de anúncio
 *      derruba o primeiro, e o segundo chega). A Meta junta os dois em um
 *      quando o `eventID` é igual, em uma janela de 48 horas. Diferentes,
 *      a mesma venda de R$ 2.000 conta duas vezes e o anúncio passa a ser
 *      otimizado em cima de um faturamento que não existe.
 *
 * Por isso o nome e o id são calculados aqui, em função pura e testada, e
 * não escritos à mão em cada página.
 */

/** O vocabulário da Meta para os passos que a loja conhece. */
const NOMES: Record<EventoDaLoja, MetaEventName> = {
  view_item: 'ViewContent',
  add_to_cart: 'AddToCart',
  begin_checkout: 'InitiateCheckout',
  purchase: 'Purchase',
  generate_lead: 'Lead',
}

export function nomeNaMeta(evento: EventoDaLoja): MetaEventName {
  return NOMES[evento]
}

/**
 * O identificador do Pixel, validado.
 *
 * É um número de 15 ou 16 dígitos. Um identificador de conta de anúncio
 * (`act_...`) ou um id de catálogo no lugar carregaria o Pixel apontando
 * para o nada, sem erro visível — o tipo de defeito que só aparece semanas
 * depois, quando alguém estranha o gráfico vazio.
 */
export function pixelConfigurado(valor: string | null | undefined): string | null {
  const limpo = (valor ?? '').trim()
  if (!limpo) return null
  return /^\d{14,17}$/.test(limpo) ? limpo : null
}

/**
 * O id que o navegador e o servidor vão usar para o mesmo evento.
 *
 * Na compra é o número do pedido: é o único valor que o servidor também
 * conhece sem combinar nada com o navegador. Nos outros passos é um id
 * sorteado, porque não há nada para juntar — o servidor não manda
 * `ViewContent`.
 */
export function idDoEvento(
  evento: EventoDaLoja,
  dados: DadosDoEvento,
  sortear: () => string,
): string {
  if (evento === 'purchase' && dados.idDoPedido) {
    return `pedido-${dados.idDoPedido}`
  }
  return sortear()
}

/** O `custom_data` do evento, no formato que o catálogo da Meta espera. */
export function eventoParaPixel(
  evento: EventoDaLoja,
  dados: DadosDoEvento,
): Record<string, unknown> {
  const valor = dados.valorEmCentavos ?? somaDosItens(dados.itens)

  const corpo: Record<string, unknown> = {
    value: emReais(valor),
    currency: 'BRL',
  }

  if (dados.itens.length > 0) {
    // `content_ids` e `contents` carregam o mesmo id do feed. É o que liga
    // o evento ao produto no catálogo e faz o anúncio dinâmico mostrar a
    // vela que a pessoa olhou.
    corpo.content_type = 'product'
    corpo.content_ids = dados.itens.map((item) => item.id)
    corpo.contents = dados.itens.map((item) => ({
      id: item.id,
      quantity: item.quantidade,
      item_price: emReais(item.precoEmCentavos),
    }))
    corpo.content_name = dados.itens.map((item) => item.nome).join(', ')

    const categorias = [
      ...new Set(dados.itens.map((item) => item.categoria).filter(Boolean)),
    ] as string[]
    if (categorias.length > 0) corpo.content_category = categorias.join(', ')
  }

  if (evento === 'purchase') {
    // A Meta aceita qualquer campo extra. O número do pedido é o que
    // permite conferir uma venda do painel contra o Gerenciador quando o
    // número do relatório não fecha.
    if (dados.idDoPedido) corpo.order_id = dados.idDoPedido
    corpo.num_items = dados.itens.reduce((soma, item) => soma + item.quantidade, 0)
    if (dados.freteEmCentavos) corpo.shipping = emReais(dados.freteEmCentavos)
  }

  return corpo
}

function somaDosItens(itens: ItemDoEvento[]): number {
  return itens.reduce((soma, item) => soma + item.precoEmCentavos * item.quantidade, 0)
}
