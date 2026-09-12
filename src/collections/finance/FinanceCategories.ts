import type { CollectionConfig } from 'payload'

import { admins, owner } from '../../access/roles.ts'

/**
 * As categorias do financeiro.
 *
 * Existem para o lançamento do dia a dia ser uma escolha, e não uma
 * digitação. "Anúncios Instagram", "Anuncios instagram" e "ADS insta" são a
 * mesma despesa, mas viram três linhas diferentes no relatório — e o gráfico
 * do mês deixa de fazer sentido. Cadastrando uma vez, o erro some.
 *
 * O grupo do DRE mora aqui, e não no lançamento: assim, ao lançar, não é
 * preciso saber o que é "despesa variável" e o que é "custo fixo". Isso se
 * decide uma vez, quando a categoria nasce.
 */
export const FinanceCategories: CollectionConfig = {
  slug: 'finance-categories',
  labels: { singular: 'Categoria financeira', plural: 'Categorias financeiras' },
  admin: {
    group: 'Financeiro',
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'grupo', 'plataforma'],
    description: 'As gavetas onde cada despesa e cada entrada é guardada.',
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
      label: 'Nome',
      required: true,
      admin: { description: 'Como você chama essa despesa no dia a dia. Ex.: Anúncios Instagram.' },
    },
    {
      name: 'grupo',
      type: 'select',
      label: 'Onde entra no resultado',
      required: true,
      defaultValue: 'fixa',
      options: [
        { label: 'Entrada que não é venda (ex.: venda de sobra, reembolso recebido)', value: 'receita' },
        { label: 'Devolução ao cliente (reembolso, cancelamento)', value: 'deducao' },
        {
          label: 'Custo que só existe quando vende (embalagem de envio, taxa, frete pago)',
          value: 'variavel',
        },
        { label: 'Tráfego e divulgação', value: 'marketing' },
        { label: 'Custo fixo do mês (aluguel, energia, assinatura, pró-labore)', value: 'fixa' },
        { label: 'Juros e tarifas de banco', value: 'financeira' },
      ],
      admin: {
        description:
          'Define em que linha do relatório essa categoria aparece. Na dúvida entre variável e fixa: variável é o que só acontece porque houve venda.',
      },
    },
    {
      name: 'plataforma',
      type: 'select',
      label: 'Plataforma',
      options: [
        { label: 'Meta (Instagram e Facebook)', value: 'Meta' },
        { label: 'Google', value: 'Google' },
        { label: 'Outra', value: 'Outros' },
      ],
      admin: {
        condition: (_, irmaos) => irmaos?.grupo === 'marketing',
        description:
          'Separa o investimento por canal no relatório. É o que mostra se o remarketing do Google se paga.',
      },
    },
    {
      name: 'observacao',
      type: 'textarea',
      label: 'Observação',
      admin: { description: 'Opcional. Serve de lembrete para você e para o contador.' },
    },
  ],
}
