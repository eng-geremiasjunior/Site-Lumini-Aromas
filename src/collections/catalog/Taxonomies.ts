import type { CollectionConfig } from 'payload'

import { admins, anyone } from '../../access/roles.ts'
import { slugField } from '../../fields/slug.ts'

/**
 * Categoria por TIPO de produto: Velas em vidro, Velas em madeira,
 * Difusores, Potes de mel, Sal de parrilla.
 *
 * No WooCommerce as 12 categorias misturam tipo de produto com ocasião
 * ("Batizado" convivendo com "Aromatizador"), e duas estão vazias.
 * Aqui tipo e ocasião são listas separadas, e um produto pertence a um
 * tipo e a várias ocasiões.
 */
export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Categoria', plural: 'Categorias' },
  admin: {
    group: 'Catálogo',
    useAsTitle: 'name',
    defaultColumns: ['name', 'parent', 'sortOrder'],
    description: 'Tipo de produto. Ex.: Velas em vidro, Difusores.',
  },
  access: { read: anyone, create: admins, update: admins, delete: admins },
  defaultSort: 'sortOrder',
  fields: [
    { name: 'name', type: 'text', label: 'Nome', required: true },
    slugField(),
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      label: 'Categoria acima',
      admin: { description: 'Deixe vazio se for uma categoria principal.' },
    },
    { name: 'description', type: 'textarea', label: 'Descrição' },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Imagem de capa' },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Ordem',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
    {
      name: 'legacyWooId',
      type: 'number',
      label: 'ID no WooCommerce',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}

/**
 * Ocasião do evento. É como a cliente procura ("lembrancinha de casamento"),
 * e vira página própria, filtro e `custom_label_0` nos feeds do Google e da Meta.
 */
export const Occasions: CollectionConfig = {
  slug: 'occasions',
  labels: { singular: 'Ocasião', plural: 'Ocasiões' },
  admin: {
    group: 'Catálogo',
    useAsTitle: 'name',
    defaultColumns: ['name', 'sortOrder'],
    description: 'Casamento, bodas, 15 anos, batizado, maternidade, corporativo.',
  },
  access: { read: anyone, create: admins, update: admins, delete: admins },
  defaultSort: 'sortOrder',
  fields: [
    { name: 'name', type: 'text', label: 'Nome', required: true },
    slugField(),
    {
      name: 'headline',
      type: 'text',
      label: 'Chamada da página',
      admin: { description: 'Ex.: "Lembrancinhas de casamento feitas à mão".' },
    },
    { name: 'description', type: 'textarea', label: 'Texto da página' },
    { name: 'heroImage', type: 'upload', relationTo: 'media', label: 'Imagem principal' },
    {
      name: 'suggestedLots',
      type: 'text',
      label: 'Lotes sugeridos',
      admin: {
        description:
          'Ex.: "60 a 200 peças". Aparece como orientação de quantidade para este tipo de evento.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Ordem',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
  ],
}

/**
 * Tags livres. O site atual tem 156 tags e só 9 em uso; na migração
 * entram apenas as que realmente marcam produtos.
 */
export const Tags: CollectionConfig = {
  slug: 'tags',
  labels: { singular: 'Tag', plural: 'Tags' },
  admin: {
    group: 'Catálogo',
    useAsTitle: 'name',
    description: 'Palavras-chave livres. Use com parcimônia.',
  },
  access: { read: anyone, create: admins, update: admins, delete: admins },
  fields: [{ name: 'name', type: 'text', label: 'Nome', required: true }, slugField()],
}
