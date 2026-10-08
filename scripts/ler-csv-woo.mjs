/**
 * Lê a exportação de produtos do WooCommerce.
 *
 * O arquivo tem campos que a API pública não entrega — peso, dimensões e
 * a quantidade mínima configurada no plugin — e é por isso que ele vale
 * mais que a importação que fizemos pela web.
 *
 * Aqui só se lê e se resume. Nada é gravado.
 *
 * Uso: node scripts/ler-csv-woo.mjs "caminho/do/arquivo.csv"
 */

import fs from 'node:fs'

/** Separa respeitando aspas: descrição com vírgula e quebra de linha é comum. */
export function lerCsv(texto) {
  const linhas = []
  let campo = ''
  let linha = []
  let dentroDeAspas = false

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]

    if (c === '"') {
      if (dentroDeAspas && texto[i + 1] === '"') {
        campo += '"'
        i++
      } else {
        dentroDeAspas = !dentroDeAspas
      }
      continue
    }

    if (c === ',' && !dentroDeAspas) {
      linha.push(campo)
      campo = ''
      continue
    }

    if ((c === '\n' || c === '\r') && !dentroDeAspas) {
      if (c === '\r' && texto[i + 1] === '\n') i++
      linha.push(campo)
      if (linha.some((v) => v !== '')) linhas.push(linha)
      linha = []
      campo = ''
      continue
    }

    campo += c
  }

  if (campo !== '' || linha.length > 0) {
    linha.push(campo)
    if (linha.some((v) => v !== '')) linhas.push(linha)
  }

  return linhas
}

export function paraObjetos(linhas) {
  const cabecalho = (linhas[0] ?? []).map((c) => c.replace(/^﻿/, '').trim())
  return linhas.slice(1).map((l) => Object.fromEntries(cabecalho.map((c, i) => [c, l[i] ?? ''])))
}

// Só resume quando chamado direto. Importado por outro script, fica quieto.
const chamadoDireto = import.meta.url.endsWith('ler-csv-woo.mjs') && /ler-csv-woo/.test(process.argv[1] ?? '')

if (chamadoDireto && process.argv[2]) {
  const linhas = lerCsv(fs.readFileSync(process.argv[2], 'utf8'))
  const itens = paraObjetos(linhas)

  const porTipo = {}
  for (const i of itens) porTipo[i.Tipo || '(vazio)'] = (porTipo[i.Tipo || '(vazio)'] ?? 0) + 1

  const comPeso = itens.filter((i) => Number(i['Peso (kg)']) > 0)
  const comMedidas = itens.filter(
    (i) => Number(i['Comprimento (cm)']) > 0 && Number(i['Largura (cm)']) > 0 && Number(i['Altura (cm)']) > 0,
  )
  const minimos = [...new Set(itens.map((i) => i['Metadado: _wcmmq_min_qty']).filter(Boolean))]

  console.log('')
  console.log('linhas .................', itens.length)
  console.log('por tipo ...............', JSON.stringify(porTipo))
  console.log('com peso ...............', comPeso.length)
  console.log('com as três medidas ....', comMedidas.length)
  console.log('mínimos configurados ...', minimos.join(', ') || 'nenhum')
  console.log('')

  console.log('Produtos com peso informado:')
  for (const i of comPeso.slice(0, 30)) {
    const medidas = [i['Comprimento (cm)'], i['Largura (cm)'], i['Altura (cm)']].filter(Boolean).join(' x ')
    console.log(
      `  ${String(i.ID).padStart(5)} ${String(i.Tipo).padEnd(10)} ${i['Peso (kg)'].padStart(7)} kg  ${medidas.padEnd(16)} ${i.Nome.slice(0, 44)}`,
    )
  }
  console.log('')
}
