import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { buildFeed, buildFeedItems, buildLink, escapeXml, type FeedProduct } from './product-feed.ts'

const settings = {
  siteUrl: 'https://luminiaromas.com.br',
  brand: 'Lumini Aromas',
  installments: 3,
}

function gotaDeCristal(overrides: Partial<FeedProduct> = {}): FeedProduct {
  return {
    id: 4775,
    name: 'Vela aromática gota de cristal',
    slug: 'vela-aromatica-gota-de-cristal',
    status: 'published',
    unitPrice: 3800,
    minQty: 20,
    qtyStep: 10,
    maxQty: 200,
    lotSizes: [20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150, 200],
    shortDescription: 'Vela aromática artesanal em vidro de cristal, personalizada com seu nome.',
    googleProductCategory: '588',
    productType: 'Lembrancinhas > Casamento > Velas',
    occasions: ['casamento'],
    images: ['https://cdn.luminiaromas.com.br/gota-1.jpg', 'https://cdn.luminiaromas.com.br/gota-2.jpg'],
    productionRules: [
      { fromQty: 20, minDays: 7, maxDays: 10 },
      { fromQty: 150, minDays: 15, maxDays: 20 },
    ],
    unitCost: 1200,
    variants: [
      { key: 'lavanda', label: 'Lavanda', sku: 'GOTA-LAV', active: true, legacyWooVariationId: 4887 },
      { key: 'vanilla', label: 'Vanilla', sku: 'GOTA-VAN', active: true },
      { key: 'coffee', label: 'Coffee', sku: 'GOTA-COF', active: false },
    ],
    ...overrides,
  }
}

describe('buildFeedItems', () => {
  test('gera uma oferta por aroma ativo, no lote mínimo', () => {
    const itens = buildFeedItems(gotaDeCristal(), settings)

    assert.equal(itens.length, 2, 'o aroma desativado não entra no feed')
    assert.deepEqual(
      itens.map((item) => item.mpn),
      ['GOTA-LAV', 'GOTA-VAN'],
    )
    for (const item of itens) {
      assert.equal(item.itemGroupId, '4775')
      assert.equal(item.multipack, 20)
    }
  })

  test('usa o formato de preço exigido, e nunca zero', () => {
    const [item] = buildFeedItems(gotaDeCristal(), settings)
    // O feed atual envia "BRL760.00", que a especificação não aceita.
    assert.equal(item.price, '760.00 BRL')
    assert.doesNotMatch(item.price, /^BRL/)
  })

  test('produto sem preço não vira oferta', () => {
    // É o caso das 21 variações da gota de cristal hoje: sem preço, viram
    // "Invalid product price" no Merchant. Aqui simplesmente não são enviadas.
    assert.deepEqual(buildFeedItems(gotaDeCristal({ unitPrice: 0 }), settings), [])
    assert.deepEqual(buildFeedItems(gotaDeCristal({ unitPrice: null }), settings), [])
  })

  test('produto em rascunho não vira oferta', () => {
    assert.deepEqual(buildFeedItems(gotaDeCristal({ status: 'draft' }), settings), [])
  })

  test('produto arquivado sai dos anúncios', () => {
    // Item sazonal como o Kit Dia das Mães sai do Google e da Meta sem
    // precisar apagar o produto nem perder o histórico de vendas.
    assert.deepEqual(buildFeedItems(gotaDeCristal({ archived: true }), settings), [])
  })

  test('informa o preço por peça sem violar a regra do lote mínimo', () => {
    const [item] = buildFeedItems(gotaDeCristal(), settings)
    assert.equal(item.unitPricingMeasure, '20 ct')
    assert.equal(item.unitPricingBaseMeasure, '1 ct')
  })

  test('envia marca, que hoje falta no feed', () => {
    const [item] = buildFeedItems(gotaDeCristal(), settings)
    assert.equal(item.brand, 'Lumini Aromas')
  })

  test('converte o prazo de produção em prazo de manuseio', () => {
    const [item] = buildFeedItems(gotaDeCristal(), settings)
    assert.equal(item.minHandlingTime, 7)
    assert.equal(item.maxHandlingTime, 10)
  })

  test('calcula o custo do lote para o relatório de lucro do Google Ads', () => {
    const [item] = buildFeedItems(gotaDeCristal(), settings)
    assert.equal(item.costOfGoodsSold, '240.00 BRL') // 20 x R$ 12,00
  })

  test('mostra a parcela igual à da página', () => {
    const [item] = buildFeedItems(gotaDeCristal(), settings)
    assert.equal(item.installmentMonths, 3)
    assert.equal(item.installmentAmount, '253.33 BRL')
  })

  test('preserva o ID antigo apenas quando o produto pede', () => {
    const semPreservar = buildFeedItems(gotaDeCristal(), settings)
    assert.equal(semPreservar[0].id, 'GOTA-LAV')

    const preservando = buildFeedItems(
      gotaDeCristal({ preserveLegacyFeedId: true }),
      settings,
    )
    assert.equal(preservando[0].id, '4887', 'mantém o histórico no Merchant')
    assert.equal(preservando[1].id, 'GOTA-VAN', 'sem ID antigo, usa o SKU novo')
  })

  test('produto sem aromas gera uma oferta só', () => {
    const potinho = gotaDeCristal({
      id: 3129,
      name: 'Pote de Mel 40g com ursinho',
      slug: 'pote-de-mel-40g-com-ursinho',
      unitPrice: 3500,
      variants: [],
    })
    const itens = buildFeedItems(potinho, settings)
    assert.equal(itens.length, 1)
    assert.equal(itens[0].price, '700.00 BRL')
    assert.equal(itens[0].mpn, null)
  })
})

