import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { decidirRota, traduzirParametros } from './redirecionamentos.ts'

function decidir(url: string) {
  const { pathname, searchParams } = new URL(url, 'https://luminiaromas.com.br')
  return decidirRota(pathname, searchParams)
}

describe('parâmetros de variação dos anúncios', () => {
  // Este é o caso que mexe com dinheiro: os anúncios da Meta que estão
  // rodando hoje mandam a pessoa para cá.
  it('traduz o link do anúncio para os parâmetros da loja nova', () => {
    const decisao = decidir(
      '/product/vela-gota-de-cristal/?attribute_pa_aroma=lavanda&attribute_pa_quantidade=20',
    )

    assert.deepEqual(decisao, {
      tipo: 'permanente',
      para: '/product/vela-gota-de-cristal/?aroma=lavanda&quantidade=20',
    })
  })

  it('preserva o que não é do WooCommerce, como o utm e o fbclid', () => {
    const decisao = decidir(
      '/product/vela/?utm_source=ig&attribute_pa_aroma=vanilla&fbclid=ABC123',
    )

    assert.equal(decisao.tipo, 'permanente')
    const { searchParams } = new URL(
      (decisao as { para: string }).para,
      'https://luminiaromas.com.br',
    )
    assert.equal(searchParams.get('utm_source'), 'ig')
    assert.equal(searchParams.get('fbclid'), 'ABC123')
    assert.equal(searchParams.get('aroma'), 'vanilla')
  })

  // Sem isto o redirecionamento se chamaria para sempre.
  it('não redireciona quem já chega com os parâmetros novos', () => {
    assert.deepEqual(decidir('/product/vela/?aroma=lavanda&quantidade=40'), { tipo: 'segue' })
  })

  it('não mexe na página do produto sem parâmetro', () => {
    assert.deepEqual(decidir('/product/vela-gota-de-cristal/'), { tipo: 'segue' })
  })

  it('devolve nulo quando não havia parâmetro do Woo para traduzir', () => {
    assert.equal(traduzirParametros(new URLSearchParams('aroma=lavanda')), null)
  })

  it('descarta o valor vazio em vez de criar ?aroma=', () => {
    assert.equal(traduzirParametros(new URLSearchParams('attribute_pa_aroma=')), '')
  })
})

describe('arquivos de atributo do WordPress', () => {
  it('manda aroma e flor para a vitrine, de vez', () => {
    assert.deepEqual(decidir('/aroma/lavanda/'), { tipo: 'permanente', para: '/' })
    assert.deepEqual(decidir('/flor/7/'), { tipo: 'permanente', para: '/' })
    assert.deepEqual(decidir('/aroma/'), { tipo: 'permanente', para: '/' })
  })

  it('não confunde /aromaterapia com /aroma', () => {
    assert.deepEqual(decidir('/aromaterapia/'), { tipo: 'segue' })
  })
})

describe('páginas que trocaram de nome', () => {
  it('leva os slugs em inglês do WooCommerce para os nomes em português', () => {
    assert.deepEqual(decidir('/cart/'), { tipo: 'permanente', para: '/meucarrinho/' })
    assert.deepEqual(decidir('/checkout/'), {
      tipo: 'permanente',
      para: '/finalizacaodecompra/',
    })
    assert.deepEqual(decidir('/my-account/'), { tipo: 'permanente', para: '/minhaconta/' })
  })

  it('leva o rastreio antigo para a conta do cliente', () => {
    assert.deepEqual(decidir('/rastreio-de-pedido/'), { tipo: 'permanente', para: '/minhaconta/' })
  })

  it('aceita o endereço com e sem a barra no fim', () => {
    assert.deepEqual(decidir('/cart'), { tipo: 'permanente', para: '/meucarrinho/' })
  })
})

describe('links de antes das URLs bonitas', () => {
  it('traduz ?product=slug', () => {
    assert.deepEqual(decidir('/?product=vela-gota-de-cristal'), {
      tipo: 'permanente',
      para: '/product/vela-gota-de-cristal/',
    })
  })
})

describe('restos do WordPress', () => {
  it('responde que sumiu, para o Google tirar do índice', () => {
    for (const caminho of [
      '/wp-login.php',
      '/xmlrpc.php',
      '/wp-admin/',
      '/wp-json/wc/v3/products/',
      '/author/admin/',
      '/comments/feed/',
      '/wp-sitemap.xml',
      '/feed/',
    ]) {
      assert.deepEqual(decidir(caminho), { tipo: 'sumiu' }, caminho)
    }
  })

  // O `/feed/` do WordPress morreu, mas `/feed/google.xml` é o feed de
  // catálogo da loja nova. Confundir os dois derruba o Merchant Center.
  it('não confunde o RSS morto com os feeds de catálogo', () => {
    assert.deepEqual(decidir('/feed/google.xml'), { tipo: 'segue' })
    assert.deepEqual(decidir('/feed/meta.xml'), { tipo: 'segue' })
  })
})

describe('o que ainda vai existir fica em paz', () => {
  // Um 301 fica no cache do Google por muito tempo. Mandar estas URLs
  // para a vitrine agora estragaria o endereço quando a página de
  // listagem for construída.
  it('não redireciona categoria, tag e lista de produtos', () => {
    assert.deepEqual(decidir('/product-category/casamento/'), { tipo: 'segue' })
    assert.deepEqual(decidir('/product-category/casamento/page/2/'), { tipo: 'segue' })
    assert.deepEqual(decidir('/product-tag/vela-de-luxo/'), { tipo: 'segue' })
    assert.deepEqual(decidir('/todososprodutos/'), { tipo: 'segue' })
  })

  it('não mexe nas páginas da loja nova', () => {
    for (const caminho of [
      '/',
      '/meucarrinho/',
      '/finalizacaodecompra/',
      '/minhaconta/',
      '/contato/',
      '/termos-de-uso/',
      '/politica-de-privacidade/',
      '/politica-de-reembolso/',
      '/para-seu-evento/casamento/',
      '/admin/',
      '/api/graphql',
    ]) {
      assert.deepEqual(decidir(caminho), { tipo: 'segue' }, caminho)
    }
  })
})
