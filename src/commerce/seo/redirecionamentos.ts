/**
 * O que fazer com as URLs do site antigo.
 *
 * O WordPress deixa um rastro grande: arquivos de atributo (`/aroma/`,
 * `/flor/`), os slugs em inglês que o WooCommerce cria por padrão, o
 * `?product=` de antes dos links bonitos e os caminhos do próprio
 * WordPress. Quem chega por um deles precisa cair no lugar certo, e o
 * Google precisa saber que o endereço mudou de vez.
 *
 * Regra que guia as decisões daqui: **só redireciona em definitivo o que
 * não vai existir de novo.** Um 301 fica no cache do Google por muito
 * tempo; mandar `/product-category/casamento/` para a página inicial hoje
 * estragaria a URL quando a página de categoria for construída. Então o
 * que ainda vai existir é deixado em paz — responde 404 por enquanto, que
 * é reversível, em vez de um 301 errado que não é.
 *
 * Função pura, sem Next e sem banco, para poder ser testada direto.
 */

export type Decisao =
  /** Deixa a requisição seguir para a aplicação. */
  | { tipo: 'segue' }
  /** Mudou de endereço para sempre. */
  | { tipo: 'permanente'; para: string }
  /** Nunca mais vai existir — o Google pode tirar do índice. */
  | { tipo: 'sumiu' }

const SEGUE: Decisao = { tipo: 'segue' }

/**
 * Os parâmetros que os anúncios ativos da Meta usam hoje.
 *
 * O link do anúncio chega como
 * `/product/vela.../?attribute_pa_aroma=lavanda&attribute_pa_quantidade=20`.
 * Esses anúncios estão rodando e não vão ser reescritos um por um, então a
 * tradução para `?aroma=&quantidade=` acontece aqui.
 */
const PARAMETROS_DO_WOO: Record<string, string> = {
  attribute_pa_aroma: 'aroma',
  attribute_pa_quantidade: 'quantidade',
  attribute_pa_flor: 'flor',
}

/**
 * Páginas que trocaram de endereço.
 *
 * As chaves são os slugs em inglês que o WooCommerce instala por padrão e
 * que podem ter sido indexados antes de o site ganhar os nomes em
 * português.
 */
const MUDOU_DE_ENDERECO: Record<string, string> = {
  '/cart': '/meucarrinho/',
  '/checkout': '/finalizacaodecompra/',
  '/my-account': '/minhaconta/',
  '/minha-conta': '/minhaconta/',
  '/shop': '/',
  '/loja': '/',
  '/rastreio-de-pedido': '/minhaconta/',
  '/rastreamento-de-pedido': '/minhaconta/',
  '/contact': '/contato/',
  '/privacy-policy': '/politica-de-privacidade/',
  '/refund_returns': '/politica-de-reembolso/',
  '/termos': '/termos-de-uso/',
  '/termos-e-condicoes': '/termos-de-uso/',
}

/**
 * Prefixos de arquivo de atributo que a loja nova não tem equivalente.
 *
 * No site antigo, cada aroma e cada modelo de flor virava uma página de
 * listagem própria. Na loja nova o aroma é uma escolha dentro do produto,
 * não um endereço. Essas páginas não voltam, então o 301 para a vitrine é
 * definitivo e seguro.
 */
const ARQUIVOS_DE_ATRIBUTO = ['/aroma/', '/flor/']

/**
 * Caminhos que só existiam porque o site era WordPress.
 *
 * Respondem 410 (não existe mais) em vez de 404: o 410 faz o Google tirar
 * do índice mais rápido, e corta o barulho dos robôs que varrem
 * `/wp-login.php` à procura de senha.
 */
const SO_EXISTIA_NO_WORDPRESS = [
  '/wp-login.php',
  '/xmlrpc.php',
  '/wp-config.php',
  '/comments/feed',
  '/wp-sitemap.xml',
  '/sitemap_index.xml',
]

