import type { CollectionConfig } from 'payload'

import { admins, owner } from '../../access/roles.ts'

/**
 * Caixa de saída.
 *
 * Cada linha é uma consequência de um pedido esperando sair: um e-mail para
 * a cliente, uma conversão para a Meta, um lançamento no DRE.
 *
 * Existe para que falha de integração seja visível. No site atual, quando a
 * Meta não recebia a conversão, ninguém ficava sabendo: a venda acontecia,
 * o anúncio não aprendia nada e o relatório mentia. Aqui a falha vira uma
 * linha vermelha com o erro do lado e um botão de tentar de novo.
 */
export const IntegrationEvents: CollectionConfig = {
  slug: 'integration-events',
  labels: { singular: 'Envio', plural: 'Envios automáticos' },
  admin: {
    group: 'Configurações',
    useAsTitle: 'dedupeKey',
    defaultColumns: ['tipo', 'situacao', 'tentativas', 'order', 'createdAt'],
    description:
      'Tudo que a loja envia sozinha: e-mails para a cliente e dados para Meta e Google. Se algo falhar, aparece aqui.',
  },
  access: {
    read: admins,
    create: admins,
    update: admins,
    delete: owner,
  },
  fields: [
    {
      name: 'tipo',
      type: 'select',
      label: 'O que é',
      required: true,
      options: [
        { label: 'E-mail para o cliente', value: 'email' },
        { label: 'Emissão de cartão-presente', value: 'cartao_presente' },
        { label: 'Conversão para a Meta', value: 'meta_capi' },
        { label: 'Evento para o Google Analytics', value: 'ga4' },
        { label: 'Conversão para o Google Ads', value: 'google_ads' },
        { label: 'Mensagem de WhatsApp', value: 'whatsapp' },
        { label: 'Lançamento financeiro', value: 'dre' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'situacao',
      type: 'select',
      label: 'Situação',
      required: true,
      defaultValue: 'pendente',
      options: [
        { label: 'Na fila', value: 'pendente' },
        { label: 'Enviado', value: 'enviado' },
        { label: 'Falhou, vai tentar de novo', value: 'falhou' },
        { label: 'Desistiu — precisa de você', value: 'desistiu' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      label: 'Pedido',
      admin: { position: 'sidebar' },
    },
    {
      name: 'dedupeKey',
      type: 'text',
      label: 'Identificação do envio',
      required: true,
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description:
          'Impede o mesmo aviso de sair duas vezes quando o mesmo fato chega repetido — o webhook do Mercado Pago faz isso com frequência.',
      },
    },
    {
      name: 'payload',
      type: 'json',
      label: 'Conteúdo',
      admin: { readOnly: true },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'tentativas',
          type: 'number',
          label: 'Tentativas',
          defaultValue: 0,
          admin: { width: '33%', readOnly: true },
        },
        {
          name: 'proximaTentativaEm',
          type: 'date',
          label: 'Próxima tentativa',
          admin: { width: '33%', readOnly: true },
        },
        {
          name: 'enviadoEm',
          type: 'date',
          label: 'Enviado em',
          admin: { width: '34%', readOnly: true },
        },
      ],
    },
    {
      name: 'erro',
      type: 'textarea',
      label: 'O que deu errado',
      admin: {
        readOnly: true,
        description: 'A resposta que o serviço devolveu na última tentativa.',
      },
    },
    {
      name: 'reenviar',
      type: 'checkbox',
      label: 'Tentar enviar de novo',
      defaultValue: false,
      admin: {
        description: 'Marque e salve para colocar este envio de volta na fila.',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        // O botão de reenviar é só isso: devolve para a fila e zera a espera.
        if (data.reenviar) {
          data.reenviar = false
          data.situacao = 'pendente'
          data.proximaTentativaEm = null
          data.erro = null
        }
        return data
      },
    ],
  },
}
