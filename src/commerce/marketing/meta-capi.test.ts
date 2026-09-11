import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildEvent,
  buildEventsPayload,
  buildFbc,
  buildUserData,
  chooseActionSource,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  normalizeZip,
  sha256,
} from './meta-capi.ts'

const AGORA = 1_757_500_000 // segundos
const DIA = 24 * 60 * 60

describe('normalização antes do hash', () => {
  test('e-mail em minúsculas e sem espaços', () => {
    assert.equal(normalizeEmail('  Cliente@Gmail.COM '), 'cliente@gmail.com')
  })

  test('telefone brasileiro vira formato internacional só com dígitos', () => {
    assert.equal(normalizePhone('(33) 99947-8774'), '5533999478774')
    assert.equal(normalizePhone('33999478774'), '5533999478774')
    assert.equal(normalizePhone('+55 33 99947-8774'), '5533999478774')
    assert.equal(normalizePhone('5533999478774'), '5533999478774')
  })

  test('zeros à esquerda são removidos', () => {
    assert.equal(normalizePhone('033999478774'), '5533999478774')
  })

  test('nome perde acento, pontuação e maiúsculas', () => {
    assert.equal(normalizeName('João'), 'joao')
    assert.equal(normalizeName("O'Brien"), 'obrien')
    assert.equal(normalizeName('São Paulo'), 'saopaulo')
  })

  test('CEP fica só com números', () => {
    assert.equal(normalizeZip('35020-720'), '35020720')
  })
})

describe('buildUserData', () => {
  const usuario = {
    email: ' Cliente@Gmail.com ',
    phone: '(33) 99947-8774',
    firstName: 'João',
    lastName: 'Silva',
    city: 'Governador Valadares',
    state: 'MG',
    zip: '35020-720',
    externalId: 'cliente-123',
    fbp: 'fb.1.1700000000.987654321',
    fbc: 'fb.1.1700000000.AbC123',
    clientIpAddress: '200.1.2.3',
    clientUserAgent: 'Mozilla/5.0',
  }

  test('aplica hash nos dados pessoais', () => {
    const data = buildUserData(usuario)
    assert.deepEqual(data.em, [sha256('cliente@gmail.com')])
    assert.deepEqual(data.ph, [sha256('5533999478774')])
    assert.deepEqual(data.fn, [sha256('joao')])
    assert.deepEqual(data.zp, [sha256('35020720')])
  })

  test('não aplica hash nos identificadores de clique', () => {
    // Mandar fbp ou fbc com hash faz a Meta descartar o vínculo em silêncio.
    const data = buildUserData(usuario)
    assert.equal(data.fbp, 'fb.1.1700000000.987654321')
    assert.equal(data.fbc, 'fb.1.1700000000.AbC123')
    assert.equal(data.client_ip_address, '200.1.2.3')
  })

  test('preenche o país quando há endereço', () => {
    const data = buildUserData({ zip: '35020-720' })
    assert.deepEqual(data.country, [sha256('br')])
  })

  test('campos vazios não entram no envio', () => {
    const data = buildUserData({ email: '', phone: null, firstName: undefined })
    assert.equal('em' in data, false)
    assert.equal('ph' in data, false)
    assert.equal('fn' in data, false)
  })

  test('ctwa_clid vai em texto puro, junto da conta do WhatsApp', () => {
    const data = buildUserData({ ctwaClid: 'ABC.123', whatsappBusinessAccountId: '999' })
    assert.equal(data.ctwa_clid, 'ABC.123')
    assert.equal(data.whatsapp_business_account_id, '999')
  })
})

describe('buildFbc', () => {
  test('monta o cookie a partir do fbclid da URL', () => {
    assert.equal(buildFbc('IwAR0abc', 1_700_000_000_000), 'fb.1.1700000000000.IwAR0abc')
  })
})

describe('escolha do caminho de atribuição', () => {
  test('venda no site vai como site', () => {
    const decisao = chooseActionSource({ channel: 'site', user: {}, eventTime: AGORA })
    assert.equal(decisao.actionSource, 'website')
  })

  test('venda do WhatsApp com clique de anúncio recente vai pelo caminho do anúncio', () => {
    const decisao = chooseActionSource({
      channel: 'whatsapp',
      user: { ctwaClid: 'ABC', whatsappBusinessAccountId: '999' },
      ctwaClickedAt: AGORA - 2 * DIA,
      eventTime: AGORA,
    })
    assert.equal(decisao.actionSource, 'business_messaging')
    assert.equal(decisao.messagingChannel, 'whatsapp')
  })

  test('clique de anúncio com mais de 7 dias cai para conversa', () => {
    // Casamento costuma demorar semanas entre o primeiro contato e o fechamento.
    const decisao = chooseActionSource({
      channel: 'whatsapp',
      user: { ctwaClid: 'ABC', whatsappBusinessAccountId: '999' },
      ctwaClickedAt: AGORA - 20 * DIA,
      eventTime: AGORA,
    })
    assert.equal(decisao.actionSource, 'chat')
    assert.match(decisao.reason, /7 dias/)
  })

  test('sem anúncio, mas com cookie do site, usa o caminho do site', () => {
    const decisao = chooseActionSource({
      channel: 'whatsapp',
      user: { fbc: 'fb.1.170.AbC' },
      eventTime: AGORA,
    })
    assert.equal(decisao.actionSource, 'website')
  })

  test('sem nada rastreado, vai como conversa', () => {
    const decisao = chooseActionSource({
      channel: 'whatsapp',
      user: { email: 'a@b.com' },
      eventTime: AGORA,
    })
    assert.equal(decisao.actionSource, 'chat')
  })
})