// `/wp-content/` fica fora desta lista de propósito: são as imagens
// antigas, que o Google Imagens tem indexadas. Quando a importação
// terminar de renomear as fotos no R2, elas ganham um 301 de verdade para
// o novo endereço. Até lá respondem 404, que é reversível — o 410 diria ao
// Google para esquecer a foto para sempre.
const PREFIXOS_DO_WORDPRESS = ['/wp-admin', '/wp-json', '/author']

export function decidirRota(caminho: string, busca: URLSearchParams): Decisao {
  const limpo = semBarraFinal(caminho.toLowerCase())

  // ---------------------------------------------------- restos do WordPress
  if (SO_EXISTIA_NO_WORDPRESS.includes(limpo)) return { tipo: 'sumiu' }
  if (PREFIXOS_DO_WORDPRESS.some((raiz) => dentroDe(limpo, raiz))) return { tipo: 'sumiu' }
  // O RSS do blog. Precisa ser o caminho exato: `/feed/google.xml` e
  // `/feed/meta.xml` são os feeds de catálogo da loja nova.
  if (limpo === '/feed') return { tipo: 'sumiu' }

  // ------------------------------------------- links antigos sem URL bonita
  // `luminiaromas.com.br/?product=vela-gota-de-cristal`
  const produtoNaQuery = busca.get('product')
  if ((limpo === '' || limpo === '/shop' || limpo === '/loja') && produtoNaQuery) {
    return { tipo: 'permanente', para: `/product/${produtoNaQuery}/` }
  }

  // ------------------------------------------------ arquivos de atributo
  for (const prefixo of ARQUIVOS_DE_ATRIBUTO) {
    if (dentroDe(limpo, semBarraFinal(prefixo))) return { tipo: 'permanente', para: '/' }
  }

  // ------------------------------------------------- páginas renomeadas
  const novoEndereco = MUDOU_DE_ENDERECO[limpo]
  if (novoEndereco) return { tipo: 'permanente', para: novoEndereco }

  // ------------------------------- parâmetros de variação vindos dos anúncios
  if (limpo.startsWith('/product/')) {
    const traduzida = traduzirParametros(busca)
    if (traduzida) return { tipo: 'permanente', para: `${comBarraFinal(caminho)}${traduzida}` }
  }

  // Tudo o mais segue. Em especial `/product-category/`, `/product-tag/` e
  // `/todososprodutos/`, que são páginas de listagem ainda por construir:
  // por enquanto respondem 404, e é melhor assim do que ensinar ao Google
  // um 301 que vai ter de ser desfeito.
  return SEGUE
}

/**
 * Reescreve a query do anúncio, preservando o que não é do WooCommerce.
 *
 * Devolve `null` quando não havia nada do Woo para traduzir — assim quem
 * já chega com `?aroma=` não entra em um ciclo de redirecionamento.
 */
export function traduzirParametros(busca: URLSearchParams): string | null {
  let achou = false
  const saida = new URLSearchParams()

  for (const [chave, valor] of busca) {
    const nova = PARAMETROS_DO_WOO[chave.toLowerCase()]
    if (nova) {
      achou = true
      if (valor) saida.set(nova, valor)
      continue
    }
    saida.append(chave, valor)
  }

  if (!achou) return null
  const texto = saida.toString()
  return texto ? `?${texto}` : ''
}

/**
 * O caminho é a própria pasta ou algo dentro dela.
 *
 * A comparação é exata ou seguida de barra, senão `/aromaterapia` cairia
 * na regra de `/aroma`.
 */
function dentroDe(caminho: string, raiz: string): boolean {
  return caminho === raiz || caminho.startsWith(`${raiz}/`)
}

function semBarraFinal(caminho: string): string {
  return caminho.length > 1 && caminho.endsWith('/') ? caminho.slice(0, -1) : caminho === '/' ? '' : caminho
}

function comBarraFinal(caminho: string): string {
  return caminho.endsWith('/') ? caminho : `${caminho}/`
}
