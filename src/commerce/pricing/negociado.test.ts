import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { avisosDaNegociacao, guardNegociado, type LotPricingConfig } from './lot-pricing.ts'
import { priceLine, type PricingProduct } from '../cart/price-line.ts'

const CONFIG: LotPricingConfig = {
  unitPrice: 3800,
  minQty: 20,
  qtyStep: 10,
  maxQty: 200,
  lotSizes: [20, 30, 40, 50, 60, 80, 100, 150, 200],
}

const PRODUTO: PricingProduct = {
  id: 1,
  name: 'Bomboniere',
  slug: 'bomboniere',
  status: 'published',
  unitPrice: 3800,
  minQty: 20,
  qtyStep: 10,
  maxQty: 200,
  lotSizes: CONFIG.lotSizes,
  variants: [{ key: 'lavanda', label: 'Lavanda', sku: 'BOM-LAV', active: true }],
}

describe('guardNegociado', () => {
  it('aceita a quantidade que a tabela não tem', () => {
    // 21, 28, 33: os números que aparecem quando a cliente conta os
    // convidados de verdade.
    for (const qty of [21, 28, 33, 47]) {
      assert.equal(guardNegociado(qty, 3800).ok, true, `${qty} deveria passar`)
    }
  })

  it('recusa quantidade quebrada ou negativa', () => {
    assert.equal(guardNegociado(0, 3800).ok, false)
    assert.equal(guardNegociado(-5, 3800).ok, false)
    assert.equal(guardNegociado(21.5, 3800).ok, false)
  })

  it('exige um preço por peça', () => {
    assert.equal(guardNegociado(21, 0).ok, false)
    assert.equal(guardNegociado(21, -100).ok, false)
  })
})

describe('priceLine negociado', () => {
  it('calcula o total como quantidade × peça, e nunca aceita total digitado', () => {
    const resultado = priceLine({
      product: PRODUTO,
      variantKey: 'lavanda',
      qty: 21,
      negociado: { unitPriceCents: 3800 },
    })

    assert.ok(resultado.ok)
    assert.equal(resultado.line.qty, 21)
    assert.equal(resultado.line.unitPrice, 3800)
    assert.equal(resultado.line.lotPrice, 79800)
    assert.equal(resultado.line.total, 79800)
    assert.equal(resultado.line.negociado, true)
  })

  it('respeita o preço combinado, mesmo diferente do de tabela', () => {
    const resultado = priceLine({
      product: PRODUTO,
      variantKey: 'lavanda',
      qty: 28,
      negociado: { unitPriceCents: 3500 },
    })

    assert.ok(resultado.ok)
    assert.equal(resultado.line.lotPrice, 98000)
  })

  it('continua exigindo o aroma: quantidade livre não é pedido incompleto', () => {
    const resultado = priceLine({
      product: PRODUTO,
      qty: 21,
      negociado: { unitPriceCents: 3800 },
    })

    assert.equal(resultado.ok, false)
    assert.equal(!resultado.ok && resultado.code, 'VARIANT_REQUIRED')
  })

  it('continua recusando produto fora do ar', () => {
    const resultado = priceLine({
      product: { ...PRODUTO, archived: true },
      variantKey: 'lavanda',
      qty: 21,
      negociado: { unitPriceCents: 3800 },
    })

    assert.equal(resultado.ok, false)
    assert.equal(!resultado.ok && resultado.code, 'PRODUCT_UNAVAILABLE')
  })
})

describe('a vitrine não alcança o caminho negociado', () => {
  it('sem negociado, 21 peças continua sendo recusado', () => {
    // Esta é a garantia de que o site segue vendendo só em faixa fechada.
    // Se este teste um dia passar a falhar, alguém abriu a porta errada.
    const resultado = priceLine({ product: PRODUTO, variantKey: 'lavanda', qty: 21 })

    assert.equal(resultado.ok, false)
    assert.equal(!resultado.ok && resultado.code, 'QTY_NOT_OFFERED')
  })

  it('sem negociado, o preço continua vindo da tabela', () => {
    const resultado = priceLine({ product: PRODUTO, variantKey: 'lavanda', qty: 20 })

    assert.ok(resultado.ok)
    assert.equal(resultado.line.unitPrice, 3800)
    assert.equal(resultado.line.lotPrice, 76000)
    assert.equal(resultado.line.negociado, false)
  })
})

describe('avisosDaNegociacao', () => {
  it('não reclama de nada quando bate com a tabela', () => {
    assert.deepEqual(avisosDaNegociacao(CONFIG, 30, 3800), [])
  })

  it('avisa quando fica abaixo do mínimo, sem impedir', () => {
    const avisos = avisosDaNegociacao(CONFIG, 12, 3800)
    assert.equal(avisos.length, 1)
    assert.ok(avisos[0].includes('abaixo do mínimo'))
  })

  it('avisa quando passa do máximo do site', () => {
    assert.ok(avisosDaNegociacao(CONFIG, 250, 3800)[0].includes('acima'))
  })

  it('avisa a diferença de preço em tom de conferência', () => {
    const avisos = avisosDaNegociacao(CONFIG, 28, 3500)
    assert.ok(avisos.some((aviso) => aviso.includes('tabela cobraria')))
  })

  it('grita quando o preço parece vírgula no lugar errado', () => {
    // R$ 3,80 em vez de R$ 38,00 num lote de 100 são R$ 380 em vez de
    // R$ 3.800. É o erro que só aparece no fim do mês.
    const avisos = avisosDaNegociacao(CONFIG, 100, 380)
    assert.ok(avisos.some((aviso) => aviso.includes('Confira a vírgula')))
  })

  it('preço combinado bem acima também chama atenção', () => {
    const avisos = avisosDaNegociacao(CONFIG, 30, 9000)
    assert.ok(avisos.some((aviso) => aviso.includes('Confira a vírgula')))
  })
})
