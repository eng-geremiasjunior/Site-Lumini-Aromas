import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildVolumes,
  coversInsurance,
  mergeVolumes,
  packagingFor,
  totalInsuranceCents,
  totalWeight,
  type PackagingRule,
} from './packaging.ts'
import { buildShippingOptions, fallbackOption, type MelhorEnvioService } from './quote.ts'

const embalagens: PackagingRule[] = [
  { fromQty: 20, boxes: 1, weightKg: 3.2, widthCm: 30, heightCm: 20, lengthCm: 40 },
  { fromQty: 100, boxes: 2, weightKg: 8, widthCm: 40, heightCm: 30, lengthCm: 50 },
  { fromQty: 200, boxes: 4, weightKg: 8, widthCm: 40, heightCm: 30, lengthCm: 50 },
]

describe('packagingFor', () => {
  test('usa a maior faixa atingida', () => {
    assert.equal(packagingFor(embalagens, 20)?.boxes, 1)
    assert.equal(packagingFor(embalagens, 90)?.boxes, 1)
    assert.equal(packagingFor(embalagens, 100)?.boxes, 2)
    assert.equal(packagingFor(embalagens, 150)?.boxes, 2)
    assert.equal(packagingFor(embalagens, 200)?.boxes, 4)
  })

  test('sem regras devolve nulo', () => {
    assert.equal(packagingFor([], 100), null)
  })
})

describe('buildVolumes', () => {
  test('cota por caixa pronta, e não por peça', () => {
    // O problema relatado na comunidade do Melhor Envio é justamente cotar
    // com quantidade acima de 100. Aqui um lote de 200 peças vira 4 caixas.
    const volumes = buildVolumes(embalagens, 200, 760_000)
    assert.equal(volumes.length, 4)
    for (const volume of volumes) {
      assert.equal(volume.weight, 8)
      assert.equal(volume.width, 40)
    }
  })

  test('divide o valor declarado entre as caixas', () => {
    const volumes = buildVolumes(embalagens, 200, 760_000) // R$ 7.600
    assert.equal(totalInsuranceCents(volumes), 760_000)
    for (const volume of volumes) assert.equal(volume.insurance_value, 1900)
  })

  test('centavos que sobram da divisão vão para a primeira caixa', () => {
    const volumes = buildVolumes(embalagens, 200, 100_003) // R$ 1.000,03
    assert.equal(totalInsuranceCents(volumes), 100_003)
    assert.equal(volumes[0].insurance_value, 250.03)
    assert.equal(volumes[1].insurance_value, 250)
  })

  test('respeita as medidas mínimas das transportadoras', () => {
    const minusculo: PackagingRule[] = [
      { fromQty: 20, boxes: 1, weightKg: 0.3, widthCm: 5, heightCm: 1, lengthCm: 8 },
    ]
    const [volume] = buildVolumes(minusculo, 20, 30_000)
    assert.equal(volume.width, 11)
    assert.equal(volume.height, 2)
    assert.equal(volume.length, 16)
  })

  test('soma o peso de várias linhas do carrinho', () => {
    const a = buildVolumes(embalagens, 20, 76_000)
    const b = buildVolumes(embalagens, 100, 380_000)
    const juntos = mergeVolumes([a, b])
    assert.equal(juntos.length, 3)
    assert.equal(totalWeight(juntos), 19.2)
  })
})

describe('coversInsurance', () => {
  test('Loggi não cobre pedido acima de R$ 3.000', () => {
    // Um pedido de R$ 7.600 pela Loggi seria indenizado só até R$ 3.000.
    const resultado = coversInsurance('Loggi Express', 760_000)
    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.equal(resultado.capCents, 300_000)
  })

  test('SEDEX cobre até R$ 10.000', () => {
    assert.deepEqual(coversInsurance('Correios SEDEX', 760_000), { ok: true })
    assert.equal(coversInsurance('Correios SEDEX', 1_100_000).ok, false)
  })

  test('Jadlog cobre a venda de R$ 11.000', () => {
    assert.deepEqual(coversInsurance('Jadlog .Package', 1_100_000), { ok: true })
  })

  test('"Jadlog .Package" não é confundida com PAC', () => {
    // O nome do serviço contém as letras "pac". Uma busca por trecho de texto
    // aplicaria o limite do PAC (R$ 3.000) a uma transportadora que indeniza
    // até R$ 29.900, escondendo a melhor opção nos pedidos grandes.
    for (const nome of ['Jadlog .Package', 'Jadlog Package', 'JADLOG .PACKAGE']) {
      assert.deepEqual(coversInsurance(nome, 1_100_000), { ok: true }, nome)
    }

    // E o PAC de verdade continua limitado.
    const pac = coversInsurance('Correios PAC', 1_100_000)
    assert.equal(pac.ok, false)
    if (pac.ok) return
    assert.equal(pac.capCents, 300_000)
    assert.equal(pac.carrier, 'PAC')
  })

  test('transportadora desconhecida não é bloqueada', () => {
    assert.deepEqual(coversInsurance('Transportadora Nova', 1_100_000), { ok: true })
  })
})

