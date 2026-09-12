import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  DIAS_ATE_DESISTIR,
  deveDesistir,
  estaAbandonado,
  proximoLembrete,
  type EstadoDoCarrinho,
} from './abandonment.ts'

const AGORA = new Date('2026-09-11T12:00:00.000Z')

function minutosAtras(minutos: number): string {
  return new Date(AGORA.getTime() - minutos * 60_000).toISOString()
}

function horasAtras(horas: number): string {
  return minutosAtras(horas * 60)
}

const BASE: EstadoDoCarrinho = {
  status: 'active',
  email: 'ana@exemplo.com.br',
  temItens: true,
  lastActivityAt: horasAtras(2),
  recoveryStep: 0,
}

describe('estaAbandonado', () => {
  it('carrinho mexido agora não é abandonado', () => {
    assert.equal(estaAbandonado({ ...BASE, lastActivityAt: minutosAtras(3) }, AGORA), false)
  })

  it('parado há mais de vinte minutos, é', () => {
    assert.equal(estaAbandonado({ ...BASE, lastActivityAt: minutosAtras(21) }, AGORA), true)
  })

  it('carrinho vazio nunca conta', () => {
    assert.equal(estaAbandonado({ ...BASE, temItens: false }, AGORA), false)
  })

  it('carrinho que virou pedido nunca conta', () => {
    assert.equal(estaAbandonado({ ...BASE, status: 'converted' }, AGORA), false)
  })
})

describe('proximoLembrete', () => {
  it('não manda nada antes da primeira hora', () => {
    assert.equal(proximoLembrete({ ...BASE, lastActivityAt: minutosAtras(45) }, AGORA), null)
  })

  it('manda o primeiro depois de uma hora', () => {
    assert.equal(proximoLembrete({ ...BASE, lastActivityAt: horasAtras(1.5) }, AGORA), 1)
  })

  it('só manda o segundo depois de um dia', () => {
    assert.equal(
      proximoLembrete({ ...BASE, lastActivityAt: horasAtras(5), recoveryStep: 1 }, AGORA),
      null,
    )
    assert.equal(
      proximoLembrete({ ...BASE, lastActivityAt: horasAtras(25), recoveryStep: 1 }, AGORA),
      2,
    )
  })

  it('o terceiro é o último: depois dele, silêncio', () => {
    assert.equal(
      proximoLembrete({ ...BASE, lastActivityAt: horasAtras(80), recoveryStep: 2 }, AGORA),
      3,
    )
    assert.equal(
      proximoLembrete({ ...BASE, lastActivityAt: horasAtras(80), recoveryStep: 3 }, AGORA),
      null,
    )
  })

  it('nunca pula um passo, mesmo depois de muito tempo parado', () => {
    // Carrinho parado há três dias que ainda não recebeu nada começa pelo
    // primeiro lembrete, não pelo terceiro.
    assert.equal(
      proximoLembrete({ ...BASE, lastActivityAt: horasAtras(72), recoveryStep: 0 }, AGORA),
      1,
    )
  })

  it('sem e-mail não há quem lembrar', () => {
    assert.equal(proximoLembrete({ ...BASE, email: null }, AGORA), null)
  })

  it('carrinho vazio não recebe lembrete', () => {
    assert.equal(proximoLembrete({ ...BASE, temItens: false }, AGORA), null)
  })

  it('carrinho que virou pedido não recebe lembrete', () => {
    assert.equal(proximoLembrete({ ...BASE, status: 'converted' }, AGORA), null)
  })

  it('carrinho marcado como perdido não recebe mais nada', () => {
    assert.equal(proximoLembrete({ ...BASE, status: 'lost' }, AGORA), null)
  })

  it('para de insistir depois de uma semana', () => {
    assert.equal(
      proximoLembrete(
        { ...BASE, lastActivityAt: horasAtras(DIAS_ATE_DESISTIR * 24 + 1), recoveryStep: 0 },
        AGORA,
      ),
      null,
    )
  })
})

describe('deveDesistir', () => {
  it('carrinho de ontem continua na lista', () => {
    assert.equal(deveDesistir({ ...BASE, lastActivityAt: horasAtras(30) }, AGORA), false)
  })

  it('carrinho de duas semanas sai', () => {
    assert.equal(deveDesistir({ ...BASE, lastActivityAt: horasAtras(24 * 14) }, AGORA), true)
  })

  it('carrinho que virou pedido não é mexido', () => {
    assert.equal(
      deveDesistir({ ...BASE, status: 'converted', lastActivityAt: horasAtras(24 * 14) }, AGORA),
      false,
    )
  })
})
