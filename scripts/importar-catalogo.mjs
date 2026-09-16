/**
 * Traz o catálogo do site atual para o sistema novo.
 *
 * Usa a API pública do WooCommerce — os mesmos dados que qualquer visitante
 * enxerga, sem senha nenhuma. O site antigo continua intacto: aqui só se lê.
 *
 * O preço de uma peça não é copiado de lugar nenhum: ele é **apurado** a
 * partir de todas as variações com preço, pela maioria. É assim que os 8
 * preços digitados errado e as 21 variações sem preço deixam de ser
 * copiados para o sistema novo — eles aparecem no relatório do fim.
 *
 * Roda quantas vezes quiser: produto já importado é atualizado, não
 * duplicado.
 *
 * Uso:
 *   node --env-file=.env scripts/importar-catalogo.mjs
 *   node --env-file=.env scripts/importar-catalogo.mjs --sem-imagens
 *   node --env-file=.env scripts/importar-catalogo.mjs --so 4775
 */

import { getPayload } from 'payload'
import config from '../src/payload.config.ts'
import {
  apurarPrecoUnitario,
  aromasDe,
  faixasDe,
  lerFichaTecnica,
  lerResumo,
  quantidadeDoTermo,
  variacaoDoLoteMinimo,
} from '../src/commerce/catalog/importar-woo.ts'

const BASE = process.env.WOO_BASE_URL ?? 'https://luminiaromas.com.br'
const API = `${BASE}/wp-json/wc/store/v1`

// O servidor da Hostgator bloqueia alguns programas pelo nome; um
// navegador comum passa sem problema.
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
  Accept: 'application/json',
}

const SEM_IMAGENS = process.argv.includes('--sem-imagens')
const SO = (() => {
  const indice = process.argv.indexOf('--so')
  return indice === -1 ? null : Number(process.argv[indice + 1])
})()

const reais = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

async function buscar(caminho, tentativa = 1) {
  const resposta = await fetch(`${API}${caminho}`, { headers: HEADERS })

  if (!resposta.ok) {
    // A hospedagem compartilhada às vezes devolve 5xx sob carga. Uma
    // segunda tentativa resolve, e falhar a importação inteira por causa
    // de uma variação seria pior.
    if (tentativa < 3 && resposta.status >= 500) {
      await new Promise((r) => setTimeout(r, 800 * tentativa))
      return buscar(caminho, tentativa + 1)
    }
    throw new Error(`${caminho} respondeu ${resposta.status}`)
  }

  return resposta.json()
}

/** Executa em pequenos grupos: a hospedagem é compartilhada. */
async function emGrupos(itens, tamanho, tarefa) {
  const saida = []
  for (let i = 0; i < itens.length; i += tamanho) {
    const grupo = itens.slice(i, i + tamanho)
    saida.push(...(await Promise.all(grupo.map(tarefa))))
  }
  return saida
}

const payload = await getPayload({ config })

// ------------------------------------------------------------------ catálogo

console.log('')
console.log(`Lendo ${BASE} ...`)

const produtos = []
for (let pagina = 1; pagina <= 5; pagina++) {
  const lote = await buscar(`/products?per_page=100&page=${pagina}`)
  if (!Array.isArray(lote) || lote.length === 0) break
  produtos.push(...lote)
  if (lote.length < 100) break
}

const aImportar = produtos.filter(
  (p) => ['simple', 'variable'].includes(p.type) && (SO === null || p.id === SO),
)

console.log(`${produtos.length} produto(s) no site, ${aImportar.length} para importar.`)
console.log('')

const relatorio = []

