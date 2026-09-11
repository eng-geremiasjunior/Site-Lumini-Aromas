import type { CollectionConfig } from 'payload'

import { admins, anyone } from '../../access/roles.ts'
import { slugField } from '../../fields/slug.ts'

/**
 * Opções reutilizáveis entre produtos: Aroma, Flor, Cor do laço.
 * Equivale aos atributos globais (`pa_aroma`, `pa_flor`) do WooCommerce.
 *
 * Quantidade NÃO é atributo aqui: as faixas de lote são calculadas pelo
 * motor de preço, e não cadastradas uma a uma como no WooCommerce.
 */
export const Attributes: CollectionConfig = {
  slug: 'attributes',
  labels: { singular: 'Opção', plural: 'Opções (aroma, flor...)' },
  admin: {
    group: 'Catálogo',
    useAsTitle: 'name',
    defaultColumns: ['name', 'displayType', 'updatedAt'],
    description: 'Listas reutilizadas em vários produtos, como os aromas.',
  },
  access: { read: anyone, create: admins, update: admins, delete: admins },
  fields: [
    { name: 'name', type: 'text', label: 'Nome', required: true },
    slugField(),
    {
      name: 'displayType',
      type: 'select',
      label: 'Como aparece na página do produto',
      defaultValue: 'button',
      options: [
        { label: 'Botões com o nome', value: 'button' },
        { label: 'Miniaturas com foto', value: 'image' },
        { label: 'Bolinhas de cor', value: 'color' },
        { label: 'Lista suspensa', value: 'select' },
      ],
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Descrição',
      admin: { description: 'Opcional. Aparece como ajuda ao cliente.' },
    },
  ],
}

/**
 * Valores de cada opção: Bamboo, Capim Limão, Lavanda...
 * A Flor da mini vela na bolacha de madeira usa foto em cada valor,
 * no lugar dos números 1 a 12 que o site atual mostra.
 */
export const AttributeTerms: CollectionConfig = {
  slug: 'attribute-terms',
  labels: { singular: 'Valor da opção', plural: 'Valores das opções' },
  admin: {
    group: 'Catálogo',
    useAsTitle: 'name',
    defaultColumns: ['name', 'attribute', 'sortOrder'],
    description: 'Ex.: os aromas Bamboo, Lavanda, Vanilla.',
  },
  access: { read: anyone, create: admins, update: admins, delete: admins },
  defaultSort: 'sortOrder',
  fields: [
    {
      name: 'attribute',
      type: 'relationship',
      relationTo: 'attributes',
      label: 'Pertence à opção',
      required: true,
      index: true,
    },
    { name: 'name', type: 'text', label: 'Nome', required: true },
    slugField(),
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Foto',
      admin: { description: 'Usada quando a opção aparece como miniatura, ex.: modelos de flor.' },
    },
    {
      name: 'colorHex',
      type: 'text',
      label: 'Cor',
      admin: {
        description: 'Usada quando a opção aparece como bolinha de cor. Ex.: #E8D9C5.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Ordem',
      defaultValue: 0,
      admin: { position: 'sidebar', description: 'Menor aparece primeiro.' },
    },
    {
      name: 'legacyWooTermId',
      type: 'number',
      label: 'ID no WooCommerce',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Preenchido pela migração. Não editar.',
      },
    },
  ],
}
