/**
 * Cria (ou apaga) um pedido e um cupom de demonstração.
 *
 * Serve para você ver as telas funcionando com conteúdo de verdade, sem
 * precisar comprar de si mesmo. Tudo o que ele cria usa o número 9999 e o
 * cupom DEMO10, então dá para apagar depois sem medo de levar junto algo
 * que importa.
 *
 * Criar:  node --env-file=.env scripts/dados-de-demonstracao.mjs
 * Apagar: node --env-file=.env scripts/dados-de-demonstracao.mjs --limpar
 */

import { getPayload } from 'payload'
import config from '../src/payload.config.ts'

const NUMERO = '9999'
const EVENTO = 'Casamento de demonstração'
const CUPOM = 'DEMO10'

const payload = await getPayload({ config })
const limpar = process.argv.includes('--limpar')

const pedidos = await payload.find({
  collection: 'orders',
  where: { number: { equals: NUMERO } },
  limit: 1,
  depth: 0,
})

const cupons = await payload.find({
  collection: 'coupons',
  where: { codigo: { equals: CUPOM } },
  limit: 1,
  depth: 0,
})

if (limpar) {
  if (pedidos.docs[0]) await payload.delete({ collection: 'orders', id: pedidos.docs[0].id })
  if (cupons.docs[0]) await payload.delete({ collection: 'coupons', id: cupons.docs[0].id })

  const { docs: eventos } = await payload.find({
    collection: 'events',
    where: { titulo: { equals: EVENTO } },
    limit: 1,
    depth: 0,
  })
  for (const evento of eventos) await payload.delete({ collection: 'events', id: evento.id })

  const { docs: envios } = await payload.find({
    collection: 'integration-events',
    where: { dedupeKey: { like: NUMERO } },
    limit: 50,
    depth: 0,
  })
  for (const envio of envios) {
    await payload.delete({ collection: 'integration-events', id: envio.id })
  }

  console.log('Dados de demonstração removidos.')
  process.exit(0)
}

if (!cupons.docs[0]) {
  await payload.create({
    collection: 'coupons',
    data: {
      codigo: CUPOM,
      tipo: 'percentual',
      percentual: 10,
      ativo: true,
      parceiro: 'Demonstração',
      observacao: 'Cupom de teste. Pode apagar.',
    },
  })
}

// Uma imagem qualquer já enviada serve de prova de arte, só para a tela ter
// o que mostrar.
const { docs: midias } = await payload.find({ collection: 'media', limit: 1, depth: 0 })
const arte = midias[0]?.id ?? null

// O produto precisa estar ligado ao item: é por essa ligação que a página
// acha a última venda para montar a frase da prova social.
const { docs: produtosPublicados } = await payload.find({
  collection: 'products',
  where: { _status: { equals: 'published' } },
  limit: 1,
  depth: 0,
})
const produto = produtosPublicados[0]

const daquiATrintaDias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
const mesPassado = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

if (produto) {
  const { docs: jaExiste } = await payload.find({
    collection: 'events',
    where: { titulo: { equals: EVENTO } },
    limit: 1,
    depth: 0,
  })

  if (!jaExiste[0]) {
    await payload.create({
      collection: 'events',
      data: {
        titulo: EVENTO,
        autorizado: true,
        tipo: 'Casamento',
        cidade: 'Juiz de Fora',
        quando: mesPassado,
        produtos: [produto.id],
        fotos: arte ? [arte] : [],
        nomeDaCliente: 'Marina (demonstração)',
      },
    })
  }
}
const dadosDoPedido = {
  number: NUMERO,
  status: 'art_approval',
  channel: 'site',
  customerName: 'Ana Clara Ribeiro',
  email: 'demonstracao@luminiaromas.com.br',
  phone: '33999478774',
  personType: 'PF',
  items: [
    {
      product: produto?.id ?? null,
      productName: produto?.name ?? 'Bomboniere',
      variantLabel: 'Lavanda',
      sku: 'BOM-LAV',
      qty: 60,
      unitPrice: 3800,
      lotPrice: 228000,
      lineTotal: 228000,
      personalization: { 'Linha 1': 'Ana Clara & Pedro', 'Linha 2': '12.10.2026' },
      artProof: arte,
    },
  ],
  shippingAddress: {
    postalCode: '35010-000',
    street: 'Rua Sete de Setembro',
    number: '100',
    district: 'Centro',
    city: 'Governador Valadares',
    state: 'MG',
  },
  shippingService: 'Jadlog .Package',
  eventType: 'Casamento',
  eventDate: daquiATrintaDias,
  productionDeadline: daquiATrintaDias,
  subtotal: 228000,
  shippingTotal: 8900,
  total: 236900,
  datePaid: new Date().toISOString(),
  notes: [
    { visibleToCustomer: true, text: 'Separamos o laço de cetim off-white, como você pediu.' },
  ],
}

const pedido = pedidos.docs[0]
  ? await payload.update({ collection: 'orders', id: pedidos.docs[0].id, data: dadosDoPedido })
  : await payload.create({ collection: 'orders', data: dadosDoPedido })

const loja = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'

console.log('')
console.log('Pronto. Para ver:')
console.log('')
console.log(`  Área da cliente  ${loja}/minhaconta/pedido/${pedido.trackingToken}/`)
console.log(`  Entrar sem senha ${loja}/minhaconta/  → pedido ${NUMERO}, e-mail ${dadosDoPedido.email}`)
console.log(`  Cupom no carrinho  ${CUPOM}  (10%)`)
console.log('')
console.log('Para apagar depois: node --env-file=.env scripts/dados-de-demonstracao.mjs --limpar')
console.log('')

process.exit(0)
