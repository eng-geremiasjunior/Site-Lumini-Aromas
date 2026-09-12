import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { fraseDaUltimaVenda, legendaDaFoto } from './prova-social.ts'

describe('fraseDaUltimaVenda', () => {
  it('monta a frase completa', () => {
    const frase = fraseDaUltimaVenda({
      quantidade: 100,
      tipoDoEvento: 'Casamento',
      cidade: 'Governador Valadares',
      quando: '2026-10-12T00:00:00.000Z',
    })

    assert.equal(
      frase,
      'As últimas 100 peças deste modelo foram para um casamento em Governador Valadares, em outubro.',
    )
  })

  it('nunca cita o nome de ninguém', () => {
    // O tipo `VendaAnterior` nem tem campo de nome, e é de propósito: foto e
    // nome de cliente em página pública, sem base legal, é problema.
    const frase = fraseDaUltimaVenda({
      quantidade: 60,
      tipoDoEvento: 'Casamento',
      cidade: 'Juiz de Fora',
      quando: '2026-09-01T00:00:00.000Z',
    })

    assert.ok(!/marina|ana|cliente/i.test(frase ?? ''))
  })

  it('funciona sem cidade', () => {
    const frase = fraseDaUltimaVenda({
      quantidade: 40,
      tipoDoEvento: 'Batizado',
      quando: '2026-08-10T00:00:00.000Z',
    })

    assert.equal(frase, 'As últimas 40 peças deste modelo foram para um batizado, em agosto.')
  })

  it('funciona sem data', () => {
    const frase = fraseDaUltimaVenda({ quantidade: 30, tipoDoEvento: '15 anos', cidade: 'Ipatinga' })
    assert.equal(frase, 'As últimas 30 peças deste modelo foram para um 15 anos em Ipatinga.')
  })

  it('sem tipo de evento, diz "um evento" em vez de deixar buraco', () => {
    const frase = fraseDaUltimaVenda({ quantidade: 20, cidade: 'Belo Horizonte' })
    assert.equal(frase, 'As últimas 20 peças deste modelo foram para um evento em Belo Horizonte.')
  })

  it('cala a boca quando não há venda anterior', () => {
    // Produto novo fica em silêncio. "Seja o primeiro a comprar" anuncia
    // que ninguém comprou, e isso derruba mais do que a ausência da frase.
    assert.equal(fraseDaUltimaVenda(null), null)
    assert.equal(fraseDaUltimaVenda({ quantidade: 0 }), null)
  })

  it('concorda o artigo com bodas', () => {
    const frase = fraseDaUltimaVenda({ quantidade: 50, tipoDoEvento: 'Bodas', cidade: 'Contagem' })
    assert.ok(frase?.includes('para umas bodas'))
  })

  it('não deixa espaço sobrando antes da vírgula', () => {
    const frase = fraseDaUltimaVenda({
      quantidade: 100,
      tipoDoEvento: 'Casamento',
      quando: '2026-10-12T00:00:00.000Z',
    })
    assert.ok(!frase?.includes(' ,'))
  })
})

describe('legendaDaFoto', () => {
  it('junta tipo, cidade e mês', () => {
    assert.equal(
      legendaDaFoto({ tipo: 'Casamento', cidade: 'Juiz de Fora', quando: '2026-10-12' }),
      'Casamento · Juiz de Fora · outubro',
    )
  })

  it('aguenta faltar pedaço', () => {
    assert.equal(legendaDaFoto({ tipo: 'Batizado' }), 'Batizado')
    assert.equal(legendaDaFoto({ cidade: 'Ipatinga', quando: '2026-03-01' }), 'Ipatinga · março')
  })

  it('devolve nada quando não há nada a dizer', () => {
    assert.equal(legendaDaFoto({}), null)
  })

  it('data inválida não vira "Invalid Date" na tela', () => {
    assert.equal(legendaDaFoto({ tipo: 'Casamento', quando: 'qualquer coisa' }), 'Casamento')
  })
})
