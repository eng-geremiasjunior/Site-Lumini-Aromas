import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  consentimentoAtualizado,
  consentimentoInicial,
  dadosDoComprador,
  destinosConfigurados,
  emReais,
  eventoParaAds,
  eventoParaGa4,
  gravarEscolha,
  lerEscolha,
  VERSAO_DO_AVISO,
} from './google-tag.ts'
import { ofertaId } from '../feeds/oferta-id.ts'

describe('destinos configurados', () => {
  it('aceita os identificadores no formato certo', () => {
    const destinos = destinosConfigurados({
      ga4: 'G-ZZVS0YHWXH',
      ads: 'AW-123456789',
      conversaoDeCompra: 'AbCdEfGhIj',
    })

    assert.equal(destinos.ga4, 'G-ZZVS0YHWXH')
    assert.equal(destinos.ads, 'AW-123456789')
    assert.equal(destinos.conversaoDeCompra, 'AW-123456789/AbCdEfGhIj')
    assert.deepEqual(destinos.avisos, [])
  })

  it('recusa um contêiner do Tag Manager no lugar do Analytics', () => {
    // É o erro mais provável de acontecer: é o identificador que está
    // colado no site antigo, e aceitá-lo carregaria de volta todas as
    // tags sobrepostas que geraram a bagunça.
    const destinos = destinosConfigurados({ ga4: 'GTM-M4XTGVP' })

    assert.equal(destinos.ga4, null)
    assert.match(destinos.avisos[0] ?? '', /Tag Manager/)
  })

  it('avisa quando o Ads está ligado sem o rótulo da conversão', () => {
    const destinos = destinosConfigurados({ ads: 'AW-123456789' })

    assert.equal(destinos.ads, 'AW-123456789')
    assert.equal(destinos.conversaoDeCompra, null)
    assert.match(destinos.avisos.join(' '), /remarketing funciona/)
  })

  it('não inventa destino quando nada está configurado', () => {
    const destinos = destinosConfigurados({})

    assert.equal(destinos.ga4, null)
    assert.equal(destinos.ads, null)
    assert.deepEqual(destinos.avisos, [])
  })
})

describe('consentimento', () => {
  it('começa tudo negado', () => {
    const inicial = consentimentoInicial()

    assert.equal(inicial.ad_storage, 'denied')
    assert.equal(inicial.ad_user_data, 'denied')
    assert.equal(inicial.ad_personalization, 'denied')
    assert.equal(inicial.analytics_storage, 'denied')
  })

  it('libera publicidade e medição separadamente', () => {
    const so_medicao = consentimentoAtualizado({ analise: true, publicidade: false })

    assert.equal(so_medicao.analytics_storage, 'granted')
    assert.equal(so_medicao.ad_storage, 'denied')
    assert.equal(so_medicao.ad_personalization, 'denied')
  })

  it('guarda e lê a escolha com a versão do aviso', () => {
    const cookie = gravarEscolha({ analise: true, publicidade: true }, new Date('2026-09-12T10:00:00Z'))
    const lida = lerEscolha(cookie)

    assert.equal(lida?.publicidade, true)
    assert.equal(lida?.versao, VERSAO_DO_AVISO)
    assert.equal(lida?.em, '2026-09-12T10:00:00.000Z')
  })

  it('trata escolha de uma versão antiga do aviso como escolha nenhuma', () => {
    // A pessoa aceitou outro texto. Perguntar de novo é o certo.
    const antigo = JSON.stringify({ analise: true, publicidade: true, versao: '2020-01-01' })

    assert.equal(lerEscolha(antigo), null)
  })

  it('não quebra com cookie corrompido', () => {
    assert.equal(lerEscolha('{lixo'), null)
    assert.equal(lerEscolha(''), null)
    assert.equal(lerEscolha(null), null)
  })
})

