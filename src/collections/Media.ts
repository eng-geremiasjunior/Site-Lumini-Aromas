import type { CollectionConfig } from 'payload'

import { admins, anyone } from '../access/roles.ts'

/**
 * Biblioteca de mídia: fotos de produto, fotos de aromas e flores,
 * logos enviados pelos clientes e provas de arte.
 *
 * Em produção os arquivos vão para o Cloudflare R2 (egress zero).
 * Uploads grandes usam URL pré-assinada, porque o corpo de uma função
 * da Vercel para em 4,5 MB.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Arquivo', plural: 'Mídia' },
  admin: {
    group: 'Catálogo',
    description: 'Fotos dos produtos e arquivos enviados pelos clientes.',
    useAsTitle: 'filename',
  },
  access: {
    read: anyone,
    create: admins,
    update: admins,
    delete: admins,
  },
  upload: {
    mimeTypes: ['image/*', 'application/pdf'],
    // O Google Merchant exige no mínimo 500x500 e recomenda 1500x1500.
    // A partir de 31/01/2027 imagens menores que 500x500 são reprovadas.
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 400, position: 'centre' },
      { name: 'card', width: 800, height: 800, position: 'centre' },
      { name: 'feed', width: 1500, height: 1500, position: 'centre' },
    ],
    focalPoint: true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Texto alternativo',
      required: true,
      admin: {
        description:
          'Descreva a foto em poucas palavras. Ajuda no Google e em leitores de tela. Ex.: "Vela aromática em bomboniere de cristal com laço de cetim".',
      },
    },
    {
      name: 'credit',
      type: 'text',
      label: 'Crédito / cliente',
      admin: {
        description: 'Opcional. Se a foto é de um evento real, registre de quem é a autorização.',
      },
    },
    {
      name: 'kind',
      type: 'select',
      label: 'Tipo',
      defaultValue: 'produto',
      options: [
        { label: 'Foto de produto', value: 'produto' },
        { label: 'Foto de evento real', value: 'evento' },
        { label: 'Logo enviado pelo cliente', value: 'logo_cliente' },
        { label: 'Prova de arte', value: 'prova_arte' },
        { label: 'Outro', value: 'outro' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
