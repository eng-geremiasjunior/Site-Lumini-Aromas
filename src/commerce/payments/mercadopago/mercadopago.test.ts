import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildSignatureTemplate,
  normalizeDataId,
  parseSignatureHeader,
  signWebhook,
  verifyWebhookSignature,
  webhookDedupeKey,
} from './webhook.ts'
import { extractFees, mapPaymentStatus, rejectionMessage } from './status.ts'

const SECRET = 'segredo-do-webhook-de-teste'
const NOW = 1_757_500_000_000

describe('assinatura do webhook', () => {
  test('separa ts e v1 do cabeçalho', () => {
    assert.deepEqual(parseSignatureHeader('ts=1704908010,v1=abc123'), {
      ts: '1704908010',
      v1: 'abc123',
    })
  })

  test('aceita espaços e ordem trocada', () => {
    assert.deepEqual(parseSignatureHeader(' v1=abc , ts=123 '), { ts: '123', v1: 'abc' })
  })

  test('devolve nulo quando falta parte', () => {
    assert.equal(parseSignatureHeader('ts=123'), null)
    assert.equal(parseSignatureHeader(''), null)
    assert.equal(parseSignatureHeader(null), null)
  })

  test('monta o texto assinado na ordem exigida', () => {
    assert.equal(
      buildSignatureTemplate({ dataId: '123456', requestId: 'req-1', ts: '1700' }),
      'id:123456;request-id:req-1;ts:1700;',
    )
  })

  test('omite as partes ausentes, sem deixar rótulo solto', () => {
    assert.equal(buildSignatureTemplate({ ts: '1700' }), 'ts:1700;')
    assert.equal(buildSignatureTemplate({ dataId: '9', ts: '1700' }), 'id:9;ts:1700;')
  })

  test('identificador com letras é comparado em minúsculas', () => {
    assert.equal(normalizeDataId('AbC123'), 'abc123')
    assert.equal(normalizeDataId('123456'), '123456')
  })

  test('aceita uma notificação legítima', () => {
    const ts = String(NOW)
    const header = signWebhook({ dataId: '123456', requestId: 'req-1', ts, secret: SECRET })

    assert.deepEqual(
      verifyWebhookSignature({
        signatureHeader: header,
        requestId: 'req-1',
        dataId: '123456',
        secret: SECRET,
        now: NOW,
      }),
      { ok: true },
    )
  })

  test('recusa assinatura feita com outro segredo', () => {
    const ts = String(NOW)
    const header = signWebhook({ dataId: '123456', requestId: 'req-1', ts, secret: 'outro' })

    const resultado = verifyWebhookSignature({
      signatureHeader: header,
      requestId: 'req-1',
      dataId: '123456',
      secret: SECRET,
      now: NOW,
    })

    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.equal(resultado.reason, 'assinatura_invalida')
  })

  test('recusa quando o identificador do pagamento foi trocado', () => {
    // É a tentativa mais óbvia: reaproveitar uma assinatura válida
    // apontando para outro pedido.
    const ts = String(NOW)
    const header = signWebhook({ dataId: '123456', requestId: 'req-1', ts, secret: SECRET })

    const resultado = verifyWebhookSignature({
      signatureHeader: header,
      requestId: 'req-1',
      dataId: '999999',
      secret: SECRET,
      now: NOW,
    })

    assert.equal(resultado.ok, false)
  })

  test('recusa notificação antiga', () => {
    const ts = String(NOW - 60 * 60 * 1000) // uma hora atrás
    const header = signWebhook({ dataId: '123456', requestId: 'req-1', ts, secret: SECRET })

    const resultado = verifyWebhookSignature({
      signatureHeader: header,
      requestId: 'req-1',
      dataId: '123456',
      secret: SECRET,
      now: NOW,
    })

    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.equal(resultado.reason, 'expirada')
  })

  test('sem segredo configurado, nada é aceito', () => {
    const resultado = verifyWebhookSignature({
      signatureHeader: 'ts=1,v1=abc',
      requestId: 'req',
      dataId: '1',
      secret: undefined,
      now: NOW,
    })
    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.equal(resultado.reason, 'sem_segredo')
  })

  test('hash com tamanho diferente não quebra a verificação', () => {
    const resultado = verifyWebhookSignature({
      signatureHeader: `ts=${NOW},v1=abc`,
      requestId: 'req',
      dataId: '1',
      secret: SECRET,
      now: NOW,
    })
    assert.equal(resultado.ok, false)
  })
})

