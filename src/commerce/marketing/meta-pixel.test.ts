import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { DadosDoEvento } from './google-tag.ts'
import { eventoParaPixel, idDoEvento, nomeNaMeta, pixelConfigurado } from './meta-pixel.ts'

const DADOS: DadosDoEvento = {
  itens: [
    {
      id: 'VGC-LAV',
      nome: 'Vela gota de cristal Lavanda',
      precoEmCentavos: 76_000,
      quantidade: 1,
      categoria: 'Velas',
      variacao: 'Lavanda',
    },
  ],
}

describe('identificador do Pixel', () => {
  it('aceita o identificador real da conta', () => {
    assert.equal(pixelConfigurado('1266635820732859'), '1266635820732859')
  })

  it('recusa o que não é identificador de Pixel', () => {
    assert.equal(pixelConfigurado('act_1266635820732859'), null)
    assert.equal(pixelConfigurado('G-ZZVS0YHWXH'), null)
    assert.equal(pixelConfigurado('GTM-M4XTGVP'), null)
    assert.equal(pixelConfigurado('1234'), null)
    assert.equal(pixelConfigurado(''), null)
    assert.equal(pixelConfigurado(undefined), null)
  })

  it('tolera espaço colado junto no copiar e colar', () => {
    assert.equal(pixelConfigurado(' 1266635820732859 '), '1266635820732859')
  })
})

describe('nome do evento', () => {
  // O Google chama `add_to_cart`, a Meta chama `AddToCart`. Mandar o nome
  // do Google para a Meta cria um evento personalizado que não serve para
  // otimizar campanha nenhuma.
  it('traduz o vocabulário da loja para o da Meta', () => {
    assert.equal(nomeNaMeta('view_item'), 'ViewContent')
    assert.equal(nomeNaMeta('add_to_cart'), 'AddToCart')
    assert.equal(nomeNaMeta('begin_checkout'), 'InitiateCheckout')
    assert.equal(nomeNaMeta('purchase'), 'Purchase')
    assert.equal(nomeNaMeta('generate_lead'), 'Lead')
  })
})

describe('id do evento, para o navegador e o servidor contarem uma venda só', () => {
  it('na compra, deriva do número do pedido', () => {
    const id = idDoEvento('purchase', { ...DADOS, idDoPedido: '1042' }, () => 'sorteado')
    assert.equal(id, 'pedido-1042')
  })

  it('o mesmo pedido gera sempre o mesmo id', () => {
    const a = idDoEvento('purchase', { ...DADOS, idDoPedido: '1042' }, () => 'um')
    const b = idDoEvento('purchase', { ...DADOS, idDoPedido: '1042' }, () => 'outro')
    assert.equal(a, b)
  })

  it('nos outros passos sorteia, porque não há nada para juntar', () => {
    assert.equal(idDoEvento('view_item', DADOS, () => 'sorteado'), 'sorteado')
  })

  it('compra sem número de pedido não inventa um id fixo', () => {
    assert.equal(idDoEvento('purchase', DADOS, () => 'sorteado'), 'sorteado')
  })
})

describe('corpo do evento', () => {
  it('manda valor em reais e moeda', () => {
    const corpo = eventoParaPixel('view_item', DADOS)
    assert.equal(corpo.value, 760)
    assert.equal(corpo.currency, 'BRL')
  })

  it('usa o id do feed, que é o que liga o evento ao catálogo', () => {
    const corpo = eventoParaPixel('view_item', DADOS)
    assert.equal(corpo.content_type, 'product')
    assert.deepEqual(corpo.content_ids, ['VGC-LAV'])
    assert.deepEqual(corpo.contents, [{ id: 'VGC-LAV', quantity: 1, item_price: 760 }])
  })

  it('o valor informado manda mais do que a soma dos itens', () => {
    const corpo = eventoParaPixel('purchase', {
      ...DADOS,
      valorEmCentavos: 80_000,
      idDoPedido: '1042',
      freteEmCentavos: 4_000,
    })

    assert.equal(corpo.value, 800)
    assert.equal(corpo.shipping, 40)
    assert.equal(corpo.order_id, '1042')
    assert.equal(corpo.num_items, 1)
  })

  // O lote é a unidade vendida: 1 lote de 20 peças, não 20 itens.
  it('conta lotes, não peças', () => {
    const corpo = eventoParaPixel('purchase', {
      itens: [
        { id: 'A', nome: 'Lote A', precoEmCentavos: 76_000, quantidade: 1 },
        { id: 'B', nome: 'Lote B', precoEmCentavos: 38_000, quantidade: 2 },
      ],
      idDoPedido: '1043',
    })

    assert.equal(corpo.num_items, 3)
    assert.equal(corpo.value, 1520)
  })

  it('não inventa catálogo em evento sem item, como o lead', () => {
    const corpo = eventoParaPixel('generate_lead', { itens: [], valorEmCentavos: 0 })
    assert.equal(corpo.content_ids, undefined)
    assert.equal(corpo.value, 0)
    assert.equal(corpo.currency, 'BRL')
  })
})
