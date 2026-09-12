import type { CollectionConfig } from 'payload'

import { admins, owner } from '../../access/roles.ts'

/**
 * Eventos que já aconteceram.
 *
 * O cadastro que alimenta a prova social. É um só de propósito: se cada
 * forma de mostrar prova tivesse o seu próprio cadastro, manter tudo virava
 * tarefa semanal — e tarefa semanal de quem opera sozinho morre em duas
 * semanas.
 *
 * Você registra uma vez o casamento da Marina, em Juiz de Fora, com as duas
 * fotos que ela mandou, e isso aparece na página dos produtos ligados.
 *
 * O abastecimento já está engatilhado: o e-mail de "pedido entregue" pede a
 * foto e avisa que só publicamos com autorização.
 */
export const Events: CollectionConfig = {
  slug: 'events',
  labels: { singular: 'Evento', plural: 'Eventos realizados' },
  admin: {
    group: 'Catálogo',
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'tipo', 'cidade', 'quando', 'autorizado'],
    description: 'Eventos de clientes, usados como prova social na página do produto.',
  },
  access: {
    // A vitrine lê, mas só o que estiver autorizado — a regra está na consulta.
    read: () => true,
    create: admins,
    update: admins,
    delete: owner,
  },
  fields: [
    {
      name: 'titulo',
      type: 'text',
      label: 'Como você chama este evento',
      required: true,
      admin: { description: 'Só para você encontrar depois. Ex.: "Casamento Marina e Téo".' },
    },
    {
      name: 'autorizado',
      type: 'checkbox',
      label: 'A cliente autorizou a publicação',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Sem isto marcado, nada deste evento aparece no site. Foto de festa de cliente é dado pessoal: publicar sem autorização é problema, não é marketing.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'tipo',
          type: 'select',
          label: 'Tipo',
          required: true,
          options: [
            { label: 'Casamento', value: 'Casamento' },
            { label: 'Bodas', value: 'Bodas' },
            { label: '15 anos', value: '15 anos' },
            { label: 'Batizado', value: 'Batizado' },
            { label: 'Maternidade', value: 'Maternidade' },
            { label: 'Aniversário', value: 'Aniversário' },
            { label: 'Corporativo', value: 'Corporativo' },
          ],
          admin: { width: '33%' },
        },
        {
          name: 'cidade',
          type: 'text',
          label: 'Cidade',
          admin: { width: '34%', description: 'Ex.: Juiz de Fora. Sem o estado.' },
        },
        {
          name: 'quando',
          type: 'date',
          label: 'Quando aconteceu',
          admin: { width: '33%', description: 'Só o mês aparece no site.' },
        },
      ],
    },
    {
      name: 'produtos',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      label: 'Peças que foram para este evento',
      admin: {
        description: 'A prova aparece na página destes produtos, e só deles.',
      },
    },
    {
      name: 'fotos',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      label: 'Fotos do evento',
      admin: {
        description:
          'A primeira é a que entra na galeria do produto. Escolha a melhor: uma foto ruim ao lado das suas fotos de estúdio subtrai em vez de somar.',
      },
    },
    {
      name: 'nomeDaCliente',
      type: 'text',
      label: 'Nome da cliente',
      admin: {
        description:
          'Guardado só para o seu controle. O site mostra tipo, cidade e mês — nunca o nome.',
      },
    },
    {
      name: 'depoimento',
      type: 'textarea',
      label: 'O que ela disse',
      admin: { description: 'Guardado para uso futuro. Ainda não aparece na página do produto.' },
    },
  ],
}
