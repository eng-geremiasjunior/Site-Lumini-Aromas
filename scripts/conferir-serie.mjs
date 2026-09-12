/**
 * Confere o gráfico dos doze meses pelo terminal.
 *
 * A consulta do gráfico é diferente da do mês: ela busca a janela inteira de
 * uma vez e separa por mês aqui dentro. Vale conferir separadamente, porque
 * um erro de fuso horário nessa separação joga a venda do dia 1º para o mês
 * anterior sem dar nenhum erro.
 *
 * Uso: node --env-file=.env scripts/conferir-serie.mjs [AAAA-MM]
 */

import { mesAtual, serieDeMeses } from '../src/commerce/finance/coletar.ts'

const mes = process.argv[2] ?? mesAtual()
const serie = await serieDeMeses(mes, 12)

console.log('')
console.log('mês       receita          resultado        pedidos')
for (const ponto of serie) {
  const reais = (centavos) => (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  console.log(
    `${ponto.mes}   ${reais(ponto.resumo.receitaBruta).padStart(14)}   ${reais(ponto.resumo.resultado).padStart(14)}   ${String(ponto.resumo.pedidos).padStart(3)}`,
  )
}
console.log('')
process.exit(0)
