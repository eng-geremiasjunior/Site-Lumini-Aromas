import type { CollectionConfig } from 'payload'

import { admins, owner } from '../../access/roles.ts'
import { money } from '../../fields/money.ts'

/**
 * Os lançamentos do financeiro.
 *
 * Aqui entra **só o que não vem de pedido**. Receita, imposto, custo do
 * produto e taxa do cartão são lidos direto dos pedidos pagos, e lançar
 * isso à mão contaria a mesma coisa duas vezes — que é como um DRE começa a
 * mentir.
 *
 * O que entra aqui: o investimento em anúncio, o aluguel, a energia, a
 * assinatura, o pró-labore, a tarifa do banco. O que o mês custa
 * independentemente de ter vendido.
 *
 * ## Competência e caixa
 *
 * "Mês de referência" é o mês a que a despesa **pertence**: a energia de
 * agosto é de agosto, mesmo paga em setembro. "Data do pagamento" é quando
 * o dinheiro saiu. O DRE usa a primeira; o fluxo de caixa usa a segunda.
 * Quem mistura as duas fecha um mês ótimo achando que foi ruim.
 */
export const LedgerEntries: CollectionConfig = {
  slug: 'ledger-entries',
  labels: { singular: 'Lançamento', plural: 'Lançamentos' },
  admin: {
    group: 'Financeiro',
    useAsTitle: 'descricao',
    defaultColumns: ['descricao', 'categoria', 'valor', 'competencia', 'pagoEm'],
    description: 'Despesas e entradas que não vêm de um pedido.',
  },
  access: {
    read: admins,
    create: admins,
    update: admins,
    delete: owner,
  },
  fields: [
    {
      name: 'descricao',
      type: 'text',
      label: 'Descrição',
      required: true,
      admin: { description: 'Ex.: Campanha de setembro no Instagram.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'categoria',
          type: 'relationship',
          relationTo: 'finance-categories',
          label: 'Categoria',
          required: true,
          admin: { width: '50%' },
        },
        money({
          name: 'valor',
          label: 'Valor',
          required: true,
          admin: { width: '50%', description: 'Sempre positivo. O relatório já sabe se soma ou subtrai.' },
        }),
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'competencia',
          type: 'date',
          label: 'Mês de referência',
          required: true,
          admin: {
            width: '50%',
            date: { pickerAppearance: 'monthOnly', displayFormat: 'MM/yyyy' },
            description: 'A que mês esta despesa pertence. É o que vale no resultado.',
          },
        },
        {
          name: 'pagoEm',
          type: 'date',
          label: 'Data do pagamento',
          admin: {
            width: '50%',
            date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' },
            description: 'Quando o dinheiro saiu de fato. Deixe em branco se ainda não pagou.',
          },
        },
      ],
    },
    {
      name: 'campanha',
      type: 'relationship',
      relationTo: 'campaigns',
      label: 'Campanha',
      admin: {
        description:
          'Preenchido sozinho ao importar o relatório de anúncios. Um lançamento por campanha, por mês.',
      },
    },
    {
      name: 'desempenho',
      type: 'group',
      label: 'O que a campanha entregou',
      admin: {
        condition: (_, irmaos) => Boolean(irmaos?.campanha),
        description:
          'Vem junto do relatório colado. Custo por clique e por resultado são calculados a partir daqui, e não copiados — assim continuam batendo com o valor lançado.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'alcance',
              type: 'number',
              label: 'Alcance',
              min: 0,
              admin: { width: '25%', description: 'Pessoas distintas.' },
            },
            {
              name: 'impressoes',
              type: 'number',
              label: 'Impressões',
              min: 0,
              admin: { width: '25%' },
            },
            { name: 'cliques', type: 'number', label: 'Cliques', min: 0, admin: { width: '25%' } },
            {
              name: 'resultados',
              type: 'number',
              label: 'Resultados',
              min: 0,
              admin: { width: '25%', description: 'Conversas, cadastros ou compras.' },
            },
          ],
        },
      ],
    },
    {
      name: 'origem',
      type: 'select',
      label: 'Origem',
      defaultValue: 'manual',
      options: [
        { label: 'Digitado', value: 'manual' },
        { label: 'Importado do relatório de anúncios', value: 'importado' },
      ],
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Lançamento importado é substituído ao importar o mesmo mês de novo.',
      },
    },
    {
      name: 'comprovante',
      type: 'upload',
      relationTo: 'media',
      label: 'Comprovante',
      admin: { description: 'Nota, recibo ou print. Opcional, mas ajuda no fechamento com o contador.' },
    },
    {
      name: 'pedido',
      type: 'relationship',
      relationTo: 'orders',
      label: 'Pedido relacionado',
      admin: {
        description: 'Só quando a despesa é de um pedido específico. Ex.: um frete extra combinado.',
      },
    },
    {
      name: 'observacao',
      type: 'textarea',
      label: 'Observação',
    },
  ],
}