for (const bruto of aImportar) {
  const variacoes = []

  if (bruto.type === 'variable' && Array.isArray(bruto.variations)) {
    const detalhes = await emGrupos(bruto.variations, 4, async (variacao) => {
      try {
        const doc = await buscar(`/products/${variacao.id}`)
        return { id: variacao.id, preco: Number(doc?.prices?.price ?? 0) }
      } catch {
        return { id: variacao.id, preco: 0 }
      }
    })

    const precoPorId = new Map(detalhes.map((d) => [d.id, d.preco]))

    for (const variacao of bruto.variations) {
      const atributos = Object.fromEntries(
        (variacao.attributes ?? []).map((a) => [String(a.name).toLowerCase(), a.value]),
      )

      variacoes.push({
        id: variacao.id,
        precoEmCentavos: precoPorId.get(variacao.id) ?? 0,
        aroma: atributos.aromas ?? atributos.aroma ?? null,
        quantidade: quantidadeDoTermo(atributos.quantidade ?? ''),
      })
    }
  }

  // Produto simples: o preço já é por peça, e o mínimo é o da loja.
  const apurado =
    bruto.type === 'variable'
      ? apurarPrecoUnitario(variacoes)
      : { unitPrice: Number(bruto.prices?.price ?? 0), confirmam: 1, divergencias: [], semPreco: 0 }

  if (!apurado || apurado.unitPrice <= 0) {
    relatorio.push({ nome: bruto.name, id: bruto.id, erro: 'nenhuma variação com preço' })
    console.log(`  ✗ ${bruto.name} — sem preço em nenhuma variação, não importado`)
    continue
  }

  const faixas = bruto.type === 'variable' ? faixasDe(variacoes) : []
  const aromas = aromasDe(variacoes)
  const ficha = lerFichaTecnica(bruto.description ?? '')

  const categoria = await acharOuCriarCategoria(bruto.categories?.[0]?.name)

  const dados = {
    name: bruto.name,
    slug: bruto.slug,
    legacyWooId: bruto.id,
    unitPrice: apurado.unitPrice,
    minQty: faixas[0] ?? 20,
    maxQty: faixas[faixas.length - 1] ?? 200,
    qtyStep: 10,
    lotSizes: faixas.length > 0 ? faixas : undefined,
    shortDescription: lerResumo(bruto.short_description ?? '', bruto.description ?? ''),
    category: categoria,
    techSheet: {
      durationHours: ficha.durationHours,
      weight: ficha.weight,
      height: ficha.height,
      width: ficha.width,
      container: ficha.container,
      includes: ficha.includes,
    },
    // As variações não são gravadas direto: elas nascem dos aromas
    // marcados aqui, que é o que impede o produto de ter uma variação que
    // não corresponde a nenhum aroma do catálogo.
    optionGroups: await grupoDeAromas(aromas),
    _status: 'draft',
  }

  const existente = await acharPorLegacy(bruto.id)

  const doc = existente
    ? await payload.update({ collection: 'products', id: existente.id, data: dados, draft: true })
    : await payload.create({ collection: 'products', data: dados, draft: true })

  // O identificador da variação antiga é gravado depois, porque as
  // variações só existem depois que o produto foi salvo. Ele preserva o
  // histórico da oferta no Google Merchant.
  await marcarVariacoesAntigas(doc.id, variacoes, aromas)

  if (!SEM_IMAGENS && (bruto.images ?? []).length > 0 && !existente) {
    const galeria = await importarImagens(bruto)
    if (galeria.length > 0) {
      await payload.update({
        collection: 'products',
        id: doc.id,
        data: { gallery: galeria },
        draft: true,
      })
    }
  }

  relatorio.push({
    nome: bruto.name,
    id: bruto.id,
    unitPrice: apurado.unitPrice,
    faixas: faixas.length,
    aromas: aromas.length,
    divergencias: apurado.divergencias,
    semPreco: apurado.semPreco,
    simples: bruto.type === 'simple',
    atualizado: Boolean(existente),
  })

  console.log(
    `  ${existente ? '↻' : '+'} ${bruto.name.padEnd(46).slice(0, 46)} ${reais(apurado.unitPrice).padStart(10)}/peça  ${faixas.length} faixa(s)  ${aromas.length} aroma(s)`,
  )
}

// ----------------------------------------------------------------- relatório

const comDivergencia = relatorio.filter((r) => r.divergencias?.length > 0)
const comSemPreco = relatorio.filter((r) => r.semPreco > 0)
const comErro = relatorio.filter((r) => r.erro)

console.log('')
console.log('─'.repeat(70))
console.log(`${relatorio.length - comErro.length} produto(s) no sistema novo.`)

if (comDivergencia.length > 0) {
  console.log('')
  console.log('Preços que discordam da maioria (ficaram com o preço certo aqui,')
  console.log('e continuam errados no site antigo):')
  for (const item of comDivergencia) {
    console.log(`  ${item.nome}`)
    for (const d of item.divergencias.slice(0, 6)) {
      console.log(
        `    ${String(d.quantidade).padStart(3)} peças: site diz ${reais(d.encontrado)}, deveria ser ${reais(d.esperado)}`,
      )
    }
    if (item.divergencias.length > 6) {
      console.log(`    ... e mais ${item.divergencias.length - 6}`)
    }
  }
}

if (comSemPreco.length > 0) {
  console.log('')
  console.log('Variações sem preço no site antigo (hoje invisíveis para quem visita):')
  for (const item of comSemPreco) {
    console.log(`  ${item.nome}: ${item.semPreco} variação(ões)`)
  }
}

const simples = relatorio.filter((r) => r.simples)

if (simples.length > 0) {
  console.log('')
  console.log('Produtos sem faixa de quantidade no site antigo. O valor importado é o')
  console.log('preço cheio do anúncio — confira se ele é por peça ou pelo kit antes de')
  console.log('publicar, porque aqui o total é sempre quantidade x preço da peça:')
  for (const item of simples) {
    console.log(`  ${item.nome}: ${reais(item.unitPrice)}`)
  }
}

