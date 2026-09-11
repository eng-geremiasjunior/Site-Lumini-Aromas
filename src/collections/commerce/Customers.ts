import type { CollectionConfig } from 'payload'

import { admins, staff } from '../../access/roles.ts'

/**
 * Cliente da loja.
 *
 * Separado da equipe de propósito: quem compra nunca recebe acesso ao
 * painel. A conta nasce sozinha a partir do e-mail do pedido, e o cliente
 * só define senha se quiser acompanhar a produção pela Minha Conta.
 */
export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: { singular: 'Cliente', plural: 'Clientes' },
  admin: {
    group: 'Vendas',
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'phone', 'createdAt'],
    description: 'Quem compra na loja.',
  },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 30, // 30 dias
    maxLoginAttempts: 8,
    lockTime: 10 * 60 * 1000,
    verify: false,
  },
  access: {
    read: ({ req }) => {
      const user = req.user as { id?: string | number; collection?: string; role?: string } | undefined
      if (user?.collection === 'users') return true
      // O cliente só enxerga o próprio cadastro.
      return user?.id ? { id: { equals: user.id } } : false
    },
    create: () => true, // a conta nasce no checkout
    update: ({ req }) => {
      const user = req.user as { id?: string | number; collection?: string } | undefined
      if (user?.collection === 'users') return true
      return user?.id ? { id: { equals: user.id } } : false
    },
    delete: admins,
    admin: () => false, // cliente não entra no painel
  },
  fields: [
    { name: 'name', type: 'text', label: 'Nome completo' },
    {
      type: 'row',
      fields: [
        { name: 'phone', type: 'text', label: 'WhatsApp', admin: { width: '50%' } },
        {
          name: 'personType',
          type: 'select',
          label: 'Tipo de pessoa',
          defaultValue: 'PF',
          options: [
            { label: 'Pessoa física', value: 'PF' },
            { label: 'Pessoa jurídica', value: 'PJ' },
          ],
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'document',
      type: 'text',
      label: 'CPF ou CNPJ',
      admin: { description: 'Necessário para emitir a nota fiscal.' },
    },
    {
      name: 'addresses',
      type: 'array',
      label: 'Endereços',
      labels: { singular: 'Endereço', plural: 'Endereços' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', label: 'Apelido', admin: { width: '50%' } },
            { name: 'postalCode', type: 'text', label: 'CEP', required: true, admin: { width: '50%' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'street', type: 'text', label: 'Rua', required: true, admin: { width: '60%' } },
            { name: 'number', type: 'text', label: 'Número', required: true, admin: { width: '20%' } },
            { name: 'complement', type: 'text', label: 'Compl.', admin: { width: '20%' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'district', type: 'text', label: 'Bairro', required: true, admin: { width: '40%' } },
            { name: 'city', type: 'text', label: 'Cidade', required: true, admin: { width: '40%' } },
            { name: 'state', type: 'text', label: 'UF', required: true, admin: { width: '20%' } },
          ],
        },
        { name: 'isDefault', type: 'checkbox', label: 'Endereço principal' },
      ],
    },
    {
      name: 'optIns',
      type: 'group',
      label: 'Autorizações de contato',
      admin: {
        description:
          'Guardadas com data e hora, como prova de consentimento exigida pela LGPD e pela política do WhatsApp.',
      },
      fields: [
        {
          name: 'whatsappStatus',
          type: 'checkbox',
          label: 'Aceita receber atualizações do pedido pelo WhatsApp',
        },
        { name: 'marketing', type: 'checkbox', label: 'Aceita receber novidades e ofertas' },
        {
          name: 'log',
          type: 'json',
          label: 'Histórico de consentimento',
          admin: { readOnly: true },
        },
      ],
    },
    {
      name: 'metaOptOut',
      type: 'checkbox',
      label: 'Não compartilhar dados com Meta e Google',
      admin: {
        position: 'sidebar',
        description: 'Marque se o cliente pediu para não ter os dados usados em anúncios.',
      },
    },
    {
      name: 'legacyWooId',
      type: 'number',
      label: 'ID no WooCommerce',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Observações internas',
      access: { read: ({ req }) => (req.user as { collection?: string })?.collection === 'users' },
    },
  ],
}

export const _staffGuard = staff
