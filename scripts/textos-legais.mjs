/**
 * Escreve os textos legais no painel.
 *
 * As páginas de trocas, termos e privacidade já funcionam sem isto: quando
 * o campo do painel está vazio, elas mostram o texto padrão do código. Este
 * script copia esse mesmo texto para dentro do editor, para o dono poder
 * ajustar uma frase sem precisar de ninguém.
 *
 * Não sobrescreve o que já foi escrito. Para forçar a volta ao texto
 * padrão de um campo, apague o campo no painel e rode de novo.
 *
 * Uso: node --env-file=.env scripts/textos-legais.mjs
 */

import { getPayload } from 'payload'

import config from '../src/payload.config.ts'
import { TEXTOS_LEGAIS, paraLexical } from '../src/commerce/legal/textos-padrao.ts'

const payload = await getPayload({ config })

const atual = await payload.findGlobal({ slug: 'store-settings', depth: 0 })

// A razão social é obrigatória no cadastro da loja — e com razão: sem ela
// as páginas legais ficam sem a identificação que o Decreto 7.962 exige.
// Gravar qualquer coisa aqui seria pior do que avisar.
if (!atual?.legalName) {
  console.error('A razão social da empresa ainda não foi preenchida.')
  console.error('')
  console.error('Abra o painel em Configurações da loja › Empresa e preencha')
  console.error('"Razão social" — o nome registrado no CNPJ, que aparece na')
  console.error('nota fiscal. Depois rode este comando de novo.')
  process.exit(1)
}

const dados = {}
const escritos = []
const preservados = []

for (const texto of TEXTOS_LEGAIS) {
  if (atual?.[texto.campo]) {
    preservados.push(texto.titulo)
    continue
  }

  dados[texto.campo] = paraLexical(texto.blocos)
  escritos.push(texto.titulo)
}

if (Object.keys(dados).length > 0) {
  await payload.updateGlobal({ slug: 'store-settings', data: dados })
}

for (const titulo of escritos) console.log(`✓ ${titulo}`)
for (const titulo of preservados) console.log(`· ${titulo} — já tinha texto, mantido`)

console.log('')
console.log('Configurações da loja › Textos legais, para revisar e ajustar.')
console.log('Um advogado precisa ler antes da virada de domínio.')
process.exit(0)
