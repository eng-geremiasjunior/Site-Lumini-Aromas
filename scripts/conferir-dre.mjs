/**
 * Confere o resultado do mês pelo terminal.
 *
 * Serve para validar o cálculo sem depender da tela: se o número aqui e o
 * número do painel divergirem, o problema está na tela; se os dois
 * estiverem errados juntos, está no cálculo.
 *
 * Uso: node --env-file=.env scripts/conferir-dre.mjs [AAAA-MM]
 */

import { dreDoMes, mesAtual } from '../src/commerce/finance/coletar.ts'
import { nomeDoMes } from '../src/commerce/finance/dre.ts'

const mes = process.argv[2] ?? mesAtual()
const { resumo, lacunas } = await dreDoMes(mes)

const reais = (centavos) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

console.log('')
console.log(`Resultado de ${nomeDoMes(mes)}`)
console.log('-'.repeat(46))
console.log(`Receita bruta          ${reais(resumo.receitaBruta).padStart(16)}`)
console.log(`(-) deduções           ${reais(resumo.deducoes).padStart(16)}`)
console.log(`(-) Simples Nacional   ${reais(resumo.imposto).padStart(16)}`)
console.log(`= Receita líquida      ${reais(resumo.receitaLiquida).padStart(16)}`)
console.log(`(-) custo das peças    ${reais(resumo.cmv).padStart(16)}`)
console.log(`= Lucro bruto          ${reais(resumo.lucroBruto).padStart(16)}  ${resumo.margemBruta}%`)
console.log(`(-) custos variáveis   ${reais(resumo.custosVariaveis).padStart(16)}`)
console.log(`= Margem contribuição  ${reais(resumo.margemDeContribuicao).padStart(16)}`)
console.log(`(-) tráfego            ${reais(resumo.marketing).padStart(16)}`)
console.log(`(-) despesas fixas     ${reais(resumo.despesasFixas).padStart(16)}`)
console.log(`= Resultado            ${reais(resumo.resultado).padStart(16)}  ${resumo.margemLiquida}%`)
console.log('')
console.log(`${resumo.pedidos} pedido(s), ${resumo.pecas} peça(s), ticket ${reais(resumo.ticketMedio)}`)

if (resumo.porCategoria.length > 0) {
  console.log('')
  console.log('Por categoria:')
  for (const linha of resumo.porCategoria) {
    console.log(
      `  ${linha.categoria.padEnd(22)} ${reais(linha.receita).padStart(14)}  margem ${linha.margem}%`,
    )
  }
}

if (lacunas.length > 0) {
  console.log('')
  console.log('Ressalvas:')
  for (const aviso of lacunas) console.log(`  - ${aviso}`)
}

console.log('')
process.exit(0)
