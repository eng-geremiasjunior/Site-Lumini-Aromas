import type { CollectionConfig } from 'payload'

import { admins, owner, staff } from '../../access/roles.ts'
import { money } from '../../fields/money.ts'
import { randomUUID } from 'node:crypto'

import { ORDER_STATUS_OPTIONS, type OrderStatus } from '../../commerce/orders/statuses.ts'
import { eventosDaTransicao } from '../../commerce/integrations/outbox.ts'
import { enfileirar } from '../../lib/outbox.ts'

/**
 * Pedido.
 *
 * Guarda o que aconteceu, e não o que o produto é hoje: nome, preço e custo
 * do item ficam congelados no momento da venda. Se o preço da bomboniere
 * mudar amanhã, o pedido de ontem continua mostrando o que foi cobrado, e o
 * lucro daquele pedido não se altera sozinho no DRE.
 */
export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: { singular: 'Pedido', plural: 'Pedidos' },
  admin: {
    group: 'Vendas',
    useAsTitle: 'number',
    defaultColumns: ['number', 'customerName', 'status', 'total', 'channel', 'createdAt'],
    description: 'Todos os pedidos, do site e os lançados à mão.',
  },
  access: {
    read: ({ req }) => {
      const user = req.user as { id?: string | number; collection?: string } | undefined
      if (user?.collection === 'users') return true
      // O cliente só enxerga os próprios pedidos.
      return user?.id ? { customer: { equals: user.id } } : false
    },
    create: admins,
    update: admins,
    delete: owner,
  },
  hooks: {
    /**
     * Um único caminho de efeitos colaterais.
     *
     * Mudou a situação do pedido — pelo checkout, pelo webhook do Mercado
     * Pago, pela aprovação da arte ou pela mão do dono no painel —, tudo o
     * que precisa sair (e-mail agora; Meta, Google e DRE depois) entra na
     * caixa de saída aqui, e só aqui. Regra espalhada por tela é como o
     * WooCommerce deixava a conversão da Meta se perder em silêncio.
     */
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        const de = operation === 'create' ? null : (previousDoc?.status as OrderStatus | undefined)
        const para = doc.status as OrderStatus

        const eventos = eventosDaTransicao({ numero: String(doc.number), de, para })
        if (eventos.length > 0) await enfileirar(req.payload, eventos, doc.id, req)

        return doc
      },
    ],
    beforeChange: [
      ({ data, operation }) => {
        // Código de acesso ao pedido, gerado uma vez e nunca mostrado ao
        // público. É o que permite a cliente abrir o pedido dela pelo link
        // do e-mail sem criar senha, e impede alguém de adivinhar o pedido
        // do vizinho trocando o número na barra de endereço.
        if (operation === 'create' && !data.trackingToken) {
          data.trackingToken = randomUUID()
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'trackingToken',
      type: 'text',
      label: 'Código de acesso',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Usado no link que a cliente recebe para acompanhar o pedido.',
      },
    },
    {
      name: 'productionPhotos',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      label: 'Fotos da produção',
      admin: {
        description:
          'Fotos das peças desta cliente sendo feitas. Aparecem na área dela e acalmam a espera. Depois servem de prova social, com autorização.',
      },
    },
    // ---------------------------------------------------------------- sidebar
    {
      name: 'number',
      type: 'text',
      label: 'Número do pedido',
      required: true,
      unique: true,
      index: true,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Situação',
      required: true,
      defaultValue: 'pending',
      options: ORDER_STATUS_OPTIONS,
      admin: { position: 'sidebar' },
    },
    {
      name: 'channel',
      type: 'select',
      label: 'Origem da venda',
      required: true,
      defaultValue: 'site',
      options: [
        { label: 'Site', value: 'site' },
        { label: 'WhatsApp', value: 'whatsapp' },
        { label: 'Instagram', value: 'instagram_dm' },
        { label: 'Lançado no painel', value: 'admin' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Usado para medir o retorno de cada canal e devolver a conversão à Meta.',
      },
    },
    {
      name: 'legacyWooId',
      type: 'number',
      label: 'ID no WooCommerce',
      admin: { position: 'sidebar', readOnly: true },
    },

    // ------------------------------------------------------------------ abas
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Pedido',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'customerName',
                  type: 'text',
                  label: 'Nome do cliente',
                  required: true,
                  admin: { width: '50%' },
                },
                { name: 'email', type: 'email', label: 'E-mail', admin: { width: '50%' } },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'phone', type: 'text', label: 'WhatsApp', admin: { width: '34%' } },
                {
                  name: 'personType',
                  type: 'select',
                  label: 'Tipo de pessoa',
                  defaultValue: 'PF',
                  options: [
                    { label: 'Pessoa física', value: 'PF' },
                    { label: 'Pessoa jurídica', value: 'PJ' },
                  ],
                  admin: { width: '33%' },
                },
                { name: 'document', type: 'text', label: 'CPF ou CNPJ', admin: { width: '33%' } },
              ],
            },
            {
              name: 'customer',
              type: 'relationship',
              relationTo: 'customers',
              label: 'Conta do cliente',
            },
            {
              name: 'items',
              type: 'array',
              label: 'Itens',
              labels: { singular: 'Item', plural: 'Itens' },
              admin: {
                description:
                  'Nome, preço e custo ficam congelados no momento da venda, para o histórico não mudar depois.',
              },
              fields: [
                {
                  name: 'product',
                  type: 'relationship',
                  relationTo: 'products',
                  label: 'Produto',
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'productName',
                      type: 'text',
                      label: 'Produto (no dia da venda)',
                      required: true,
                      admin: { width: '50%' },
                    },
                    {
                      name: 'variantLabel',
                      type: 'text',
                      label: 'Aroma',
                      admin: { width: '25%' },
                    },
                    { name: 'sku', type: 'text', label: 'Código', admin: { width: '25%' } },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'qty',
                      type: 'number',
                      label: 'Peças',
                      required: true,
                      admin: { width: '25%' },
                    },
                    money({
                      name: 'unitPrice',
                      label: 'Preço da peça',
                      required: true,
                      admin: { width: '25%' },
                    }),
                    money({
                      name: 'lotPrice',
                      label: 'Valor do lote',
                      required: true,
                      admin: { width: '25%' },
                    }),
                    money({
                      name: 'lineTotal',
                      label: 'Total da linha',
                      required: true,
                      admin: { width: '25%' },
                    }),
                  ],
                },
                {
                  name: 'personalization',
                  type: 'json',
                  label: 'Personalização',
                  admin: { description: 'O que o cliente escreveu, exatamente como digitou.' },
                },
                { name: 'addons', type: 'json', label: 'Acabamentos' },
                {
                  name: 'artFile',
                  type: 'upload',
                  relationTo: 'media',
                  label: 'Logo enviada pelo cliente',
                },
                {
                  name: 'artProof',
                  type: 'upload',
                  relationTo: 'media',
                  label: 'Prova de arte enviada ao cliente',
                  admin: {
                    description:
                      'Assim que você anexar aqui, a cliente vê a arte na área dela e pode aprovar. Nada é produzido antes disso.',
                  },
                },
                {
                  name: 'artApprovedAt',
                  type: 'date',
                  label: 'Arte aprovada em',
                  admin: {
                    readOnly: true,
                    description:
                      'Preenchido quando a cliente aprova. É a prova de que ela viu e concordou com o rótulo antes da produção.',
                  },
                },
                money({
                  name: 'unitCost',
                  label: 'Custo da peça (no dia da venda)',
                  access: { read: ({ req }) => (req.user as { role?: string })?.role === 'dono' },
                  admin: { description: 'Congelado na venda. Alimenta o lucro no DRE.' },
                }),
              ],
            },
          ],
        },

        {
          label: 'Entrega',
          fields: [
            {
              name: 'shippingAddress',
              type: 'group',
              label: 'Endereço de entrega',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'postalCode', type: 'text', label: 'CEP', admin: { width: '25%' } },
                    { name: 'street', type: 'text', label: 'Rua', admin: { width: '55%' } },
                    { name: 'number', type: 'text', label: 'Número', admin: { width: '20%' } },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'complement', type: 'text', label: 'Complemento', admin: { width: '25%' } },
                    { name: 'district', type: 'text', label: 'Bairro', admin: { width: '25%' } },
                    { name: 'city', type: 'text', label: 'Cidade', admin: { width: '30%' } },
                    { name: 'state', type: 'text', label: 'UF', admin: { width: '20%' } },
                  ],
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'shippingService',
                  type: 'text',
                  label: 'Transportadora e serviço',
                  admin: { width: '50%' },
                },
                {
                  name: 'trackingCode',
                  type: 'text',
                  label: 'Código de rastreio',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'eventType',
                  type: 'text',
                  label: 'Tipo de evento',
                  admin: { width: '50%', description: 'Casamento, 15 anos, batizado...' },
                },
                {
                  name: 'eventDate',
                  type: 'date',
                  label: 'Data do evento',
                  admin: {
                    width: '50%',
                    description: 'O prazo de produção precisa caber antes desta data.',
                  },
                },
              ],
            },
            {
              name: 'productionDeadline',
              type: 'date',
              label: 'Prazo prometido',
              admin: { description: 'Data limite calculada no momento da compra.' },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'dateShipped',
                  type: 'date',
                  label: 'Despachado em',
                  admin: { width: '50%', readOnly: true },
                },
                {
                  name: 'dateCompleted',
                  type: 'date',
                  label: 'Entregue em',
                  admin: { width: '50%', readOnly: true },
                },
              ],
            },
            {
              name: 'customerNote',
              type: 'textarea',
              label: 'Observação do cliente',
            },
          ],
        },

        {
          label: 'Pagamento',
          fields: [
            {
              type: 'row',
              fields: [
                money({ name: 'subtotal', label: 'Subtotal', required: true, admin: { width: '25%' } }),
                money({ name: 'shippingTotal', label: 'Frete', admin: { width: '25%' } }),
                money({ name: 'discountTotal', label: 'Desconto', admin: { width: '25%' } }),
                money({ name: 'total', label: 'Total', required: true, admin: { width: '25%' } }),
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'paymentMethod',
                  type: 'select',
                  label: 'Forma de pagamento',
                  options: [
                    { label: 'Pix', value: 'pix' },
                    { label: 'Cartão de crédito', value: 'credit_card' },
                    { label: 'Cartão de débito', value: 'debit_card' },
                    { label: 'Link do Mercado Pago', value: 'mp_link' },
                    { label: 'Pago fora do site', value: 'external' },
                  ],
                  admin: { width: '50%' },
                },
                {
                  name: 'installments',
                  type: 'number',
                  label: 'Parcelas',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'couponCode',
              type: 'text',
              label: 'Cupom usado',
            },
            {
              name: 'mercadoPago',
              type: 'group',
              label: 'Mercado Pago',
              admin: { description: 'Preenchido sozinho quando o pagamento é confirmado.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'paymentId', type: 'text', label: 'ID do pagamento', admin: { width: '50%' } },
                    { name: 'status', type: 'text', label: 'Situação', admin: { width: '50%' } },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    money({
                      name: 'feeCents',
                      label: 'Taxa cobrada',
                      access: { read: ({ req }) => (req.user as { role?: string })?.role === 'dono' },
                      admin: { width: '50%', description: 'Valor real informado pelo Mercado Pago.' },
                    }),
                    money({
                      name: 'netReceivedCents',
                      label: 'Valor líquido',
                      access: { read: ({ req }) => (req.user as { role?: string })?.role === 'dono' },
                      admin: { width: '50%' },
                    }),
                  ],
                },
                {
                  name: 'moneyReleaseDate',
                  type: 'date',
                  label: 'Data de liberação do dinheiro',
                  admin: { description: 'Usada no fluxo de caixa, que é diferente do DRE.' },
                },
              ],
            },
            {
              name: 'datePaid',
              type: 'date',
              label: 'Pago em',
              admin: { readOnly: true },
            },
          ],
        },

        {
          label: 'Marketing',
          description: 'De onde veio a venda, e o que já foi enviado para Meta e Google.',
          fields: [
            {
              name: 'leadRef',
              type: 'text',
              label: 'Código do lead',
              admin: { description: 'Aquele código curto que vai na mensagem do WhatsApp.' },
            },
            {
              name: 'attribution',
              type: 'json',
              label: 'Origem',
              admin: { description: 'Campanha, anúncio e cookies capturados na visita.' },
            },
            {
              name: 'conversionsSent',
              type: 'json',
              label: 'Conversões enviadas',
              admin: {
                readOnly: true,
                description: 'Registro do que já foi para a Meta e para o Google, para não enviar duas vezes.',
              },
            },
          ],
        },

        {
          label: 'Histórico',
          fields: [
            {
              name: 'events',
              type: 'array',
              label: 'Eventos',
              labels: { singular: 'Evento', plural: 'Eventos' },
              admin: {
                readOnly: true,
                description: 'Tudo que aconteceu com o pedido, na ordem.',
              },
              fields: [
                { name: 'at', type: 'date', label: 'Quando' },
                { name: 'type', type: 'text', label: 'Tipo' },
                { name: 'message', type: 'textarea', label: 'O que aconteceu' },
                { name: 'actor', type: 'text', label: 'Quem' },
              ],
            },
            {
              name: 'notes',
              type: 'array',
              label: 'Anotações',
              labels: { singular: 'Anotação', plural: 'Anotações' },
              fields: [
                {
                  name: 'visibleToCustomer',
                  type: 'checkbox',
                  label: 'Enviar esta anotação ao cliente',
                  defaultValue: false,
                },
                { name: 'text', type: 'textarea', label: 'Anotação', required: true },
              ],
            },
          ],
        },
      ],
    },
  ],
}

export const _staffGuard = staff
