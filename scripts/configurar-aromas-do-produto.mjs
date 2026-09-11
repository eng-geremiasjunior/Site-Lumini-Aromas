/**
 * Liga a opção "Aroma" a um produto, com os aromas escolhidos.
 *
 * Ao salvar, o próprio cadastro gera as variações: um aroma, uma variação,
 * nenhuma com preço próprio. O preço continua vindo da tabela de lotes.
 *
 * Uso: node --env-file=.env scripts/configurar-aromas-do-produto.mjs <slug> <aroma1,aroma2,...>
 * Sem argumentos, aplica os 4 aromas atuais ao produto "bomboniere".
 */

import { getPayload } from 'payload'
import config from '../src/payload.config.ts'

const slug = process.argv[2] ?? 'bomboniere'
const aromasPedidos = (process.argv[3] ?? 'Capim Limão,Vanilla,Chá Branco,Lavanda')
  .split(',')
  .map((nome) => nome.trim())
  .filter(Boolean)

const payload = await getPayload({ config })

const produtos = await payload.find({
  collection: 'products',
  where: { slug: { equals: slug } },
  limit: 1,
  depth: 0,
  overrideAccess: true,
})

const produto = produtos.docs[0]
if (!produto) {
  console.error(`Produto "${slug}" não encontrado.`)
  process.exit(1)
}

const atributos = await payload.find({
  collection: 'attributes',
  where: { slug: { equals: 'aroma' } },
  limit: 1,
  depth: 0,
  overrideAccess: true,
})

const aroma = atributos.docs[0]
if (!aroma) {
  console.error('A opção "Aroma" não existe. Rode antes: node --env-file=.env scripts/importar-taxonomias.mjs')
  process.exit(1)
}

const termos = await payload.find({
  collection: 'attribute-terms',
  where: { attribute: { equals: aroma.id } },
  limit: 100,
  depth: 0,
  overrideAccess: true,
})

const escolhidos = aromasPedidos.map((nome) => {
  const termo = termos.docs.find(
    (t) => t.name.toLowerCase().trim() === nome.toLowerCase().trim(),
  )
  if (!termo) {
    console.error(`Aroma "${nome}" não está cadastrado. Disponíveis: ${termos.docs.map((t) => t.name).join(', ')}`)
    process.exit(1)
  }
  return termo
})

await payload.update({
  collection: 'products',
  id: produto.id,
  data: {
    optionGroups: [{ attribute: aroma.id, terms: escolhidos.map((t) => t.id) }],
    _status: 'published',
  },
  overrideAccess: true,
})

const atualizado = await payload.findByID({
  collection: 'products',
  id: produto.id,
  depth: 0,
  overrideAccess: true,
})

console.log(`Produto: ${atualizado.name}`)
console.log(`Aromas ligados: ${escolhidos.map((t) => t.name).join(', ')}`)
console.log(`Variações geradas: ${(atualizado.variants ?? []).length}`)
for (const v of atualizado.variants ?? []) {
  console.log(`  - ${v.label} (${v.sku})`)
}

process.exit(0)
