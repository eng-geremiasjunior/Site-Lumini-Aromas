import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  cartSubtotal,
  checkOrderScopedMinimum,
  priceLine,
  toPricingConfig,
  type PricingProduct,
} from './price-line.ts'

/** Espelha a "Lembrancinha bomboniere com vela aromática": R$ 38,00 a peça, 6 aromas. */
function bomboniere(overrides: Partial<PricingProduct> = {}): PricingProduct {
  return {
    id: 77,
    name: 'Lembrancinha bomboniere com vela aromática',
    slug: 'lembrancinha-bomboniere-com-vela-aromatica',
    status: 'published',
    unitPrice: 3800,
    minQty: 20,
    qtyStep: 10,
    maxQty: 200,
    lotSizes: [20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150, 200],
    variants: [
      { key: 'bamboo', label: 'Bamboo', sku: 'BOM-BAM', active: true },
      { key: 'lavanda', label: 'Lavanda', sku: 'BOM-LAV', active: true },
      { key: 'vanilla', label: 'Vanilla', sku: 'BOM-VAN', active: false },
    ],
    personalizationFields: [
      { label: 'Frase ou nome para o rótulo', type: 'text', required: true, maxChars: 20 },
      { label: 'Observações', type: 'textarea', required: false, maxChars: 500 },
    ],
    ...overrides,
  }
}

const personalizacaoValida = { 'Frase ou nome para o rótulo': 'Ana & João' }

describe('priceLine: caminho feliz', () => {
  test('precifica um lote de 60 peças de bomboniere', () => {
    const resultado = priceLine({
      product: bomboniere(),
      variantKey: 'lavanda',
      qty: 60,
      personalization: personalizacaoValida,
    })

    assert.equal(resultado.ok, true)
    if (!resultado.ok) return

    assert.equal(resultado.line.qty, 60)
    assert.equal(resultado.line.unitPrice, 3800)
    assert.equal(resultado.line.lotPrice, 228_000) // R$ 2.280,00
    assert.equal(resultado.line.total, 228_000)
    assert.equal(resultado.line.sku, 'BOM-LAV')
    assert.equal(resultado.line.variantLabel, 'Lavanda')
    assert.equal(resultado.line.personalization['Frase ou nome para o rótulo'], 'Ana & João')
  })

  test('acabamentos por peça multiplicam pela quantidade', () => {
    const resultado = priceLine({
      product: bomboniere(),
      variantKey: 'bamboo',
      qty: 100,
      personalization: personalizacaoValida,
      addons: [
        { id: 'laco', name: 'Laço de cetim', pricePerUnit: 150 },
        { id: 'caixa', name: 'Caixa de acetato', pricePerUnit: 300 },
      ],
    })

    assert.equal(resultado.ok, true)
    if (!resultado.ok) return

    assert.equal(resultado.line.lotPrice, 380_000)
    assert.equal(resultado.line.addonsTotal, 45_000) // 100 x R$ 4,50
    assert.equal(resultado.line.total, 425_000)
    assert.equal(resultado.line.addons.length, 2)
  })

  test('campos opcionais em branco não entram na personalização', () => {
    const resultado = priceLine({
      product: bomboniere(),
      variantKey: 'bamboo',
      qty: 20,
      personalization: { ...personalizacaoValida, Observações: '   ' },
    })

    assert.equal(resultado.ok, true)
    if (!resultado.ok) return
    assert.equal('Observações' in resultado.line.personalization, false)
  })
})

