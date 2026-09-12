/**
 * Cria as categorias financeiras do dia a dia.
 *
 * São as gavetas onde cada despesa é guardada. Começar com a lista pronta
 * evita o problema clássico: "Anúncios", "anuncios" e "ADS" viram três
 * linhas no relatório e o gráfico do mês deixa de significar alguma coisa.
 *
 * Roda quantas vezes quiser: o que já existe não é duplicado.
 *
 * Uso: node --env-file=.env scripts/categorias-financeiras.mjs
 */

import { getPayload } from 'payload'
import config from '../src/payload.config.ts'

const CATEGORIAS = [
  // Tráfego
  { nome: 'Anúncios Instagram', grupo: 'marketing', plataforma: 'Meta' },
  { nome: 'Anúncios Google', grupo: 'marketing', plataforma: 'Google' },
  {
    nome: 'Remarketing Google',
    grupo: 'marketing',
    plataforma: 'Google',
    observacao:
      'Separado do anúncio de primeiro impacto de propósito: é o único jeito de saber se o remarketing se paga sozinho.',
  },
  { nome: 'Impulsionamento e parcerias', grupo: 'marketing', plataforma: 'Outros' },

  // Custos que só existem quando vende
  { nome: 'Embalagem de envio', grupo: 'variavel' },
  { nome: 'Frete pago', grupo: 'variavel' },
  { nome: 'Taxa de pagamento', grupo: 'variavel' },

  // O que o mês custa mesmo sem vender
  { nome: 'Pró-labore', grupo: 'fixa' },
  { nome: 'Aluguel', grupo: 'fixa' },
  { nome: 'Energia, água e internet', grupo: 'fixa' },
  { nome: 'Contador', grupo: 'fixa' },
  { nome: 'Assinaturas e sistemas', grupo: 'fixa', observacao: 'Hospedagem, domínio, ferramentas.' },
  { nome: 'Matéria-prima em estoque', grupo: 'fixa', observacao: 'Compra de insumo que ainda não virou peça vendida.' },

  // Banco
  { nome: 'Tarifas bancárias', grupo: 'financeira' },
  { nome: 'Juros', grupo: 'financeira' },

  // Entradas e saídas fora da venda
  { nome: 'Reembolso a cliente', grupo: 'deducao' },
  { nome: 'Outras entradas', grupo: 'receita' },
]

const payload = await getPayload({ config })

let criadas = 0
let existentes = 0

for (const categoria of CATEGORIAS) {
  const { totalDocs } = await payload.count({
    collection: 'finance-categories',
    where: { nome: { equals: categoria.nome } },
  })

  if (totalDocs > 0) {
    existentes += 1
    continue
  }

  await payload.create({ collection: 'finance-categories', data: categoria })
  criadas += 1
}

console.log(`✓ ${criadas} categoria(s) criada(s), ${existentes} já existia(m).`)
console.log('  Financeiro › Categorias financeiras, para ajustar ou acrescentar.')
process.exit(0)
