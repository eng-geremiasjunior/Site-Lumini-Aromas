import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  DEFAULT_LOT_SIZES,
  addonsTotal,
  assertValidConfig,
  buildLotTable,
  formatFeedPrice,
  generateLotSizes,
  guardLot,
  lineTotal,
  lotPrice,
  unitPriceFor,
  type LotPricingConfig,
} from './lot-pricing.ts'

/** Configuração equivalente aos produtos de lote da loja atual. */
function config(overrides: Partial<LotPricingConfig> = {}): LotPricingConfig {
  return {
    unitPrice: 3800, // R$ 38,00 (bomboniere e gota de cristal)
    minQty: 20,
    qtyStep: 10,
    maxQty: 200,
    lotSizes: [...DEFAULT_LOT_SIZES],
    ...overrides,
  }
}

describe('preços reais do catálogo atual', () => {
  // Preços unitários derivados do feed XML da loja em produção (setembro/2026).
  const catalogo: Array<{ produto: string; unitPrice: number; casos: Array<[number, number]> }> = [
    {
      produto: '4775 Vela aromática gota de cristal / 77 Lembrancinha bomboniere',
      unitPrice: 3800,
      casos: [
        [20, 76_000],
        [50, 190_000],
        [60, 228_000],
        [100, 380_000],
        [120, 456_000],
        [200, 760_000],
      ],
    },
    {
      produto: '3142 Vela aromática na caixa 70g',
      unitPrice: 1900,
      casos: [
        [20, 38_000],
        [30, 57_000],
        [90, 171_000],
        [200, 380_000],
      ],
    },
    {
      produto: '57 Vela com rolha de cortiça 100g',
      unitPrice: 2290,
      casos: [
        [20, 45_800],
        [60, 137_400],
        [200, 458_000],
      ],
    },
    {
      produto: '68 Mini vela na bolacha de madeira / 63 rolha de coração',
      unitPrice: 2390,
      casos: [
        [20, 47_800],
        [200, 478_000],
      ],
    },
    {
      produto: '2970 Sal de Parrilla',
      unitPrice: 1500,
      casos: [
        [20, 30_000],
        [200, 300_000],
      ],
    },
    {
      produto: '108 Mini vela bubbles com folha de ouro',
      unitPrice: 1400,
      casos: [
        [20, 28_000],
        [200, 280_000],
      ],
    },
  ]

  for (const { produto, unitPrice, casos } of catalogo) {
    test(produto, () => {
      const cfg = config({ unitPrice })
      for (const [qty, esperado] of casos) {
        assert.equal(
          lotPrice(cfg, qty),
          esperado,
          `${qty} peças deveria custar ${esperado} centavos`,
        )
      }
    })
  }
})

describe('erros do WooCommerce que o motor torna impossíveis', () => {
  // Variações digitadas à mão com preço fora do padrão, encontradas no feed.
  const errosReais = [
    { variacao: '3918 bomboniere Bamboo 120 peças', unitPrice: 3800, qty: 120, digitado: 452_000 },
    { variacao: '3896 bomboniere Lavanda 60 peças', unitPrice: 3800, qty: 60, digitado: 266_000 },
    { variacao: '4711 rolha de cortiça Chá Branco 60 peças', unitPrice: 2290, qty: 60, digitado: 183_200 },
  ]

  for (const { variacao, unitPrice, qty, digitado } of errosReais) {
    test(`${variacao} é corrigido automaticamente`, () => {
      const calculado = lotPrice(config({ unitPrice }), qty)
      assert.notEqual(calculado, digitado, 'o preço digitado errado não pode ser reproduzido')
      assert.equal(calculado, unitPrice * qty)
    })
  }

  test('nenhuma faixa pode ficar sem preço', () => {
    // No WooCommerce, 21 das 36 variações da gota de cristal ficaram com preço
    // vazio e sumiram da loja sem aviso. Aqui toda faixa nasce com preço.
    const tabela = buildLotTable(config())
    assert.equal(tabela.length, DEFAULT_LOT_SIZES.length)
    for (const linha of tabela) {
      assert.ok(linha.lotPrice > 0, `faixa de ${linha.qty} peças ficou sem preço`)
    }
  })
})

describe('unitPriceFor e desconto por volume', () => {
  test('sem desconto configurado, usa sempre o preço base', () => {
    const cfg = config()
    for (const qty of cfg.lotSizes) {
      assert.equal(unitPriceFor(cfg, qty), 3800)
    }
  })

  test('aplica a maior faixa de desconto cujo mínimo foi atingido', () => {
    const cfg = config({
      volumeDiscounts: [
        { fromQty: 100, unitPrice: 3600 },
        { fromQty: 150, unitPrice: 3500 },
      ],
    })

    assert.equal(unitPriceFor(cfg, 20), 3800)
    assert.equal(unitPriceFor(cfg, 90), 3800)
    assert.equal(unitPriceFor(cfg, 100), 3600)
    assert.equal(unitPriceFor(cfg, 120), 3600)
    assert.equal(unitPriceFor(cfg, 150), 3500)
    assert.equal(unitPriceFor(cfg, 200), 3500)
  })

  test('a tabela mostra a economia por faixa', () => {
    const cfg = config({ volumeDiscounts: [{ fromQty: 100, unitPrice: 3600 }] })
    const tabela = buildLotTable(cfg)

    const faixa20 = tabela.find((linha) => linha.qty === 20)!
    assert.equal(faixa20.savingsPerUnit, 0)
    assert.equal(faixa20.savingsTotal, 0)

    const faixa100 = tabela.find((linha) => linha.qty === 100)!
    assert.equal(faixa100.unitPrice, 3600)
    assert.equal(faixa100.lotPrice, 360_000)
    assert.equal(faixa100.savingsPerUnit, 200)
    assert.equal(faixa100.savingsTotal, 20_000)
  })
})

