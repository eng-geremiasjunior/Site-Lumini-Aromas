import type { CollectionConfig } from 'payload'

import { admins, owner } from '../../access/roles.ts'
import { money } from '../../fields/money.ts'
import { normalizarCodigo } from '../../commerce/coupons/coupon.ts'

/**
 * Cupons.
 *
 * Três tipos, porque numa loja de lote fechado é o que faz sentido:
 * percentual, valor em reais e frete grátis. O "desconto fixo por produto"
 * do WooCommerce não entra — ninguém entende R$ 5 de desconto "por produto"
 * num lote de 60 peças.
 *
 * A contagem de uso não é guardada aqui: ela é contada nos pedidos pagos, na
 * hora de validar. É uma consulta a mais e uma fonte de erro a menos —
 * pedido cancelado devolve o uso sozinho, sem ninguém precisar lembrar.
 */
export const Coupons: CollectionConfig = {
  slug: 'coupons',
  labels: { singular: 'Cupom', plural: 'Cupons' },
  admin: {
    group: 'Vendas',
    useAsTitle: 'codigo',
    defaultColumns: ['codigo', 'tipo', 'ativo', 'validoAte', 'parceiro'],
    description: 'Descontos combinados com clientes, parceiros e cerimonialistas.',
  },
  access: {
    read: admins,
    create: admins,
    update: admins,
    delete: owner,
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        // "parceiro 10" e "PARCEIRO10" são o mesmo cupom. A cliente digita
        // como quiser; o que fica guardado é sempre a forma limpa.
        if (data.codigo) data.codigo = normalizarCodigo(data.codigo)
        return data
      },
    ],
  },
  fields: [
    {
      name: 'codigo',
      type: 'text',
      label: 'Código',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'O que a cliente digita no carrinho. Maiúsculas e minúsculas dão no mesmo.',
      },
    },
    {
      name: 'ativo',
      type: 'checkbox',
      label: 'Cupom ativo',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'parceiro',
      type: 'text',
      label: 'Parceiro',
      admin: {
        position: 'sidebar',
        description: 'De quem é este cupom: a cerimonialista, a loja, a campanha.',
      },
    },
    {
      name: 'tipo',
      type: 'select',
      label: 'Tipo de desconto',
      required: true,
      defaultValue: 'percentual',
      options: [
        { label: 'Porcentagem do pedido', value: 'percentual' },
        { label: 'Valor em reais', value: 'valor' },
        { label: 'Frete grátis', value: 'frete_gratis' },
      ],
    },
    {
      name: 'percentual',
      type: 'number',
      label: 'Desconto (%)',
      min: 0,
      max: 100,
      admin: {
        condition: (_, irmaos) => irmaos.tipo === 'percentual',
        description: 'Ex.: 10 para dez por cento.',
      },
    },
    money({
      name: 'valorCentavos',
      label: 'Desconto em reais',
      admin: { condition: (_, irmaos) => irmaos.tipo === 'valor' },
    }),

    {
      type: 'collapsible',
      label: 'Quando vale',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'validoDe',
              type: 'date',
              label: 'Começa em',
              admin: { width: '50%', description: 'Deixe vazio para valer desde já.' },
            },
            {
              name: 'validoAte',
              type: 'date',
              label: 'Vale até',
              admin: { width: '50%', description: 'Deixe vazio para não expirar.' },
            },
          ],
        },
        money({
          name: 'gastoMinimoCentavos',
          label: 'Valor mínimo do pedido',
          admin: { description: 'Deixe vazio para valer em qualquer valor.' },
        }),
        {
          type: 'row',
          fields: [
            {
              name: 'usoMaximo',
              type: 'number',
              label: 'Quantas vezes pode ser usado no total',
              min: 1,
              admin: { width: '50%', description: 'Vazio = sem limite.' },
            },
            {
              name: 'usoMaximoPorCliente',
              type: 'number',
              label: 'Quantas vezes a mesma pessoa pode usar',
              min: 1,
              admin: { width: '50%', description: 'Vazio = sem limite.' },
            },
          ],
        },
      ],
    },

    {
      type: 'collapsible',
      label: 'Para quem e para quê',
      admin: {
        description: 'Deixe tudo vazio para o cupom valer no carrinho inteiro, para qualquer pessoa.',
      },
      fields: [
        {
          name: 'produtos',
          type: 'relationship',
          relationTo: 'products',
          hasMany: true,
          label: 'Só nestes produtos',
        },
        {
          name: 'categorias',
          type: 'relationship',
          relationTo: 'categories',
          hasMany: true,
          label: 'Só nestas categorias',
        },
        {
          name: 'emailsPermitidos',
          type: 'array',
          label: 'Só para estes e-mails',
          labels: { singular: 'E-mail', plural: 'E-mails' },
          admin: {
            description:
              'Para um cupom de empresa, dá para liberar o domínio inteiro escrevendo *@empresa.com.br.',
          },
          fields: [{ name: 'email', type: 'text', label: 'E-mail ou domínio', required: true }],
        },
      ],
    },

    {
      name: 'observacao',
      type: 'textarea',
      label: 'Anotação',
      admin: { description: 'Só para você: o que foi combinado, com quem e quando.' },
    },
  ],
}
