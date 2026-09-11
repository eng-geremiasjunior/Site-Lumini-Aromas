/**
 * Importa aromas, categorias e ocasiões do site atual.
 *
 * Usa a API pública do WooCommerce (Store API), que não exige senha:
 * são os mesmos dados que qualquer visitante enxerga na loja.
 *
 * Uso: node --env-file=.env scripts/importar-taxonomias.mjs
 */

import { getPayload } from 'payload'
import config from '../src/payload.config.ts'

const BASE = process.env.WOO_BASE_URL ?? 'https://luminiaromas.com.br'

// O servidor da Hostgator bloqueia alguns programas pelo nome; um
// navegador comum passa sem problema.
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
  Accept: 'application/json',
}

function slugify(input) {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function buscar(caminho) {
  const resposta = await fetch(`${BASE}${caminho}`, { headers: HEADERS })
  if (!resposta.ok) throw new Error(`${caminho} respondeu ${resposta.status}`)
  return resposta.json()
}

/** Cria se não existir; nunca duplica. Pode rodar quantas vezes quiser. */
async function garantir(payload, collection, where, data, rotulo) {
  const existente = await payload.find({ collection, where, limit: 1, depth: 0 })
  if (existente.docs.length > 0) {
    console.log(`  = ${rotulo} (já existia)`)
    return existente.docs[0]
  }
  const criado = await payload.create({ collection, data })
  console.log(`  + ${rotulo}`)
  return criado
}

const payload = await getPayload({ config })

console.log('Lendo o site atual...')
const atributos = await buscar('/wp-json/wc/store/v1/products/attributes')

// --------------------------------------------------------------- aromas
const aromaWoo = atributos.find((a) => a.taxonomy === 'pa_aroma')
if (!aromaWoo) throw new Error('Atributo de aroma não encontrado no site atual')

const termosAroma = await buscar(`/wp-json/wc/store/v1/products/attributes/${aromaWoo.id}/terms`)

console.log(`\nAromas (${termosAroma.length} no site atual):`)
const aroma = await garantir(
  payload,
  'attributes',
  { slug: { equals: 'aroma' } },
  {
    name: 'Aroma',
    slug: 'aroma',
    displayType: 'button',
    description: 'Fragrância da vela. O cliente escolhe uma por lote.',
  },
  'opção "Aroma"',
)

for (const [indice, termo] of termosAroma.entries()) {
  await garantir(
    payload,
    'attribute-terms',
    { and: [{ attribute: { equals: aroma.id } }, { slug: { equals: slugify(termo.name) } }] },
    {
      attribute: aroma.id,
      name: termo.name,
      slug: slugify(termo.name),
      sortOrder: indice,
      legacyWooTermId: termo.id,
    },
    termo.name,
  )
}

// ------------------------------------------------------------ categorias
/**
 * As 12 categorias do site atual misturam tipo de produto com ocasião,
 * e duas estão vazias. Aqui elas viram duas listas separadas: o tipo do
 * produto e o evento a que ele atende.
 */
const CATEGORIAS = [
  { name: 'Velas em vidro', description: 'Bombonieres, potiches e velas em recipiente de vidro.' },
  { name: 'Velas em madeira', description: 'Mini velas na bolacha e no tronco de madeira artesanal.' },
  { name: 'Difusores e aromatizadores', description: 'Difusores de varetas e aromatizadores de ambiente.' },
  { name: 'Potes de mel', description: 'Potes de mel com acabamento artesanal.' },
  { name: 'Sal de parrilla', description: 'Sal temperado para churrasco, em embalagem personalizada.' },
]

console.log('\nCategorias:')
for (const [indice, categoria] of CATEGORIAS.entries()) {
  await garantir(
    payload,
    'categories',
    { slug: { equals: slugify(categoria.name) } },
    { ...categoria, slug: slugify(categoria.name), sortOrder: indice },
    categoria.name,
  )
}

// -------------------------------------------------------------- ocasiões
const OCASIOES = [
  {
    name: 'Casamento',
    headline: 'Lembrancinhas de casamento feitas à mão',
    suggestedLots: '60 a 200 peças',
  },
  { name: 'Bodas', headline: 'Lembrancinhas para bodas', suggestedLots: '40 a 150 peças' },
  { name: '15 anos', headline: 'Lembrancinhas para festa de 15 anos', suggestedLots: '60 a 200 peças' },
  { name: 'Batizado', headline: 'Lembrancinhas de batizado', suggestedLots: '40 a 120 peças' },
  { name: 'Maternidade', headline: 'Lembrancinhas de maternidade', suggestedLots: '30 a 100 peças' },
  { name: 'Aniversário', headline: 'Lembrancinhas de aniversário', suggestedLots: '30 a 150 peças' },
  {
    name: 'Corporativo',
    headline: 'Brindes corporativos personalizados com sua marca',
    suggestedLots: 'a partir de 50 peças',
  },
]

console.log('\nOcasiões:')
for (const [indice, ocasiao] of OCASIOES.entries()) {
  await garantir(
    payload,
    'occasions',
    { slug: { equals: slugify(ocasiao.name) } },
    { ...ocasiao, slug: slugify(ocasiao.name), sortOrder: indice },
    ocasiao.name,
  )
}

// ----------------------------------------------------------- acabamentos
/**
 * Preços em centavos, como estimativa inicial. O dono ajusta no painel;
 * o que importa aqui é a estrutura já existir.
 */
const ACABAMENTOS = [
  { name: 'Caixa de acetato', pricePerUnit: 0, description: 'Caixa transparente com fita de cetim.' },
  { name: 'Laço de cetim', pricePerUnit: 0, description: 'Laço de cetim na cor escolhida.' },
  { name: 'Flores secas', pricePerUnit: 0, description: 'Arranjo de flores secas naturais.' },
  { name: 'Tag personalizada', pricePerUnit: 0, description: 'Tag impressa com nome e data.' },
]

console.log('\nAcabamentos (preço a definir no painel):')
for (const acabamento of ACABAMENTOS) {
  await garantir(
    payload,
    'addons',
    { slug: { equals: slugify(acabamento.name) } },
    { ...acabamento, slug: slugify(acabamento.name), active: true },
    acabamento.name,
  )
}

console.log('\nPronto.')
process.exit(0)
