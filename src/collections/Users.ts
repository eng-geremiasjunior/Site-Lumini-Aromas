import type { CollectionConfig } from 'payload'

import { ROLE_OPTIONS, owner, staff } from '../access/roles.ts'

/**
 * Equipe da Lumini. Clientes ficam na coleção `customers`, separada,
 * para que quem compra nunca tenha acesso ao painel.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Usuário da equipe', plural: 'Equipe' },
  admin: {
    group: 'Configurações',
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'updatedAt'],
    description: 'Quem pode entrar no painel e o que cada pessoa enxerga.',
  },
  auth: {
    tokenExpiration: 60 * 60 * 8, // 8 horas
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000, // 10 minutos
  },
  access: {
    read: staff,
    create: owner,
    update: ({ req, id }) => {
      const user = req.user as { id?: string | number; role?: string } | undefined
      if (user?.role === 'dono') return true
      // Cada pessoa pode editar o próprio cadastro.
      return user?.id ? String(user.id) === String(id) : false
    },
    delete: owner,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Nome',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      label: 'Papel',
      required: true,
      defaultValue: 'atendente',
      options: ROLE_OPTIONS,
      access: {
        // Ninguém se promove sozinho: só o dono muda papéis.
        update: ({ req }) => (req.user as { role?: string } | undefined)?.role === 'dono',
      },
      admin: {
        description:
          'Dono: acesso total. Atendente: pedidos, clientes e orçamentos. Designer: só personalização e prova de arte.',
      },
    },
    {
      name: 'whatsapp',
      type: 'text',
      label: 'WhatsApp',
      admin: { description: 'Opcional. Para receber avisos de pedido novo.' },
    },
    {
      name: 'notifyOnNewOrder',
      type: 'checkbox',
      label: 'Avisar por e-mail a cada pedido novo',
      defaultValue: false,
    },
  ],
}
