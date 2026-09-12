import type { CollectionConfig } from 'payload'

import { randomUUID } from 'node:crypto'

import { admins } from '../../access/roles.ts'

/**
 * Carrinho de compras.
 *
 * Guarda apenas a ESCOLHA do cliente: produto, aroma, quantidade,
 * personalização e acabamentos. Preço nenhum é gravado aqui.
 *
 * O motivo é o mesmo que vale no resto da loja: existe um só lugar que
 * calcula preço. Se o carrinho guardasse o valor, ele envelheceria quando
 * o preço do produto mudasse, e passaríamos a ter duas verdades. A cada
 * leitura o preço é recalculado a partir do produto.
 *
 * Também é a base da recuperação de carrinho abandonado: o e-mail é
 * capturado no primeiro passo do checkout, antes do pagamento.
 */
export const Carts: CollectionConfig = {
  slug: 'carts',
  labels: { singular: 'Carrinho', plural: 'Carrinhos' },
  admin: {
    group: 'Vendas',
    useAsTitle: 'token',
    defaultColumns: ['token', 'email', 'status', 'lastActivityAt'],
    description: 'Carrinhos em aberto e abandonados.',
  },
  // O cliente nunca fala com esta coleção pela API pública: o acesso
  // acontece por ações do servidor, que conferem o código do carrinho.
  access: { read: admins, create: admins, update: admins, delete: admins },
  fields: [
    {
      name: 'token',
      type: 'text',
      label: 'Código do carrinho',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Situação',
      defaultValue: 'active',
      required: true,
      options: [
        { label: 'Em aberto', value: 'active' },
        { label: 'Abandonado', value: 'abandoned' },
        { label: 'Virou pedido', value: 'converted' },
        { label: 'Perdido', value: 'lost' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'items',
      type: 'array',
      label: 'Itens',
      labels: { singular: 'Item', plural: 'Itens' },
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          label: 'Produto',
          required: true,
        },
        { name: 'variantKey', type: 'text', label: 'Aroma' },
        { name: 'qty', type: 'number', label: 'Quantidade', required: true, min: 1 },
        {
          name: 'personalization',
          type: 'json',
          label: 'Personalização',
          admin: { description: 'O que o cliente escreveu em cada campo.' },
        },
        {
          name: 'addonIds',
          type: 'json',
          label: 'Acabamentos escolhidos',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'email',
          type: 'email',
          label: 'E-mail',
          admin: {
            width: '50%',
            description: 'Capturado no primeiro passo do checkout, para recuperar o carrinho.',
          },
        },
        { name: 'phone', type: 'text', label: 'WhatsApp', admin: { width: '50%' } },
      ],
    },
    {
      name: 'customerName',
      type: 'text',
      label: 'Nome',
      admin: {
        description: 'Também capturado no checkout, para o lembrete falar com ela pelo nome.',
      },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      label: 'Cliente',
      admin: { description: 'Preenchido quando o cliente entra na conta.' },
    },
    { name: 'couponCode', type: 'text', label: 'Cupom' },
    { name: 'giftCardCode', type: 'text', label: 'Cartão-presente' },
    {
      name: 'lastActivityAt',
      type: 'date',
      label: 'Última atividade',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'restoreToken',
      type: 'text',
      label: 'Código de retomada',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description:
          'Vai no link do e-mail de lembrete e devolve o carrinho montado. É diferente do código da sessão de propósito: o que circula por e-mail não é o mesmo que identifica o navegador.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'recoveryStep',
          type: 'number',
          label: 'Lembretes enviados',
          defaultValue: 0,
          admin: { width: '50%', readOnly: true, description: 'De zero a três.' },
        },
        {
          name: 'lastRecoveryAt',
          type: 'date',
          label: 'Último lembrete',
          admin: { width: '50%', readOnly: true },
        },
      ],
    },
    {
      name: 'convertedOrderNumber',
      type: 'text',
      label: 'Virou o pedido',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'attribution',
      type: 'json',
      label: 'Origem',
      admin: {
        position: 'sidebar',
        description: 'De onde o cliente veio: campanha, anúncio ou acesso direto.',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        // Qualquer mexida no carrinho reinicia o relógio do abandono. A
        // exceção é quando quem grava manda a data de propósito: é o que
        // permite a varredura marcar o carrinho como abandonado sem, com
        // isso, fingir que a cliente acabou de mexer nele.
        if (!data.lastActivityAt) data.lastActivityAt = new Date().toISOString()
        if (operation === 'create' && !data.restoreToken) data.restoreToken = randomUUID()
        return data
      },
    ],
  },
}