describe('guardLot: único ponto de validação', () => {
  const cfg = config()

  test('aceita todas as faixas oferecidas', () => {
    for (const qty of cfg.lotSizes) {
      assert.deepEqual(guardLot(cfg, qty), { ok: true }, `faixa ${qty} deveria ser aceita`)
    }
  })

  test('recusa abaixo do mínimo com mensagem ao cliente', () => {
    const resultado = guardLot(cfg, 10)
    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.equal(resultado.code, 'QTY_BELOW_MIN')
    assert.match(resultado.message, /20 pecas/)
  })

  test('acima do máximo convida ao orçamento pelo WhatsApp', () => {
    const resultado = guardLot(cfg, 300)
    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.equal(resultado.code, 'QTY_ABOVE_MAX')
    assert.match(resultado.message, /WhatsApp/)
  })

  test('recusa quantidade fora das faixas, mesmo dentro do intervalo', () => {
    // 25 está entre o mínimo e o máximo, mas não é uma faixa oferecida.
    const resultado = guardLot(cfg, 25)
    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.equal(resultado.code, 'QTY_NOT_OFFERED')
  })

  test('recusa quantidades inválidas', () => {
    for (const qty of [0, -20, 20.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const resultado = guardLot(cfg, qty)
      assert.equal(resultado.ok, false, `quantidade ${qty} deveria ser recusada`)
    }
  })

  test('detecta configuração de produto inconsistente em vez de vender errado', () => {
    const quebrado = { ...cfg, unitPrice: 0 }
    const resultado = guardLot(quebrado, 20)
    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.equal(resultado.code, 'CONFIG_INVALID')
  })
})

describe('add-ons', () => {
  test('add-on por peça multiplica pela quantidade do lote', () => {
    const laco = { id: 'laco', name: 'Laço de cetim', pricePerUnit: 150 }
    assert.equal(addonsTotal([laco], 20), 3_000)
    assert.equal(addonsTotal([laco], 200), 30_000)
  })

  test('add-on fixo não multiplica', () => {
    const arte = { id: 'arte', name: 'Arte especial', flatPrice: 5_000 }
    assert.equal(addonsTotal([arte], 20), 5_000)
    assert.equal(addonsTotal([arte], 200), 5_000)
  })

  test('total da linha soma lote e add-ons', () => {
    const cfg = config()
    const addons = [
      { id: 'laco', name: 'Laço de cetim', pricePerUnit: 150 },
      { id: 'caixa', name: 'Caixa de acetato', pricePerUnit: 300 },
    ]
    // 60 peças x R$ 38 = R$ 2.280 ; add-ons 60 x R$ 4,50 = R$ 270
    assert.equal(lineTotal(cfg, 60, addons), 228_000 + 27_000)
  })
})

describe('configuração e faixas', () => {
  test('gera faixas a partir de mínimo, passo e máximo', () => {
    assert.deepEqual(generateLotSizes(20, 10, 100), [20, 30, 40, 50, 60, 70, 80, 90, 100])
  })

  test('inclui o máximo mesmo quando o passo não fecha', () => {
    assert.deepEqual(generateLotSizes(20, 30, 100), [20, 50, 80, 100])
  })

  test('rejeita faixa fora do intervalo do produto', () => {
    assert.throws(() => assertValidConfig(config({ lotSizes: [10, 20, 30] })), /menor que o minimo/)
    assert.throws(() => assertValidConfig(config({ lotSizes: [20, 300] })), /maior que o maximo/)
  })

  test('rejeita faixas fora de ordem', () => {
    assert.throws(() => assertValidConfig(config({ lotSizes: [30, 20] })), /ordem crescente/)
  })

  test('rejeita desconto por volume acima do preço base', () => {
    assert.throws(
      () => assertValidConfig(config({ volumeDiscounts: [{ fromQty: 100, unitPrice: 4000 }] })),
      /maior que o preco base/,
    )
  })
})

describe('formato de preço para os feeds', () => {
  test('usa o formato exigido pelo Google, e não o do plugin atual', () => {
    // O feed do WooCommerce envia "BRL760.00"; a especificação pede "760.00 BRL".
    assert.equal(formatFeedPrice(76_000), '760.00 BRL')
    assert.equal(formatFeedPrice(760_000), '7600.00 BRL')
    assert.equal(formatFeedPrice(45_800), '458.00 BRL')
  })
})