describe('buildEvent', () => {
  const compraNoSite = {
    eventName: 'Purchase' as const,
    eventId: '4954',
    eventTime: AGORA,
    channel: 'site' as const,
    user: { email: 'cliente@gmail.com', phone: '33999478774', fbp: 'fb.1.170.1' },
    eventSourceUrl: 'https://luminiaromas.com.br/finalizacaodecompra/',
    valueCents: 228_000,
    orderId: '4954',
    contents: [{ id: 'BOM-LAV', quantity: 1, itemPrice: 228_000 }],
  }

  test('monta a compra do site com valor e itens', () => {
    const resultado = buildEvent(compraNoSite, AGORA)
    assert.equal(resultado.ok, true)
    if (!resultado.ok) return

    assert.equal(resultado.event.event_name, 'Purchase')
    assert.equal(resultado.event.action_source, 'website')
    assert.equal(resultado.event.event_id, '4954')
    assert.equal(resultado.event.custom_data?.value, 2280)
    assert.equal(resultado.event.custom_data?.currency, 'BRL')
    assert.deepEqual(resultado.event.custom_data?.content_ids, ['BOM-LAV'])
  })

  test('o número do pedido é o mesmo em todos os canais, para não contar duas vezes', () => {
    // O Pixel do navegador manda o mesmo event_id; a Meta descarta a repetida.
    const resultado = buildEvent(compraNoSite, AGORA)
    assert.equal(resultado.ok && resultado.event.event_id, '4954')
  })

  test('venda do WhatsApp com anúncio vira business_messaging', () => {
    const resultado = buildEvent(
      {
        ...compraNoSite,
        channel: 'whatsapp',
        user: {
          phone: '33999478774',
          ctwaClid: 'ABC123',
          whatsappBusinessAccountId: '999',
        },
        ctwaClickedAt: AGORA - DIA,
      },
      AGORA,
    )

    assert.equal(resultado.ok, true)
    if (!resultado.ok) return
    assert.equal(resultado.event.action_source, 'business_messaging')
    assert.equal(resultado.event.messaging_channel, 'whatsapp')
    assert.equal(resultado.event.user_data.ctwa_clid, 'ABC123')
  })

  test('recusa venda lançada com mais de 7 dias de atraso', () => {
    const resultado = buildEvent({ ...compraNoSite, eventTime: AGORA - 10 * DIA }, AGORA)
    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.equal(resultado.code, 'EVENTO_ANTIGO')
    assert.match(resultado.message, /7 dias/)
  })

  test('recusa compra sem valor', () => {
    const resultado = buildEvent({ ...compraNoSite, valueCents: 0 }, AGORA)
    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.equal(resultado.code, 'SEM_VALOR')
  })

  test('recusa quando não há como identificar o cliente', () => {
    const resultado = buildEvent({ ...compraNoSite, channel: 'whatsapp', user: {} }, AGORA)
    assert.equal(resultado.ok, false)
    if (resultado.ok) return
    assert.equal(resultado.code, 'SEM_IDENTIFICADOR')
    assert.match(resultado.message, /telefone/)
  })

  test('evento de site sem valor é aceito, ao contrário da compra', () => {
    const resultado = buildEvent(
      { ...compraNoSite, eventName: 'ViewContent', valueCents: null, contents: undefined },
      AGORA,
    )
    assert.equal(resultado.ok, true)
  })

  test('respeita o pedido do cliente de não compartilhar dados', () => {
    const resultado = buildEvent({ ...compraNoSite, optOut: true }, AGORA)
    assert.equal(resultado.ok && resultado.event.opt_out, true)
  })
})

describe('buildEventsPayload', () => {
  test('inclui o código de teste só quando informado', () => {
    const evento = buildEvent(
      {
        eventName: 'Contact',
        eventId: 'lead-1',
        eventTime: AGORA,
        channel: 'site',
        user: { email: 'a@b.com' },
        eventSourceUrl: 'https://luminiaromas.com.br/',
      },
      AGORA,
    )
    assert.equal(evento.ok, true)
    if (!evento.ok) return

    assert.equal('test_event_code' in buildEventsPayload([evento.event]), false)
    assert.equal(buildEventsPayload([evento.event], { testEventCode: 'TEST123' }).test_event_code, 'TEST123')
  })

  test('corta o lote no limite de 1.000 eventos', () => {
    const evento = buildEvent(
      {
        eventName: 'Contact',
        eventId: 'x',
        eventTime: AGORA,
        channel: 'site',
        user: { email: 'a@b.com' },
      },
      AGORA,
    )
    if (!evento.ok) return assert.fail('evento deveria ser válido')

    const muitos = Array.from({ length: 1500 }, () => evento.event)
    assert.equal(buildEventsPayload(muitos).data.length, 1000)
  })
})