describe('priceLine: recusas', () => {
  test('produto em rascunho não pode ser vendido', () => {
    const resultado = priceLine({
      product: bomboniere({ status: 'draft' }),
      variantKey: 'bamboo',
      qty: 20,
      personalization: personalizacaoValida,
    })
    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.equal(resultado.code, 'PRODUCT_UNAVAILABLE')
  })

  test('produto arquivado não pode ser vendido, mesmo publicado', () => {
    const resultado = priceLine({
      product: bomboniere({ status: 'published', archived: true }),
      variantKey: 'bamboo',
      qty: 20,
      personalization: personalizacaoValida,
    })
    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.equal(resultado.code, 'PRODUCT_UNAVAILABLE')
  })

  test('quantidade abaixo do mínimo é recusada', () => {
    const resultado = priceLine({
      product: bomboniere(),
      variantKey: 'bamboo',
      qty: 10,
      personalization: personalizacaoValida,
    })
    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.equal(resultado.code, 'QTY_BELOW_MIN')
  })

  test('quantidade fora das faixas é recusada mesmo dentro do intervalo', () => {
    const resultado = priceLine({
      product: bomboniere(),
      variantKey: 'bamboo',
      qty: 35,
      personalization: personalizacaoValida,
    })
    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.equal(resultado.code, 'QTY_NOT_OFFERED')
  })

  test('aroma é obrigatório quando o produto tem variações', () => {
    const resultado = priceLine({
      product: bomboniere(),
      qty: 20,
      personalization: personalizacaoValida,
    })
    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.equal(resultado.code, 'VARIANT_REQUIRED')
  })

  test('aroma desativado não pode ser comprado', () => {
    // No WooCommerce, variação sem preço some da loja sem aviso.
    // Aqui a recusa é explícita e o cliente entende o motivo.
    const resultado = priceLine({
      product: bomboniere(),
      variantKey: 'vanilla',
      qty: 20,
      personalization: personalizacaoValida,
    })
    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.equal(resultado.code, 'VARIANT_UNAVAILABLE')
    assert.match(resultado.message, /Vanilla/)
  })

  test('campo obrigatório de personalização em branco é recusado', () => {
    const resultado = priceLine({ product: bomboniere(), variantKey: 'bamboo', qty: 20 })
    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.equal(resultado.code, 'PERSONALIZATION_REQUIRED')
    assert.equal(resultado.field, 'Frase ou nome para o rótulo')
  })

  test('texto do rótulo acima do limite é recusado', () => {
    const resultado = priceLine({
      product: bomboniere(),
      variantKey: 'bamboo',
      qty: 20,
      personalization: { 'Frase ou nome para o rótulo': 'Um texto bem maior que o limite de vinte' },
    })
    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.equal(resultado.code, 'PERSONALIZATION_TOO_LONG')
  })

  test('acima do máximo o cliente é convidado ao orçamento', () => {
    const resultado = priceLine({
      product: bomboniere(),
      variantKey: 'bamboo',
      qty: 500,
      personalization: personalizacaoValida,
    })
    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.equal(resultado.code, 'QTY_ABOVE_MAX')
    assert.match(resultado.message, /WhatsApp/)
  })
})

describe('carrinho', () => {
  test('subtotal soma as linhas', () => {
    const a = priceLine({
      product: bomboniere(),
      variantKey: 'bamboo',
      qty: 20,
      personalization: personalizacaoValida,
    })
    const b = priceLine({
      product: bomboniere(),
      variantKey: 'lavanda',
      qty: 40,
      personalization: personalizacaoValida,
    })

    assert.equal(a.ok && b.ok, true)
    if (!a.ok || !b.ok) return

    assert.equal(cartSubtotal([a.line, b.line]), 76_000 + 152_000)
  })

  test('mínimo por total do pedido permite somar aromas diferentes', () => {
    // Cenário de quem preferir deixar o cliente misturar aromas no lote.
    const produto = bomboniere({ minQty: 20, lotSizes: [10, 20, 30, 40] })

    const dez = priceLine({
      product: { ...produto, minQty: 10 },
      variantKey: 'bamboo',
      qty: 10,
      personalization: personalizacaoValida,
    })
    const maisDez = priceLine({
      product: { ...produto, minQty: 10 },
      variantKey: 'lavanda',
      qty: 10,
      personalization: personalizacaoValida,
    })

    assert.equal(dez.ok && maisDez.ok, true)
    if (!dez.ok || !maisDez.ok) return

    assert.deepEqual(checkOrderScopedMinimum(produto, [dez.line, maisDez.line]), { ok: true })

    const soUmaLinha = checkOrderScopedMinimum(produto, [dez.line])
    assert.equal(soUmaLinha.ok, false)
  })
})

describe('toPricingConfig', () => {
  test('usa as faixas padrão quando o produto não define as suas', () => {
    const config = toPricingConfig({ id: 1, name: 'Teste', unitPrice: 1900, lotSizes: null })
    assert.equal(config.lotSizes[0], 20)
    assert.equal(config.lotSizes[config.lotSizes.length - 1], 200)
    assert.equal(config.minQty, 20)
    assert.equal(config.maxQty, 200)
  })

  test('ordena as faixas informadas', () => {
    const config = toPricingConfig({ id: 1, name: 'Teste', unitPrice: 1900, lotSizes: [50, 20, 30] })
    assert.deepEqual(config.lotSizes, [20, 30, 50])
  })
})
