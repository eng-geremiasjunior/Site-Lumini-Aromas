/**
 * Cria os insumos que o dono descreveu, com as unidades certas.
 *
 * **Sem preço nenhum.** O preço nasce do registro de compra, e inventar um
 * valor aqui colocaria um custo falso no DRE — que é exatamente o problema
 * que este módulo existe para resolver.
 *
 * As quantidades por embalagem são o padrão do mercado (rolo de 50 m, caixa
 * de 50 pavios) e precisam ser conferidas com o que ele compra de verdade.
 *
 * Roda quantas vezes quiser: o que já existe não é duplicado.
 *
 * Uso: node --env-file=.env scripts/insumos-iniciais.mjs
 */

import { getPayload } from 'payload'
import config from '../src/payload.config.ts'

const INSUMOS = [
  {
    nome: 'Copo de vidro 70 ml',
    unidadeDeUso: 'un',
    unidadeDeCompra: 'unidade',
    quantidadePorEmbalagem: 1,
  },
  {
    nome: 'Caixinha',
    unidadeDeUso: 'un',
    unidadeDeCompra: 'unidade',
    quantidadePorEmbalagem: 1,
  },
  {
    nome: 'Cera',
    unidadeDeUso: 'g',
    unidadeDeCompra: 'kg',
    quantidadePorEmbalagem: 1000,
    densidade: 0.86,
    perdaPercentual: 10,
  },
  {
    nome: 'Pavio',
    unidadeDeUso: 'un',
    unidadeDeCompra: 'caixa',
    quantidadePorEmbalagem: 50,
  },
  {
    nome: 'Fita de cetim',
    unidadeDeUso: 'cm',
    unidadeDeCompra: 'rolo',
    quantidadePorEmbalagem: 5000,
  },
  // Uma por aroma, porque são frascos diferentes e a lista de compras
  // precisa sair separada.
  ...['Capim Limão', 'Vanilla', 'Chá Branco', 'Lavanda'].map((aroma) => ({
    nome: `Essência de ${aroma}`,
    unidadeDeUso: 'ml',
    unidadeDeCompra: 'litro',
    quantidadePorEmbalagem: 1000,
    perdaPercentual: 5,
  })),
]

const payload = await getPayload({ config })

let criados = 0
let existentes = 0

for (const insumo of INSUMOS) {
  const { totalDocs } = await payload.count({
    collection: 'supplies',
    where: { nome: { equals: insumo.nome } },
  })

  if (totalDocs > 0) {
    existentes += 1
    continue
  }

  await payload.create({ collection: 'supplies', data: insumo })
  criados += 1
}

console.log(`✓ ${criados} insumo(s) criado(s), ${existentes} já existia(m).`)
console.log('')
console.log('  Falta conferir, em Financeiro › Insumos:')
console.log('  - quanto vem em cada embalagem (rolo de 50 m? caixa de 50 pavios?)')
console.log('  - a perda real da cera e da essência no derretimento')
console.log('  - a densidade da sua cera, se não for 0,86 g/ml')
console.log('')
console.log('  E registrar uma compra em cada um: é dela que sai o preço.')
process.exit(0)
