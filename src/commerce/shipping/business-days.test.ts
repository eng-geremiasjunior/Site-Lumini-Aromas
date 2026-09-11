import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  addBusinessDays,
  countBusinessDays,
  easterSunday,
  estimateDelivery,
  formatIsoDate,
  nationalHolidays,
  productionDaysFor,
} from './business-days.ts'

describe('Páscoa e feriados móveis', () => {
  test('calcula o domingo de Páscoa', () => {
    assert.equal(formatIsoDate(easterSunday(2026)), '2026-04-05')
    assert.equal(formatIsoDate(easterSunday(2027)), '2027-03-28')
    assert.equal(formatIsoDate(easterSunday(2025)), '2025-04-20')
  })

  test('deriva Carnaval, Sexta-feira Santa e Corpus Christi', () => {
    const feriados = nationalHolidays(2026)
    assert.ok(feriados.has('2026-02-16'), 'segunda de Carnaval')
    assert.ok(feriados.has('2026-02-17'), 'terça de Carnaval')
    assert.ok(feriados.has('2026-04-03'), 'Sexta-feira Santa')
    assert.ok(feriados.has('2026-06-04'), 'Corpus Christi')
  })

  test('inclui os feriados fixos', () => {
    const feriados = nationalHolidays(2026)
    for (const data of [
      '2026-01-01',
      '2026-04-21',
      '2026-05-01',
      '2026-09-07',
      '2026-10-12',
      '2026-11-02',
      '2026-11-15',
      '2026-11-20',
      '2026-12-25',
    ]) {
      assert.ok(feriados.has(data), `faltou o feriado ${data}`)
    }
  })
})

describe('addBusinessDays', () => {
  test('não conta o dia da postagem', () => {
    // Segunda 14/09/2026 + 2 dias úteis = quarta 16/09.
    assert.equal(addBusinessDays('2026-09-14', 2), '2026-09-16')
  })

  test('pula o fim de semana', () => {
    // Sexta 11/09/2026 + 1 dia útil = segunda 14/09.
    assert.equal(addBusinessDays('2026-09-11', 1), '2026-09-14')
  })

  test('pula feriado nacional', () => {
    // Sexta 04/09/2026 + 1 dia útil cairia na segunda 07/09 (Independência),
    // então vai para terça 08/09.
    assert.equal(addBusinessDays('2026-09-04', 1), '2026-09-08')
  })

  test('pula o Carnaval inteiro', () => {
    // Sexta 13/02/2026 + 1 dia útil: segunda e terça são Carnaval,
    // quarta de cinzas é dia útil pela regra adotada.
    assert.equal(addBusinessDays('2026-02-13', 1), '2026-02-18')
  })

  test('prazo zero cai no próximo dia útil', () => {
    // Sábado com prazo zero vira segunda.
    assert.equal(addBusinessDays('2026-09-12', 0), '2026-09-14')
  })

  test('aceita feriado extra, como recesso do ateliê', () => {
    assert.equal(
      addBusinessDays('2026-09-14', 1, { extraHolidays: ['2026-09-15'] }),
      '2026-09-16',
    )
  })

  test('atravessa a virada do ano', () => {
    // 30/12/2026 é quarta. Contando dias úteis: 31/12 (1), 01/01 é feriado,
    // 02 e 03 é fim de semana, 04/01 segunda (2), 05/01 terça (3).
    assert.equal(addBusinessDays('2026-12-30', 3), '2027-01-05')
  })
})

describe('countBusinessDays', () => {
  test('conta os dias úteis entre duas datas', () => {
    assert.equal(countBusinessDays('2026-09-14', '2026-09-18'), 4)
  })

  test('desconta feriado no intervalo', () => {
    // 04/09 a 11/09 tem 5 dias corridos úteis, menos 07/09 (Independência).
    assert.equal(countBusinessDays('2026-09-04', '2026-09-11'), 4)
  })

  test('retorna zero quando a data final não é posterior', () => {
    assert.equal(countBusinessDays('2026-09-14', '2026-09-14'), 0)
  })
})

describe('productionDaysFor', () => {
  const regras = [
    { fromQty: 20, minDays: 7, maxDays: 10 },
    { fromQty: 70, minDays: 10, maxDays: 15 },
    { fromQty: 150, minDays: 15, maxDays: 20 },
  ]

  test('usa a maior faixa atingida', () => {
    assert.deepEqual(productionDaysFor(regras, 20), { minDays: 7, maxDays: 10 })
    assert.deepEqual(productionDaysFor(regras, 60), { minDays: 7, maxDays: 10 })
    assert.deepEqual(productionDaysFor(regras, 70), { minDays: 10, maxDays: 15 })
    assert.deepEqual(productionDaysFor(regras, 120), { minDays: 10, maxDays: 15 })
    assert.deepEqual(productionDaysFor(regras, 200), { minDays: 15, maxDays: 20 })
  })

  test('abaixo da primeira faixa usa a primeira', () => {
    assert.deepEqual(productionDaysFor(regras, 5), { minDays: 7, maxDays: 10 })
  })

  test('sem regras devolve zero', () => {
    assert.deepEqual(productionDaysFor([], 100), { minDays: 0, maxDays: 0 })
  })
})

describe('estimateDelivery', () => {
  const regras = [
    { fromQty: 20, minDays: 7, maxDays: 10 },
    { fromQty: 150, minDays: 15, maxDays: 20 },
  ]

  test('soma produção e transportadora', () => {
    const prazo = estimateDelivery({
      orderedOn: '2026-09-14', // segunda
      qty: 60,
      productionRules: regras,
      carrierMinDays: 6,
      carrierMaxDays: 8,
    })

    assert.equal(prazo.productionMinDays, 7)
    assert.equal(prazo.productionMaxDays, 10)
    assert.equal(prazo.totalMinDays, 13)
    assert.equal(prazo.totalMaxDays, 18)
    assert.equal(prazo.earliest, addBusinessDays('2026-09-14', 13))
    assert.equal(prazo.latest, addBusinessDays('2026-09-14', 18))
  })

  test('lote grande aumenta o prazo de produção', () => {
    const prazo = estimateDelivery({
      orderedOn: '2026-09-14',
      qty: 200,
      productionRules: regras,
      carrierMinDays: 6,
      carrierMaxDays: 8,
    })
    assert.equal(prazo.totalMinDays, 21)
    assert.equal(prazo.totalMaxDays, 28)
  })

  test('monta o texto mostrado ao cliente', () => {
    const prazo = estimateDelivery({
      orderedOn: '2026-09-14',
      qty: 60,
      productionRules: regras,
      carrierMinDays: 6,
      carrierMaxDays: 8,
    })

    assert.match(prazo.label, /Produção artesanal em 7 a 10 dias úteis/)
    assert.match(prazo.label, /entrega em 6 a 8 dias úteis/)
    assert.match(prazo.label, /Chega até \d{2}\/\d{2}\/\d{4}/)
  })

  test('prazo igual em mínimo e máximo não repete o número', () => {
    const prazo = estimateDelivery({
      orderedOn: '2026-09-14',
      qty: 60,
      productionRules: [{ fromQty: 20, minDays: 10, maxDays: 10 }],
      carrierMinDays: 5,
      carrierMaxDays: 5,
    })
    assert.match(prazo.label, /Produção artesanal em 10 dias úteis/)
    assert.match(prazo.label, /entrega em 5 dias úteis/)
  })
})
