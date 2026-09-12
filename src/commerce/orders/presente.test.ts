import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  LIMITE_DA_MENSAGEM,
  lembretesDeEmbalagem,
  montarCartao,
  nomeParaEntrega,
} from './presente.ts'

describe('montarCartao', () => {
  it('monta as três linhas na ordem em que se lê um cartão', () => {
    const resultado = montarCartao({
      de: 'Geremias e Enzo',
      para: 'Luana Godinho',
      mensagem: 'Para fazer você sorrir.',
    })

    assert.ok(resultado.ok)
    assert.deepEqual(resultado.cartao.linhas, [
      'Para Luana Godinho',
      'Para fazer você sorrir.',
      'De Geremias e Enzo',
    ])
  })

  it('aceita presente anônimo', () => {
    const resultado = montarCartao({ de: '', para: 'Luana Godinho', mensagem: 'Surpresa!' })

    assert.ok(resultado.ok)
    assert.equal(resultado.cartao.de, null)
    assert.deepEqual(resultado.cartao.linhas, ['Para Luana Godinho', 'Surpresa!'])
  })

  it('aceita cartão sem recado', () => {
    const resultado = montarCartao({ de: 'Ana', para: 'Luana', mensagem: '' })

    assert.ok(resultado.ok)
    assert.equal(resultado.cartao.mensagem, null)
    assert.deepEqual(resultado.cartao.linhas, ['Para Luana', 'De Ana'])
  })

  it('exige o nome de quem recebe', () => {
    // Sem ele, quem abre a caixa não sabe se o presente é dela.
    const resultado = montarCartao({ de: 'Ana', para: '   ', mensagem: 'Oi' })

    assert.equal(resultado.ok, false)
    assert.equal(!resultado.ok && resultado.campo, 'para')
  })

  it('recusa recado que não caberia impresso, dizendo o tamanho', () => {
    const resultado = montarCartao({
      de: 'Ana',
      para: 'Luana',
      mensagem: 'a'.repeat(LIMITE_DA_MENSAGEM + 1),
    })

    assert.equal(resultado.ok, false)
    assert.ok(!resultado.ok && resultado.mensagem.includes(String(LIMITE_DA_MENSAGEM)))
    assert.ok(!resultado.ok && resultado.mensagem.includes(String(LIMITE_DA_MENSAGEM + 1)))
  })

  it('aceita exatamente no limite', () => {
    const resultado = montarCartao({
      de: 'Ana',
      para: 'Luana',
      mensagem: 'a'.repeat(LIMITE_DA_MENSAGEM),
    })

    assert.equal(resultado.ok, true)
  })

  it('arruma espaço sobrando, que é o que a cópia e cola traz', () => {
    const resultado = montarCartao({
      de: '  Geremias   e  Enzo ',
      para: ' Luana  Godinho ',
      mensagem: ' Para fazer\n você sorrir. ',
    })

    assert.ok(resultado.ok)
    assert.equal(resultado.cartao.de, 'Geremias e Enzo')
    assert.equal(resultado.cartao.para, 'Luana Godinho')
    assert.equal(resultado.cartao.mensagem, 'Para fazer você sorrir.')
  })
})

describe('nomeParaEntrega', () => {
  it('é o nome de quem recebe, não o de quem pagou', () => {
    // O erro clássico: a encomenda sai com o nome do comprador e o endereço
    // de quem recebe, e o porteiro devolve.
    assert.equal(nomeParaEntrega({ para: 'Luana Godinho' }, 'Geremias Júnior'), 'Luana Godinho')
  })

  it('sem presente, é o comprador mesmo', () => {
    assert.equal(nomeParaEntrega(null, 'Geremias Júnior'), 'Geremias Júnior')
    assert.equal(nomeParaEntrega({ para: '  ' }, 'Geremias Júnior'), 'Geremias Júnior')
  })
})

describe('lembretesDeEmbalagem', () => {
  const cartao = montarCartao({ de: 'Ana', para: 'Luana', mensagem: 'Oi' })

  it('lembra do preço, que é o erro que não se desfaz', () => {
    assert.ok(cartao.ok)
    const lembretes = lembretesDeEmbalagem(cartao.cartao)
    assert.ok(lembretes.some((linha) => linha.toLowerCase().includes('preço')))
  })

  it('lembra do cartão e do nome da etiqueta', () => {
    assert.ok(cartao.ok)
    const lembretes = lembretesDeEmbalagem(cartao.cartao)
    assert.ok(lembretes.some((linha) => linha.toLowerCase().includes('cartão')))
    assert.ok(lembretes.some((linha) => linha.includes('Luana')))
  })
})