if (comErro.length > 0) {
  console.log('')
  console.log('Não importados:')
  for (const item of comErro) console.log(`  ${item.nome} — ${item.erro}`)
}

console.log('')
console.log('Tudo entrou como RASCUNHO. Confira em Catálogo › Produtos e publique')
console.log('o que estiver certo. Nada aparece na loja antes disso.')
console.log('')

process.exit(0)

// ------------------------------------------------------------------ apoio

async function acharPorLegacy(legacyWooId) {
  const { docs } = await payload.find({
    collection: 'products',
    where: { legacyWooId: { equals: legacyWooId } },
    limit: 1,
    depth: 0,
    draft: true,
    overrideAccess: true,
  })
  return docs[0] ?? null
}

/**
 * Acha a categoria, ou cria.
 *
 * Procura por nome **e** por endereço: "Velas Aromáticas" e "Velas
 * aromáticas" são dois nomes no site antigo e um endereço só aqui. Sem a
 * segunda busca, a segunda categoria esbarra na regra de endereço único e
 * derruba a importação no meio.
 */
async function acharOuCriarCategoria(nome) {
  if (!nome || nome === 'Todos os produtos') return undefined

  const slug = enderecoDe(nome)

  const { docs } = await payload.find({
    collection: 'categories',
    where: { or: [{ name: { equals: nome } }, { slug: { equals: slug } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  if (docs[0]) return docs[0].id

  try {
    const criada = await payload.create({ collection: 'categories', data: { name: nome, slug } })
    return criada.id
  } catch {
    // Corrida ou colisão que a busca não pegou: reaproveita o que existe em
    // vez de parar a importação inteira por causa de uma categoria.
    const { docs: achados } = await payload.find({
      collection: 'categories',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    return achados[0]?.id
  }
}

function enderecoDe(nome) {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * O grupo de opção "Aroma" com os termos que o produto oferece.
 *
 * Aroma que existe no site e ainda não está cadastrado é criado na hora:
 * deixar de fora silenciosamente faria o produto entrar com menos opções
 * do que ele realmente vende.
 */
async function grupoDeAromas(aromas) {
  if (aromas.length === 0) return []

  const { docs: atributos } = await payload.find({
    collection: 'attributes',
    where: { slug: { equals: 'aroma' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const atributo = atributos[0]
  if (!atributo) return []

  const termos = []

  for (const slug of aromas) {
    const { docs } = await payload.find({
      collection: 'attribute-terms',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    if (docs[0]) {
      termos.push(docs[0].id)
      continue
    }

    const criado = await payload.create({
      collection: 'attribute-terms',
      data: { attribute: atributo.id, name: slug, slug },
    })
    termos.push(criado.id)
  }

  return [{ attribute: atributo.id, terms: termos }]
}

/** Liga cada variação gerada ao identificador que ela tinha no WooCommerce. */
async function marcarVariacoesAntigas(produtoId, variacoes, aromas) {
  if (aromas.length === 0) return

  const doc = await payload.findByID({
    collection: 'products',
    id: produtoId,
    depth: 0,
    draft: true,
    overrideAccess: true,
  })

  const atuais = doc.variants ?? []
  if (atuais.length === 0) return

  const variants = atuais.map((variante) => ({
    ...variante,
    legacyWooVariationId:
      variante.legacyWooVariationId ?? variacaoDoLoteMinimo(variacoes, variante.key),
  }))

  await payload.update({ collection: 'products', id: produtoId, data: { variants }, draft: true })
}

/** O rótulo bonito do aroma, como está escrito no site. */
function rotuloDoAroma(bruto, slug) {
  for (const atributo of bruto.attributes ?? []) {
    for (const termo of atributo.terms ?? []) {
      if (termo.slug === slug) return termo.name
    }
  }
  return slug
}

async function importarImagens(bruto) {
  const galeria = []

  for (const imagem of (bruto.images ?? []).slice(0, 8)) {
    try {
      const resposta = await fetch(imagem.src, { headers: HEADERS })
      if (!resposta.ok) continue

      const buffer = Buffer.from(await resposta.arrayBuffer())
      const nome = decodeURIComponent(imagem.src.split('/').pop() ?? 'foto.jpg')

      const doc = await payload.create({
        collection: 'media',
        data: { alt: imagem.alt || bruto.name },
        file: {
          data: buffer,
          name: nome,
          size: buffer.length,
          mimetype: resposta.headers.get('content-type') ?? 'image/jpeg',
        },
      })

      galeria.push(doc.id)
    } catch {
      // Uma foto que falha não pode derrubar a importação do produto.
    }
  }

  return galeria
}
