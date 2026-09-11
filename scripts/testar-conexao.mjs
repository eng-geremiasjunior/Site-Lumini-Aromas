/**
 * Testa a conexão com o banco sem exibir a senha em lugar nenhum.
 *
 * Uso: node --env-file=.env scripts/testar-conexao.mjs
 */

import pg from 'pg'

const uri = process.env.DATABASE_URI

if (!uri) {
  console.error('✖ DATABASE_URI não encontrada no arquivo .env')
  process.exit(1)
}

let parsed
try {
  parsed = new URL(uri)
} catch {
  console.error('✖ O endereço do banco está mal formado. Confira se colou a linha inteira.')
  process.exit(1)
}

if (parsed.password.includes('[') || parsed.password.includes(']')) {
  console.error('✖ A senha ainda está como [YOUR-PASSWORD]. Troque pelo valor real, sem colchetes.')
  process.exit(1)
}

const regiao = parsed.hostname.match(/(sa-east-\d|us-east-\d|us-west-\d|eu-\w+-\d|ap-\w+-\d)/)?.[1]

console.log('Servidor:', parsed.hostname)
console.log('Porta:   ', parsed.port || '5432')
console.log('Banco:   ', parsed.pathname.replace('/', ''))
console.log('Usuário: ', parsed.username)
console.log('Senha:   ', parsed.password ? `preenchida (${parsed.password.length} caracteres)` : 'VAZIA')
console.log('Região:  ', regiao ?? 'não identificada pelo endereço')
console.log('Tipo:    ', parsed.hostname.includes('pooler') ? 'Session/Transaction pooler' : 'Conexão direta')
console.log('')

const client = new pg.Client({
  connectionString: uri,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
})

try {
  await client.connect()
  const { rows } = await client.query(
    "select version() as versao, current_database() as banco, now() as agora",
  )
  console.log('✔ Conexão estabelecida.')
  console.log('  PostgreSQL:', rows[0].versao.split(' ').slice(0, 2).join(' '))
  console.log('  Banco:     ', rows[0].banco)

  const { rows: tabelas } = await client.query(
    "select count(*)::int as total from information_schema.tables where table_schema = 'public'",
  )
  console.log('  Tabelas no schema public:', tabelas[0].total)

  // Confere se dá para criar tabela, que é o que o painel precisa fazer.
  await client.query('create table if not exists _lumini_teste_conexao (id int)')
  await client.query('drop table if exists _lumini_teste_conexao')
  console.log('  Permissão para criar tabelas: ok')

  await client.end()
  process.exit(0)
} catch (error) {
  console.error('✖ Não foi possível conectar.')
  console.error('  Motivo:', error.message)

  if (/password authentication failed/i.test(error.message)) {
    console.error('  → A senha está errada. Gere outra em Database > Settings e cole de novo.')
  } else if (/ENOTFOUND|EAI_AGAIN/i.test(error.message)) {
    console.error('  → O endereço do servidor não foi encontrado. Confira se copiou a linha inteira.')
  } else if (/ENETUNREACH|ECONNREFUSED|timeout/i.test(error.message)) {
    console.error(
      '  → Sem resposta do servidor. Se estiver usando a conexão direta, troque para a aba Session pooler.',
    )
  }

  try {
    await client.end()
  } catch {}
  process.exit(1)
}