describe('idempotência da notificação', () => {
  test('a mesma notificação gera a mesma chave', () => {
    const chave = webhookDedupeKey({ type: 'payment', action: 'payment.updated', dataId: '123' })
    assert.equal(chave, webhookDedupeKey({ type: 'payment', action: 'payment.updated', dataId: '123' }))
  })

  test('criação e atualização do mesmo pagamento são chaves distintas', () => {
    // O Mercado Pago manda as duas; a compra só pode ser contada uma vez,
    // então o processamento decide o que fazer com cada uma.
    assert.notEqual(
      webhookDedupeKey({ type: 'payment', action: 'payment.created', dataId: '123' }),
      webhookDedupeKey({ type: 'payment', action: 'payment.updated', dataId: '123' }),
    )
  })
})

describe('estado do pagamento vira estado do pedido', () => {
  test('aprovado libera a produção e conta como receita', () => {
    const mapa = mapPaymentStatus('approved')
    assert.equal(mapa.orderStatus, 'processing')
    assert.equal(mapa.paid, true)
    assert.equal(mapa.blocksShipping, false)
  })

  test('autorizado sem captura ainda não é receita', () => {
    const mapa = mapPaymentStatus('authorized')
    assert.equal(mapa.paid, false)
    assert.equal(mapa.orderStatus, 'pending')
  })

  test('Pix aguardando pagamento tem mensagem própria', () => {
    const mapa = mapPaymentStatus('pending', 'pending_waiting_transfer')
    assert.equal(mapa.orderStatus, 'pending')
    assert.match(mapa.customerMessage, /Pix/)
  })

  test('recusado vira malsucedido', () => {
    const mapa = mapPaymentStatus('rejected', 'cc_rejected_insufficient_amount')
    assert.equal(mapa.orderStatus, 'failed')
    assert.equal(mapa.paid, false)
    assert.match(mapa.customerMessage, /limite/)
  })

  test('contestação bloqueia o envio', () => {
    const mapa = mapPaymentStatus('charged_back')
    assert.equal(mapa.orderStatus, 'disputed')
    assert.equal(mapa.blocksShipping, true)
    assert.match(mapa.internalNote, /não despache/i)
  })

  test('mediação também bloqueia o envio', () => {
    assert.equal(mapPaymentStatus('in_mediation').blocksShipping, true)
  })

  test('reembolso parcial é anotado como parcial', () => {
    const mapa = mapPaymentStatus('refunded', 'partially_refunded')
    assert.equal(mapa.orderStatus, 'refunded')
    assert.match(mapa.internalNote, /parcial/)
  })

  test('estado desconhecido não libera produção por engano', () => {
    const mapa = mapPaymentStatus('algo_novo_do_mercado_pago')
    assert.equal(mapa.paid, false)
    assert.equal(mapa.blocksShipping, true)
    assert.match(mapa.internalNote, /não reconhecido/)
  })
})

describe('mensagens de recusa', () => {
  test('traduz os motivos mais comuns', () => {
    assert.match(rejectionMessage('cc_rejected_call_for_authorize'), /banco/)
    assert.match(rejectionMessage('cc_rejected_bad_filled_security_code'), /código de segurança/)
    assert.match(rejectionMessage('cc_rejected_max_attempts'), /Pix/)
  })

  test('motivo desconhecido ainda orienta o cliente', () => {
    assert.match(rejectionMessage('motivo_novo'), /outra forma de pagamento/)
  })
})

describe('taxas do pagamento', () => {
  test('usa o detalhamento informado pelo Mercado Pago', () => {
    const taxas = extractFees({
      transaction_amount: 2280,
      transaction_details: { net_received_amount: 2166.45 },
      fee_details: [{ type: 'mercadopago_fee', amount: 113.55, fee_payer: 'collector' }],
    })

    assert.equal(taxas.grossCents, 228_000)
    assert.equal(taxas.feeCents, 11_355)
    assert.equal(taxas.netCents, 216_645)
    assert.equal(taxas.feeBreakdown[0].type, 'mercadopago_fee')
  })

  test('ignora taxa paga pelo comprador', () => {
    // Juros de parcelamento pagos pelo cliente não são custo da loja.
    const taxas = extractFees({
      transaction_amount: 1000,
      transaction_details: { net_received_amount: 950 },
      fee_details: [
        { type: 'mercadopago_fee', amount: 50, fee_payer: 'collector' },
        { type: 'financing_fee', amount: 120, fee_payer: 'payer' },
      ],
    })
    assert.equal(taxas.feeCents, 5_000)
  })

  test('sem detalhamento, calcula pela diferença entre bruto e líquido', () => {
    const taxas = extractFees({
      transaction_amount: 1000,
      transaction_details: { net_received_amount: 950 },
    })
    assert.equal(taxas.feeCents, 5_000)
    assert.equal(taxas.netCents, 95_000)
  })

  test('pagamento vazio não quebra o cálculo', () => {
    const taxas = extractFees({})
    assert.equal(taxas.grossCents, 0)
    assert.equal(taxas.feeCents, 0)
  })
})
