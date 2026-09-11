import type { CollectionConfig } from 'payload'

import { admins, anyone } from '../../access/roles.ts'
import { money } from '../../fields/money.ts'
import { slugField } from '../../fields/slug.ts'

/**
 * Acabamentos vendidos junto com o lote: caixa de acetato, laço de cetim,
 * flores secas, tag, cartão manuscrito, lacre de cera.
 *
 * O preço é por peça e multiplica pela quantidade do lote, como fazem as
 * bombonieres italianas. Um acabamento com preço fixo (ex.: criação de arte
 * especial) usa o outro campo.
 */
export const Addons: CollectionConfig = {
  slug: 'addons',
  labels: { singular: 'Acabamento', plural: 'Acabamentos' },
  admin: {
    group: 'Catálogo',
    useAsTitle: 'name',
    defaultColumns: ['name', 'pricePerUnit', 'flatPrice', 'active'],
    description: 'Itens cobrados à parte, como laço, caixa e flores secas.',
  },
  access: { read: anyone, create: admins, update: admins, delete: admins },
  fields: [
    { name: 'name', type: 'text', label: 'Nome', required: true },
    slugField(),
    {
      name: 'description',
      type: 'textarea',
      label: 'Descrição',
      admin: { description: 'Aparece ao lado da opção na página do produto.' },
    },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Foto' },
    money({
      name: 'pricePerUnit',
      label: 'Preço por peça',
      admin: {
        description:
          'Multiplica pela quantidade do lote. Ex.: R$ 1,50 por peça em 60 peças = R$ 90,00.',
      },
    }),
    money({
      name: 'flatPrice',
      label: 'Preço fixo',
      admin: {
        description: 'Cobrado uma vez por pedido, independente da quantidade. Use um ou outro.',
      },
    }),
    {
      name: 'active',
      type: 'checkbox',
      label: 'Disponível',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
  ],
}
