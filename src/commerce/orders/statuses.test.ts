import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  ORDER_STATUSES,
  canTransition,
  nextStatus,
  paidStatuses,
  revenueStatuses,
} from './statuses.ts'

describe('definições das situações', () => {
  test('só conta receita quando o dinheiro entrou ou já entrou', () => {
    // Um pedido aguardando pagamento nunca pode inflar o faturamento.
    assert.equal(ORDER_STATUSES.pending.countsInRevenue, false)
    assert.equal(ORDER_STATUSES.failed.countsInRevenue, false)
    assert.equal(ORDER_STATUSES.cancelled.countsInRevenue, false)
    assert.equal(ORDER_STATUSES.refunded.countsInRevenue, false)
    assert.equal(ORDER_STATUSES.disputed.countsInRevenue, false)
  })

  test('as situações de produção em diante contam como receita', () => {
    for (const chave of ['processing', 'art_approval', 'production', 'shipped', 'completed'] as const) {
      assert.equal(ORDER_STATUSES[chave].countsInRevenue, true, chave)
    }
  })

  test('envio fica bloqueado até o pedido estar despachado', () => {
    for (const chave of ['pending', 'processing', 'art_approval', 'production'] as const) {
      assert.equal(ORDER_STATUSES[chave].blocksShipping, true, chave)
    }
    assert.equal(ORDER_STATUSES.shipped.blocksShipping, false)
  })

  test('disputa bloqueia envio e some da área do cliente', () => {
    assert.equal(ORDER_STATUSES.disputed.blocksShipping, true)
    assert.equal(ORDER_STATUSES.disputed.visibleToCustomer, false)
  })

  test('o cliente só cancela sozinho antes da produção começar', () => {
    assert.equal(ORDER_STATUSES.pending.allowsCustomerCancel, true)
    assert.equal(ORDER_STATUSES.processing.allowsCustomerCancel, true)
    assert.equal(ORDER_STATUSES.production.allowsCustomerCancel, false)
    assert.equal(ORDER_STATUSES.shipped.allowsCustomerCancel, false)
  })

  test('lista de situações pagas e de faturamento bate com as definições', () => {
    assert.deepEqual(paidStatuses().sort(), [
      'art_approval',
      'completed',
      'processing',
      'production',
      'shipped',
    ])
    assert.deepEqual(revenueStatuses().sort(), [
      'art_approval',
      'completed',
      'processing',
      'production',
      'shipped',
    ])
  })
})

describe('transições permitidas', () => {
  test('o caminho normal funciona', () => {
    assert.deepEqual(canTransition('pending', 'processing'), { ok: true })
    assert.deepEqual(canTransition('processing', 'production'), { ok: true })
    assert.deepEqual(canTransition('production', 'shipped'), { ok: true })
    assert.deepEqual(canTransition('shipped', 'completed'), { ok: true })
  })

  test('não dá para despachar um pedido não pago', () => {
    const resultado = canTransition('pending', 'shipped')
    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.match(resultado.motivo, /Aguardando pagamento/)
  })

  test('não dá para voltar de concluído para produção', () => {
    assert.equal(canTransition('completed', 'production').ok, false)
  })

  test('reembolsado é ponto final', () => {
    for (const destino of ['processing', 'production', 'shipped', 'completed'] as const) {
      assert.equal(canTransition('refunded', destino).ok, false, destino)
    }
  })

  test('pedido malsucedido pode tentar de novo', () => {
    // Cartão recusado não é fim de linha: o cliente tenta outra forma.
    assert.deepEqual(canTransition('failed', 'pending'), { ok: true })
    assert.deepEqual(canTransition('failed', 'processing'), { ok: true })
  })

  test('disputa pode ser resolvida a favor da loja ou virar reembolso', () => {
    assert.deepEqual(canTransition('disputed', 'processing'), { ok: true })
    assert.deepEqual(canTransition('disputed', 'refunded'), { ok: true })
  })

  test('mudar para a mesma situação não é erro', () => {
    assert.deepEqual(canTransition('production', 'production'), { ok: true })
  })
})

describe('proteção da aprovação de arte', () => {
  test('não começa a produzir sem a arte aprovada', () => {
    const resultado = canTransition('art_approval', 'production', { requiresArtApproval: true })
    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.match(resultado.motivo, /aprovada pelo cliente/)
  })

  test('com a arte aprovada, libera', () => {
    assert.deepEqual(
      canTransition('art_approval', 'production', {
        requiresArtApproval: true,
        artApprovedAt: '2026-09-11T10:00:00Z',
      }),
      { ok: true },
    )
  })

  test('produto sem arte não exige aprovação', () => {
    assert.deepEqual(canTransition('processing', 'production', { requiresArtApproval: false }), {
      ok: true,
    })
  })
})

describe('proteção da nota fiscal', () => {
  test('não despacha sem nota quando a loja exige', () => {
    const resultado = canTransition('production', 'shipped', { requiresInvoice: true })
    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.match(resultado.motivo, /nota fiscal/)
  })

  test('com a nota emitida, libera', () => {
    assert.deepEqual(
      canTransition('production', 'shipped', { requiresInvoice: true, invoiceIssued: true }),
      { ok: true },
    )
  })
})

describe('próximo passo sugerido', () => {
  test('segue o caminho normal', () => {
    assert.equal(nextStatus('pending'), 'processing')
    assert.equal(nextStatus('production'), 'shipped')
    assert.equal(nextStatus('shipped'), 'completed')
  })

  test('passa pela aprovação de arte quando o pedido tem personalização', () => {
    assert.equal(nextStatus('processing', { requiresArtApproval: true }), 'art_approval')
    assert.equal(nextStatus('processing', { requiresArtApproval: false }), 'production')
  })

  test('situação final não sugere próximo passo', () => {
    assert.equal(nextStatus('completed'), null)
    assert.equal(nextStatus('refunded'), null)
    assert.equal(nextStatus('cancelled'), null)
  })

  test('não sugere produção se a arte ainda não foi aprovada', () => {
    assert.equal(nextStatus('art_approval', { requiresArtApproval: true }), null)
  })
})