describe('buildShippingOptions', () => {
  const servicos: MelhorEnvioService[] = [
    {
      id: 1,
      name: 'PAC',
      custom_price: '42.50',
      custom_delivery_range: { min: 6, max: 8 },
      company: { id: 1, name: 'Correios' },
    },
    {
      id: 2,
      name: 'SEDEX',
      custom_price: '73.45',
      custom_delivery_range: { min: 3, max: 5 },
      company: { id: 1, name: 'Correios' },
    },
    {
      id: 31,
      name: 'Express',
      custom_price: '38.00',
      custom_delivery_range: { min: 4, max: 6 },
      company: { id: 5, name: 'Loggi' },
    },
    {
      id: 17,
      name: 'Mini Envios',
      error: 'Serviço indisponível para as dimensões informadas',
      company: { id: 1, name: 'Correios' },
    },
  ]

  const base = {
    services: servicos,
    productionMinDays: 7,
    productionMaxDays: 10,
    orderedOn: '2026-09-14',
  }

  test('descarta serviço indisponível', () => {
    const { options, rejected } = buildShippingOptions({ ...base, orderTotalCents: 76_000 })
    assert.equal(
      options.some((option) => option.serviceName === 'Mini Envios'),
      false,
    )
    assert.equal(rejected.some((item) => item.reason === 'indisponivel'), true)
  })

  test('esconde serviço cujo seguro não cobre o pedido', () => {
    // Pedido de R$ 7.600: Loggi (R$ 3.000) e PAC (R$ 3.000) saem da lista.
    const { options, rejected } = buildShippingOptions({ ...base, orderTotalCents: 760_000 })

    assert.deepEqual(
      options.map((option) => option.serviceName),
      ['SEDEX'],
    )
    const motivos = rejected.filter((item) => item.reason === 'seguro_insuficiente')
    assert.equal(motivos.length, 2)
    assert.match(motivos[0].detail ?? '', /R\$/)
  })

  test('soma a produção ao prazo da transportadora', () => {
    const { options } = buildShippingOptions({ ...base, orderTotalCents: 76_000 })
    const sedex = options.find((option) => option.serviceName === 'SEDEX')!

    assert.equal(sedex.carrierMinDays, 3)
    assert.equal(sedex.carrierMaxDays, 5)
    assert.equal(sedex.totalMinDays, 10) // 7 de produção + 3
    assert.equal(sedex.totalMaxDays, 15) // 10 de produção + 5
  })

  test('ordena da opção mais barata para a mais cara', () => {
    const { options } = buildShippingOptions({ ...base, orderTotalCents: 76_000 })
    const precos = options.map((option) => option.priceCents)
    assert.deepEqual(precos, [...precos].sort((a, b) => a - b))
  })

  test('monta o texto com preço, prazo e data', () => {
    const { options } = buildShippingOptions({ ...base, orderTotalCents: 76_000 })
    const sedex = options.find((option) => option.serviceName === 'SEDEX')!
    assert.match(sedex.label, /Correios SEDEX/)
    assert.match(sedex.label, /R\$\s?73,45/)
    assert.match(sedex.label, /10 a 15 dias úteis/)
    assert.match(sedex.label, /chega até \d{2}\/\d{2}\/\d{4}/)
  })

  test('aplica frete grátis acima do valor configurado', () => {
    const { options } = buildShippingOptions({
      ...base,
      orderTotalCents: 300_000,
      freeShippingFromCents: 200_000,
    })
    for (const option of options) assert.equal(option.priceCents, 0)
    assert.match(options[0].label, /frete grátis/)
  })

  test('usa o preço ajustado no painel, não o preço de tabela', () => {
    const { options } = buildShippingOptions({
      ...base,
      services: [
        {
          id: 2,
          name: 'SEDEX',
          price: '100.00',
          custom_price: '73.45',
          custom_delivery_range: { min: 3, max: 5 },
          company: { id: 1, name: 'Correios' },
        },
      ],
      orderTotalCents: 76_000,
    })
    assert.equal(options[0].priceCents, 7_345)
  })

  test('serviço sem prazo é descartado em vez de virar promessa vazia', () => {
    const { options, rejected } = buildShippingOptions({
      ...base,
      services: [{ id: 9, name: 'Sem prazo', custom_price: '10.00', company: { id: 9, name: 'X' } }],
      orderTotalCents: 76_000,
    })
    assert.equal(options.length, 0)
    assert.equal(rejected[0].reason, 'sem_prazo')
  })
})

describe('fallbackOption', () => {
  test('oferece combinar pelo WhatsApp em vez de travar o checkout', () => {
    const fallback = fallbackOption('5533999478774', 'Lembrancinha bomboniere')
    assert.match(fallback.whatsappUrl, /^https:\/\/wa\.me\/5533999478774\?text=/)
    assert.match(decodeURIComponent(fallback.whatsappUrl), /Lembrancinha bomboniere/)
  })
})
