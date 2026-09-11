import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildWhatsAppLink,
  buildWhatsAppMessage,
  captureAttribution,
  describeAttribution,
  generateLeadRef,
  parseGaClientId,
  parseLeadRef,
} from './whatsapp-lead.ts'

describe('código do lead', () => {
  test('tem o formato LUM-XXXX', () => {
    const ref = generateLeadRef(() => 0)
    assert.match(ref, /^LUM-[A-Z0-9]{4}$/)
  })

  test('não usa caracteres que se confundem ao ler ou digitar', () => {
    // O código é ditado por telefone e digitado à mão: 0/O e 1/I saem.
    let todos = ''
    for (let i = 0; i < 200; i++) todos += generateLeadRef(Math.random)
    assert.doesNotMatch(todos.replace(/LUM-/g, ''), /[AEIOU01]/)
  })

  test('acha o código dentro da mensagem colada do WhatsApp', () => {
    const mensagem =
      'Olá! Tenho interesse em Lembrancinha bomboniere (Lavanda, 60 peças).\nRef LUM-7K3F'
    assert.equal(parseLeadRef(mensagem), 'LUM-7K3F')
  })

  test('acha o código mesmo em minúsculas', () => {
    assert.equal(parseLeadRef('ref lum-7k3f'), 'LUM-7K3F')
  })

  test('devolve nulo quando não há código', () => {
    assert.equal(parseLeadRef('Oi, quero um orçamento'), null)
  })
})

describe('mensagem do botão', () => {
  test('já chega com produto, aroma, quantidade e preço', () => {
    const mensagem = buildWhatsAppMessage({
      phone: '5533999478774',
      productName: 'Lembrancinha bomboniere com vela aromática',
      variantLabel: 'Lavanda',
      qty: 60,
      lotPriceCents: 228_000,
      pageUrl: 'https://luminiaromas.com.br/product/lembrancinha-bomboniere/',
      ref: 'LUM-7K3F',
    })

    assert.match(mensagem, /Lembrancinha bomboniere com vela aromática/)
    assert.match(mensagem, /Lavanda, 60 peças/)
    assert.match(mensagem, /R\$\s?2\.280,00/)
    assert.match(mensagem, /Ref LUM-7K3F/)
  })

  test('funciona sem produto, para o botão do rodapé', () => {
    const mensagem = buildWhatsAppMessage({ phone: '5533999478774', ref: 'LUM-ABCD' })
    assert.match(mensagem, /orçamento de lembrancinhas/)
    assert.match(mensagem, /Ref LUM-ABCD/)
  })

  test('o link é o formato oficial do WhatsApp, com o texto codificado', () => {
    const link = buildWhatsAppLink({
      phone: '5533999478774',
      productName: 'Vela de coração',
      ref: 'LUM-7K3F',
    })

    assert.match(link, /^https:\/\/wa\.me\/5533999478774\?text=/)
    const texto = decodeURIComponent(link.split('?text=')[1])
    assert.match(texto, /Vela de coração/)
    assert.match(texto, /Ref LUM-7K3F/)
  })

  test('o código sobrevive à ida e volta pela URL', () => {
    // Se o código se perder na codificação, a venda perde a origem.
    const link = buildWhatsAppLink({ phone: '5533999478774', ref: 'LUM-9XZ2' })
    const texto = decodeURIComponent(link.split('?text=')[1])
    assert.equal(parseLeadRef(texto), 'LUM-9XZ2')
  })
})

describe('captura de origem', () => {
  test('lê os parâmetros de campanha da URL', () => {
    const origem = captureAttribution({
      searchParams: new URLSearchParams(
        'utm_source=instagram&utm_medium=paid&utm_campaign=casamento-set&fbclid=IwAR0abc',
      ),
      landingPage: 'https://luminiaromas.com.br/casamento',
    })

    assert.equal(origem.utmSource, 'instagram')
    assert.equal(origem.utmCampaign, 'casamento-set')
    assert.equal(origem.fbclid, 'IwAR0abc')
  })

  test('lê os cookies do Pixel e do Google Analytics', () => {
    const origem = captureAttribution({
      searchParams: {},
      cookies: {
        _fbp: 'fb.1.1700000000.987',
        _fbc: 'fb.1.1700000000.IwAR0abc',
        _ga: 'GA1.1.1234567890.1700000000',
      },
    })

    assert.equal(origem.fbp, 'fb.1.1700000000.987')
    assert.equal(origem.fbc, 'fb.1.1700000000.IwAR0abc')
    assert.equal(origem.gaClientId, '1234567890.1700000000')
  })

  test('identifica o tipo de aparelho', () => {
    const celular = captureAttribution({
      searchParams: {},
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit',
    })
    assert.equal(celular.deviceType, 'mobile')

    const computador = captureAttribution({
      searchParams: {},
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    })
    assert.equal(computador.deviceType, 'desktop')
  })

  test('cookie do Analytics malformado não quebra', () => {
    assert.equal(parseGaClientId('GA1.1'), null)
    assert.equal(parseGaClientId(undefined), null)
  })
})

describe('resumo da origem para o painel', () => {
  test('mostra a campanha quando existe', () => {
    assert.equal(
      describeAttribution({ utmSource: 'instagram', utmCampaign: 'casamento-set' }),
      'instagram (casamento-set)',
    )
  })

  test('reconhece anúncio da Meta pelo identificador do clique', () => {
    assert.equal(describeAttribution({ fbclid: 'IwAR0abc' }), 'Anúncio da Meta')
  })

  test('reconhece Google Ads', () => {
    assert.equal(describeAttribution({ gclid: 'Cj0KCQ' }), 'Google Ads')
  })

  test('reconhece o Instagram orgânico pelo site de origem', () => {
    // É o caso mais comum hoje: o link da bio, sem campanha marcada.
    assert.equal(describeAttribution({ referrer: 'https://l.instagram.com/' }), 'Instagram')
  })

  test('sem nenhuma pista, diz acesso direto', () => {
    assert.equal(describeAttribution({}), 'Acesso direto')
  })
})
