import type { CollectionConfig } from 'payload'

import { admins, owner } from '../../access/roles.ts'

/**
 * As campanhas de anúncio.
 *
 * Existem para o custo de tráfego deixar de ser um número só no fim do mês
 * e virar uma resposta por campanha: quanto custou, quanto alcançou, quantos
 * cliques trouxe e quanto custou cada resultado.
 *
 * Ninguém cadastra campanha à mão: elas nascem quando o relatório é colado
 * em **Financeiro › Importar anúncios**. O cadastro existe para dar um lugar
 * estável a cada campanha — assim setembro e outubro da mesma campanha
 * ficam na mesma linha do tempo, mesmo que o nome mude na plataforma.
 */
export const Campaigns: CollectionConfig = {
  slug: 'campaigns',
  labels: { singular: 'Campanha', plural: 'Campanhas' },
  admin: {
    group: 'Financeiro',
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'plataforma', 'objetivo', 'ativa'],
    description: 'Criadas sozinhas ao importar o relatório de anúncios.',
  },
  access: {
    read: admins,
    create: admins,
    update: admins,
    delete: owner,
  },
  fields: [
    {
      name: 'nome',
      type: 'text',
      label: 'Nome da campanha',
      required: true,
      admin: { description: 'Exatamente como aparece na plataforma, para o vínculo se manter.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'plataforma',
          type: 'select',
          label: 'Plataforma',
          required: true,
          defaultValue: 'Meta',
          options: [
            { label: 'Meta (Instagram e Facebook)', value: 'Meta' },
            { label: 'Google', value: 'Google' },
            { label: 'Outra', value: 'Outros' },
          ],
          admin: { width: '34%' },
        },
        {
          name: 'objetivo',
          type: 'select',
          label: 'Objetivo',
          options: [
            { label: 'Conversas no WhatsApp', value: 'mensagens' },
            { label: 'Venda no site', value: 'venda' },
            { label: 'Remarketing', value: 'remarketing' },
            { label: 'Visitas e reconhecimento', value: 'alcance' },
          ],
          admin: { width: '33%' },
        },
        {
          name: 'ativa',
          type: 'checkbox',
          label: 'Rodando',
          defaultValue: true,
          admin: { width: '33%' },
        },
      ],
    },
    {
      name: 'idExterno',
      type: 'text',
      label: 'Identificador na plataforma',
      admin: {
        description:
          'Preenchido sozinho quando a integração com a API existir. Serve para o vínculo sobreviver a uma troca de nome.',
      },
    },
    {
      name: 'observacao',
      type: 'textarea',
      label: 'Observação',
      admin: { description: 'O que você testou nessa campanha, para lembrar daqui a três meses.' },
    },
  ],
}