describe('eventos', () => {
  const lote = {
    id: 'VGC-LAV',
    nome: 'Vela gota de cristal',
    precoEmCentavos: 76000,
    quantidade: 1,
    variacao: 'Lavanda',
    categoria: 'Velas',
  }

  it('manda reais, não centavos', () => {
    const evento = eventoParaGa4('view_item', { itens: [lote] })

    assert.equal(evento.value, 760)
    assert.equal(evento.currency, 'BRL')
  })

  it('soma em inteiro e divide uma vez só', () => {
    // Três lotes de R$ 2.280,00: dividindo item a item e somando depois,
    // o total sai com resto de ponto flutuante.
    const evento = eventoParaGa4('begin_checkout', {
      itens: [{ ...lote, precoEmCentavos: 228000, quantidade: 3 }],
    })

    assert.equal(evento.value, 6840)
  })

  it('usa o total informado quando existe, e não a soma dos itens', () => {
    // Com cupom, o total do pedido é menor que a soma das linhas.
    const evento = eventoParaGa4('purchase', {
      itens: [lote],
      valorEmCentavos: 68400,
      idDoPedido: '1042',
      cupom: 'DEMO10',
    })

    assert.equal(evento.value, 684)
    assert.equal(evento.transaction_id, '1042')
    assert.equal(evento.coupon, 'DEMO10')
  })

  it('só põe transaction_id na compra', () => {
    const visualizacao = eventoParaGa4('view_item', { itens: [lote], idDoPedido: '1042' })

    assert.equal(visualizacao.transaction_id, undefined)
  })

  it('usa item_id no Analytics e id no Ads', () => {
    const ga4 = eventoParaGa4('view_item', { itens: [lote] })
    const ads = eventoParaAds('view_item', { itens: [lote] }, 'AW-123456789')

    const itemGa4 = (ga4.items as Array<Record<string, unknown>>)[0]
    const itemAds = (ads.items as Array<Record<string, unknown>>)[0]

    assert.equal(itemGa4?.item_id, 'VGC-LAV')
    assert.equal(itemGa4?.item_variant, 'Lavanda')
    assert.equal(itemAds?.id, 'VGC-LAV')
    assert.equal(itemAds?.google_business_vertical, 'retail')
    assert.equal(ads.send_to, 'AW-123456789')
  })

  it('manda para o Google o mesmo id que vai no feed', () => {
    // É a única coisa que faz o anúncio dinâmico mostrar a vela certa.
    // Se um dia os dois caminhos divergirem, este teste quebra antes de
    // o remarketing quebrar em silêncio.
    const id = ofertaId({ produtoId: '4775', loteMinimo: 20, sku: 'VGC-LAV' })
    const ads = eventoParaAds('view_item', { itens: [{ ...lote, id }] }, 'AW-1')

    assert.equal((ads.items as Array<Record<string, unknown>>)[0]?.id, 'VGC-LAV')
  })

  it('converte centavos sem sobra', () => {
    assert.equal(emReais(1), 0.01)
    assert.equal(emReais(228000), 2280)
    assert.equal(emReais(0), 0)
  })
})

describe('dados do comprador', () => {
  it('normaliza telefone para o formato internacional', () => {
    const dados = dadosDoComprador({ telefone: '(33) 99947-8774' })

    assert.equal(dados?.phone_number, '+5533999478774')
  })

  it('não duplica o código do país', () => {
    const dados = dadosDoComprador({ telefone: '+55 33 99947-8774' })

    assert.equal(dados?.phone_number, '+5533999478774')
  })

  it('separa primeiro e último nome', () => {
    const dados = dadosDoComprador({
      email: 'Maria@Exemplo.com.BR',
      nome: 'Maria Clara de Souza',
      cidade: 'Governador Valadares',
      uf: 'MG',
      cep: '35010-000',
    })

    assert.equal(dados?.email, 'maria@exemplo.com.br')
    const endereco = dados?.address as Record<string, string>
    assert.equal(endereco.first_name, 'maria')
    assert.equal(endereco.last_name, 'souza')
    assert.equal(endereco.postal_code, '35010000')
    assert.equal(endereco.country, 'BR')
  })

  it('devolve nada quando não há como identificar', () => {
    assert.equal(dadosDoComprador({ nome: 'Maria' }), null)
    assert.equal(dadosDoComprador({ telefone: '123' }), null)
  })
})

describe('identificador da oferta', () => {
  it('prefere o id antigo do WooCommerce quando o histórico vale a pena', () => {
    const id = ofertaId({
      produtoId: '4775',
      loteMinimo: 20,
      sku: 'VGC-LAV',
      legacyWooVariationId: 3896,
      preservarIdAntigo: true,
    })

    assert.equal(id, '3896')
  })

  it('ignora o id antigo quando a decisão foi não preservar', () => {
    const id = ofertaId({
      produtoId: '4775',
      loteMinimo: 20,
      sku: 'VGC-LAV',
      legacyWooVariationId: 3896,
      preservarIdAntigo: false,
    })

    assert.equal(id, 'VGC-LAV')
  })

  it('cai para produto e lote quando não há SKU', () => {
    assert.equal(ofertaId({ produtoId: '77', loteMinimo: 20 }), '77-20')
  })
})