describe('buildLink', () => {
  test('abre a página com aroma e quantidade já escolhidos', () => {
    assert.equal(
      buildLink('https://luminiaromas.com.br', 'vela-aromatica-gota-de-cristal', 'lavanda', 20),
      'https://luminiaromas.com.br/product/vela-aromatica-gota-de-cristal/?aroma=lavanda&quantidade=20',
    )
  })

  test('funciona sem aroma', () => {
    assert.equal(
      buildLink('https://luminiaromas.com.br/', 'pote-de-mel', null, 20),
      'https://luminiaromas.com.br/product/pote-de-mel/?quantidade=20',
    )
  })
})

describe('renderização do XML', () => {
  test('escapa caracteres que quebrariam o XML', () => {
    assert.equal(escapeXml('Ana & João <3'), 'Ana &amp; João &lt;3')
  })

  test('feed do Google traz multipack e prazo de manuseio', () => {
    const xml = buildFeed([gotaDeCristal()], 'google', settings)

    assert.match(xml, /<\?xml version="1\.0" encoding="UTF-8"\?>/)
    assert.match(xml, /xmlns:g="http:\/\/base\.google\.com\/ns\/1\.0"/)
    assert.match(xml, /<g:price>760\.00 BRL<\/g:price>/)
    assert.match(xml, /<g:multipack>20<\/g:multipack>/)
    assert.match(xml, /<g:unit_pricing_measure>20 ct<\/g:unit_pricing_measure>/)
    assert.match(xml, /<g:min_handling_time>7<\/g:min_handling_time>/)
    assert.match(xml, /<g:brand>Lumini Aromas<\/g:brand>/)
    assert.match(xml, /<g:installment>/)
  })

  test('feed da Meta traz o aroma como dimensão de variação', () => {
    const xml = buildFeed([gotaDeCristal()], 'meta', settings)

    assert.match(xml, /<g:additional_variant_attribute>Scent:Lavanda<\/g:additional_variant_attribute>/)
    // multipack e prazo de manuseio são atributos do Google, não da Meta.
    assert.doesNotMatch(xml, /<g:multipack>/)
    assert.doesNotMatch(xml, /<g:min_handling_time>/)
  })

  test('o ID de cada oferta é o mesmo nos dois feeds', () => {
    // O `id` do catálogo precisa bater com o `content_id` enviado pelo Pixel
    // e pela Conversions API, senão a Meta não liga a venda ao produto.
    const google = buildFeedItems(gotaDeCristal(), settings).map((item) => item.id)
    const meta = buildFeedItems(gotaDeCristal(), settings).map((item) => item.id)
    assert.deepEqual(google, meta)
  })

  test('feed vazio ainda é um XML válido', () => {
    const xml = buildFeed([], 'google', settings)
    assert.match(xml, /<channel>/)
    assert.match(xml, /<\/rss>/)
    assert.doesNotMatch(xml, /<item>/)
  })
})
