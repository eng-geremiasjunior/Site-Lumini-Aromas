/**
 * Liga os campos de personalização de um produto.
 *
 * São os mesmos três que a loja usa hoje no WooCommerce: a frase do rótulo,
 * o envio da logomarca e as observações do pedido. Só a frase é obrigatória.
 *
 * Uso: node --env-file=.env scripts/configurar-personalizacao.mjs [slug]
 * Sem argumento, aplica em todos os produtos publicados que ainda não têm
 * campo nenhum.
 */

import { getPayload } from 'payload'
import config from '../src/payload.config.ts'

const CAMPOS = [
  {
    label: 'Frase ou nome para o rótulo',
    type: 'text',
    required: true,
    maxChars: 40,
    placeholder: 'Ex.: Ana e Pedro · 12.10.2026',
  },
  {
    label: 'Sua logomarca',
    type: 'file',
    required: false,
    placeholder: '',
  },
  {
    label: 'Observações do seu pedido',
    type: 'textarea',
    required: false,
    maxChars: 500,
    placeholder: 'Cor do laço, detalhe da embalagem, qualquer coisa que a gente precise saber.',
  },
]

const payload = await getPayload({ config })
const slug = process.argv[2] ?? null

const { docs } = await payload.find({
  collection: 'products',
  where: slug
    ? { slug: { equals: slug } }
    : { _status: { equals: 'published' } },
  limit: 100,
  depth: 0,
})

if (docs.length === 0) {
  console.log('Nenhum produto encontrado.')
  process.exit(1)
}

for (const produto of docs) {
  const jaTem = Array.isArray(produto.personalizationFields) && produto.personalizationFields.length > 0

  if (jaTem && !slug) {
    console.log(`- ${produto.slug}: já tem campos, não mexi`)
    continue
  }

  await payload.update({
    collection: 'products',
    id: produto.id,
    data: { personalizationFields: CAMPOS },
  })

  console.log(`✓ ${produto.slug}: ${CAMPOS.length} campos configurados`)
}

process.exit(0)
