import type { CollectionConfig } from 'payload'

import { admins, owner } from '../../access/roles.ts'
import { money } from '../../fields/money.ts'
import { gerarCodigo, validadePadrao } from '../../commerce/giftcards/gift-card.ts'

/**
 * Cartões-presente.
 *
 * Cada linha é dinheiro que já entrou por mercadoria que ainda não saiu.
 * Enquanto o saldo não zera, aquele valor é obrigação da loja, não receita
 * do mês — e é por isso que o cartão tem coleção própria, com saldo e
 * histórico, em vez de ser um cupom com outro nome.
 *
 * O valor de face nunca muda. O que muda é o saldo, a cada uso.
 */
export const GiftCards: CollectionConfig = {
  slug: 'gift-cards',
  labels: { singular: 'Cartão-presente', plural: 'Cartões-presente' },
  admin: {
    group: 'Vendas',
    useAsTitle: 'codigo',
    defaultColumns: ['codigo', 'valorCentavos', 'saldoCentavos', 'situacao', 'validoAte'],
    description: 'Vales comprados para presentear. O saldo diminui conforme a pessoa usa.',
  },
  access: {
    read: admins,
    create: admins,
    update: admins,
    delete: owner,
  },
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === 'create') {
          if (!data.codigo) data.codigo = gerarCodigo()
          // O saldo nasce igual ao valor de face. Quem emite não precisa
          // preencher os dois, e não existe cartão nascendo torto.
          if (data.saldoCentavos === undefined || data.saldoCentavos === null) {
            data.saldoCentavos = data.valorCentavos ?? 0
          }
          if (!data.validoAte) data.validoAte = validadePadrao()
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'codigo',
      type: 'text',
      label: 'Código',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: 'Gerado sozinho. É o que a pessoa digita no carrinho.',
      },
    },
    {
      name: 'situacao',
      type: 'select',
      label: 'Situação',
      required: true,
      defaultValue: 'ativo',
      options: [
        { label: 'Ativo', value: 'ativo' },
        { label: 'Usado por inteiro', value: 'usado' },
        { label: 'Vencido', value: 'expirado' },
        { label: 'Cancelado', value: 'cancelado' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      type: 'row',
      fields: [
        money({
          name: 'valorCentavos',
          label: 'Valor do cartão',
          required: true,
          admin: {
            width: '50%',
            description: 'Use um valor que compre um lote inteiro, tirado da tabela do produto.',
          },
        }),
        money({
          name: 'saldoCentavos',
          label: 'Saldo',
          admin: { width: '50%', readOnly: true, description: 'Diminui a cada uso.' },
        }),
      ],
    },
    {
      name: 'validoAte',
      type: 'date',
      label: 'Válido até',
      admin: {
        description:
          'Um ano por padrão. Prazo curto em cartão-presente é tratado como cláusula abusiva, e aqui a cliente compra para um evento que às vezes é daqui a seis meses.',
      },
    },

    {
      type: 'collapsible',
      label: 'Quem deu e quem recebeu',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'de', type: 'text', label: 'De parte de', admin: { width: '50%' } },
            { name: 'para', type: 'text', label: 'Para', admin: { width: '50%' } },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'emailDoComprador',
              type: 'email',
              label: 'E-mail de quem comprou',
              admin: { width: '50%' },
            },
            {
              name: 'emailDoDestinatario',
              type: 'email',
              label: 'E-mail de quem recebe',
              admin: { width: '50%', description: 'Para onde o cartão é enviado.' },
            },
          ],
        },
        { name: 'mensagem', type: 'textarea', label: 'Recado' },
        {
          name: 'enviarEm',
          type: 'date',
          label: 'Enviar em',
          admin: {
            description: 'Deixe vazio para enviar assim que o pagamento for confirmado.',
          },
        },
        {
          name: 'enviadoEm',
          type: 'date',
          label: 'Enviado em',
          admin: { readOnly: true },
        },
      ],
    },

    {
      name: 'pedidoDeCompra',
      type: 'relationship',
      relationTo: 'orders',
      label: 'Pedido em que foi comprado',
      admin: {
        position: 'sidebar',
        description: 'Vazio quando o cartão foi emitido à mão, numa venda de WhatsApp.',
      },
    },
    {
      name: 'usos',
      type: 'array',
      label: 'Onde foi usado',
      admin: { readOnly: true, description: 'Cada abatimento, na ordem.' },
      fields: [
        { name: 'em', type: 'date', label: 'Quando' },
        { name: 'pedido', type: 'text', label: 'Pedido' },
        money({ name: 'valorCentavos', label: 'Valor usado' }),
        money({ name: 'saldoDepois', label: 'Saldo depois' }),
      ],
    },
    {
      name: 'observacao',
      type: 'textarea',
      label: 'Anotação',
      admin: { description: 'Só para você.' },
    },
  ],
}
