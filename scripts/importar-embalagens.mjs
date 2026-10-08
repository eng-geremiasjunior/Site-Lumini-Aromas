/**
 * Traz peso e medidas por faixa de quantidade, da exportação do WooCommerce.
 *
 * No site antigo essa informação está espalhada em 500 variações, uma para
 * cada combinação de aroma e quantidade — e repetida igual em todos os
 * aromas, porque a caixa de 100 peças é a mesma, seja Lavanda ou Vanilla.
 *
 * Aqui ela vira o que realmente é: **uma caixa por faixa**. Dez linhas no
 * lugar de sessenta, e é o que o Melhor Envio precisa para cotar um lote
 * grande sem errar.
 *
 * Quando dois aromas da mesma faixa discordam no peso, fica o maior. Errar
 * para cima custa alguns reais no frete; errar para baixo é a diferença
 * saindo do bolso a cada envio.
 *
 * Uso: node --env-file=.env scripts/importar-embalagens.mjs "caminho.csv"
 */

import fs from 'node:fs'
import { getPayload } from 'payload'
import config from '../src/payload.config.ts'
import { lerCsv, paraObjetos } from './ler-csv-woo.mjs'

const caminho = process.argv[2]
if (!caminho || !fs.existsSync(caminho)) {
  console.log('Informe o caminho do CSV exportado do WooCommerce.')
  process.exit(1)
}

const numero = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** "Vela na caixa 70g - Lavanda, 100 PEÇAS" → { pai, quantidade }. */
function separarNome(nome) {
  const achado = nome.match(/(\d+)\s*PE[ÇC]AS/i)
  if (!achado) return null

  const corte = nome.lastIndexOf(' - ')
  if (corte < 0) return null

  return { pai: nome.slice(0, corte).trim(), quantidade: Number(achado[1]) }
}

const itens = paraObjetos(lerCsv(fs.readFileSync(caminho, 'utf8')))

// Agrupa: nome do produto → faixa → caixa.
const porProduto = new Map()
let semMedida = 0

for (const item of itens) {
  if (item.Tipo !== 'variation') continue

  const separado = separarNome(item.Nome ?? '')
  if (!separado) continue

  const peso = numero(item['Peso (kg)'])
  const comprimento = numero(item['Comprimento (cm)'])
  const largura = numero(item['Largura (cm)'])
  const altura = numero(item['Altura (cm)'])

  if (!peso || !comprimento || !largura || !altura) {
    semMedida += 1
    continue
  }

  if (!porProduto.has(separado.pai)) porProduto.set(separado.pai, new Map())
  const faixas = porProduto.get(separado.pai)

  const atual = faixas.get(separado.quantidade)

  // O maior peso entre os aromas da mesma faixa manda.
  if (!atual || peso > atual.weightKg) {
    faixas.set(separado.quantidade, {
      fromQty: separado.quantidade,
      boxes: 1,
      weightKg: peso,
      lengthCm: comprimento,
      widthCm: largura,
      heightCm: altura,
    })
  }
}

const payload = await getPayload({ config })

const { docs: produtos } = await payload.find({
  collection: 'products',
  limit: 500,
  depth: 0,
  draft: true,
  overrideAccess: true,
})

const porNome = new Map(produtos.map((p) => [String(p.name).trim(), p]))

let atualizados = 0
const naoEncontrados = []

console.log('')

for (const [nome, faixas] of porProduto) {
  const produto = porNome.get(nome)

  if (!produto) {
    naoEncontrados.push(nome)
    continue
  }

  const packaging = [...faixas.values()].sort((a, b) => a.fromQty - b.fromQty)

  await payload.update({
    collection: 'products',
    id: produto.id,
    data: { packaging },
    draft: produto._status !== 'published',
    overrideAccess: true,
  })

  atualizados += 1

  const menor = packaging[0]
  const maior = packaging[packaging.length - 1]

  console.log(
    `  ✓ ${nome.slice(0, 44).padEnd(44)} ${packaging.length} faixa(s)  ${menor.fromQty} pç = ${menor.weightKg} kg  →  ${maior.fromQty} pç = ${maior.weightKg} kg`,
  )
}

console.log('')
console.log('─'.repeat(72))
console.log(`${atualizados} produto(s) com embalagem por faixa.`)

if (semMedida > 0) {
  console.log(`${semMedida} variação(ões) sem peso ou medida completa, ignoradas.`)
}

if (naoEncontrados.length > 0) {
  console.log('')
  console.log('Sem produto correspondente no sistema novo (nome diferente):')
  for (const nome of naoEncontrados) console.log(`  ${nome}`)
}

console.log('')
process.exit(0)
