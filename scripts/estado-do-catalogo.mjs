/**
 * O que já existe no sistema, em uma olhada.
 *
 * Serve para responder rápido "dá para lançar uma venda agora?" — que
 * depende de ter produto cadastrado com preço.
 *
 * Uso: node --env-file=.env scripts/estado-do-catalogo.mjs
 */

import { getPayload } from 'payload'
import config from '../src/payload.config.ts'

const payload = await getPayload({ config })
const reais = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const contar = async (collection) => (await payload.count({ collection })).totalDocs

console.log('')
console.log('Catálogo')
console.log(`  produtos ................ ${await contar('products')}`)
console.log(`  categorias .............. ${await contar('categories')}`)
console.log(`  ocasiões ................ ${await contar('occasions')}`)
console.log(`  termos de atributo ...... ${await contar('attribute-terms')}`)
console.log('')
console.log('Vendas')
console.log(`  pedidos ................. ${await contar('orders')}`)
console.log(`  clientes ................ ${await contar('customers')}`)
console.log(`  cupons .................. ${await contar('coupons')}`)
console.log('')
console.log('Financeiro')
console.log(`  insumos ................. ${await contar('supplies')}`)
console.log(`  categorias financeiras .. ${await contar('finance-categories')}`)
console.log(`  lançamentos ............. ${await contar('ledger-entries')}`)
console.log(`  campanhas ............... ${await contar('campaigns')}`)

const { docs: produtos } = await payload.find({
  collection: 'products',
  limit: 50,
  depth: 0,
  sort: 'name',
  overrideAccess: true,
  draft: true,
})

if (produtos.length > 0) {
  console.log('')
  console.log('Produtos cadastrados')
  for (const produto of produtos) {
    const variacoes = (produto.variants ?? []).length
    console.log(
      `  ${String(produto.name).padEnd(34)} ${reais(produto.unitPrice ?? 0).padStart(10)}/peça  ${variacoes} aroma(s)  ${produto._status}`,
    )
  }
}

console.log('')
process.exit(0)
