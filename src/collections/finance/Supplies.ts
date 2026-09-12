import type { CollectionConfig } from 'payload'

import { admins, owner } from '../../access/roles.ts'
import { money } from '../../fields/money.ts'
import { faixaDePrecos, precoMedio, ultimoPreco, type Insumo } from '../../commerce/materials/materiais.ts'
import { formatarReais } from '../../commerce/format/mascaras.ts'

/**
 * Os insumos.
 *
 * O que se compra e o que se usa estão em unidades diferentes: a cera vem
 * em quilo e vai em mililitro no copo; o pavio vem em caixa de 50 e vai um
 * por peça; a fita vem em rolo e vai em centímetros. Cadastrar as duas
 * unidades aqui é o que permite a lista de compras sair pronta, em vez de
 * a conversão ser feita de cabeça a cada pedido.
 *
 * **O preço não é um campo.** O quilo da cera é comprado entre R$ 24 e
 * R$ 30, e guardar um número fixo daria um custo errado quase sempre. O que
 * se guarda é o histórico de compras; o preço é derivado dele — o último
 * para estimar a próxima compra, o médio ponderado para custear o que já
 * foi vendido.
 */
export const Supplies: CollectionConfig = {
  slug: 'supplies',
  labels: { singular: 'Insumo', plural: 'Insumos' },
  admin: {
    group: 'Financeiro',
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'unidadeDeCompra', 'precoAtual', 'estoqueAtual'],
    description: 'Cera, vidro, pavio, fita, essência, caixa. O que entra na peça.',
  },
  access: {
    read: admins,
    create: admins,
    update: admins,
    delete: owner,
  },
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        // Registrar a compra da cera mais cara atualiza sozinho o custo das
        // velas que a usam. É o que evita a margem do DRE envelhecer em
        // silêncio por meses.
        const { recalcularCustoDosProdutos } = await import('../../commerce/materials/ficha.ts')

        // O `req` vai junto para as consultas entrarem na mesma transação:
        // sem ele, a leitura do insumo aconteceria em outra conexão e
        // enxergaria o preço de antes da compra que acabou de ser gravada.
        await recalcularCustoDosProdutos(
          req.payload as unknown as Parameters<typeof recalcularCustoDosProdutos>[0],
          { insumoId: String(doc.id), req },
        ).catch((erro: unknown) => {
          req.payload.logger.error(
            { erro },
            'Não foi possível recalcular o custo dos produtos deste insumo.',
          )
        })
      },
    ],
  },
  fields: [
    {
      name: 'nome',
      type: 'text',
      label: 'Nome',
      required: true,
      admin: { description: 'Ex.: Cera de soja, Copo de vidro 70 ml, Fita verde oliva.' },
    },

    {
      type: 'row',
      fields: [
        {
          name: 'unidadeDeUso',
          type: 'select',
          label: 'Como é usado',
          required: true,
          defaultValue: 'un',
          options: [
            { label: 'Por unidade (copo, pavio, caixinha)', value: 'un' },
            { label: 'Em gramas (cera)', value: 'g' },
            { label: 'Em mililitros (essência)', value: 'ml' },
            { label: 'Em centímetros (fita)', value: 'cm' },
          ],
          admin: { width: '50%' },
        },
        {
          name: 'unidadeDeCompra',
          type: 'select',
          label: 'Como é comprado',
          required: true,
          defaultValue: 'unidade',
          options: [
            { label: 'Unidade', value: 'unidade' },
            { label: 'Quilo', value: 'kg' },
            { label: 'Litro', value: 'litro' },
            { label: 'Metro', value: 'metro' },
            { label: 'Rolo', value: 'rolo' },
            { label: 'Caixa', value: 'caixa' },
          ],
          admin: { width: '50%' },
        },
      ],
    },

    {
      name: 'quantidadePorEmbalagem',
      type: 'number',
      label: 'Quanto vem em uma compra',
      required: true,
      min: 0,
      defaultValue: 1,
      admin: {
        description:
          'Na unidade de uso. Um quilo de cera = 1000 (gramas). Uma caixa de pavio com 50 = 50 (unidades). Um rolo de fita de 50 metros = 5000 (centímetros). Um litro de essência = 1000 (mililitros).',
      },
    },

    {
      type: 'row',
      fields: [
        {
          name: 'perdaPercentual',
          type: 'number',
          label: 'Perda (%)',
          min: 0,
          max: 100,
          defaultValue: 0,
          admin: {
            width: '50%',
            description:
              'Resíduo na panela, evaporação, manuseio. Cera e essência têm; vidro não tem.',
          },
        },
        {
          name: 'densidade',
          type: 'number',
          label: 'Densidade (g/ml)',
          admin: {
            width: '50%',
            condition: (_, irmaos) => irmaos?.unidadeDeUso === 'g',
            description:
              'A ponte entre o que se compra por peso e o que se envasa por volume. Cera de soja e coco ficam entre 0,85 e 0,90. Com 0,86, um copo de 60 ml leva 51,6 g.',
          },
        },
      ],
    },

    {
      name: 'estoqueAtual',
      type: 'number',
      label: 'Em estoque agora',
      min: 0,
      admin: {
        description:
          'Na unidade de uso. Descontado da lista de compras. Deixe vazio se preferir sempre comprar tudo.',
      },
    },

    {
      name: 'compras',
      type: 'array',
      label: 'Compras',
      labels: { singular: 'Compra', plural: 'Compras' },
      admin: {
        description:
          'Cada compra com o que foi pago. O preço do material sai daqui — por isso não existe campo de preço.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'em',
              type: 'date',
              label: 'Data',
              required: true,
              admin: {
                width: '30%',
                date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' },
              },
            },
            {
              name: 'embalagens',
              type: 'number',
              label: 'Quantas embalagens',
              required: true,
              min: 0,
              admin: { width: '25%', description: 'Quilos, caixas, rolos.' },
            },
            money({
              name: 'valorPago',
              label: 'Valor total pago',
              required: true,
              admin: { width: '25%' },
            }),
            { name: 'fornecedor', type: 'text', label: 'Fornecedor', admin: { width: '20%' } },
          ],
        },
      ],
    },

    {
      name: 'precoAtual',
      type: 'text',
      label: 'Preço observado',
      virtual: true,
      admin: {
        readOnly: true,
        description:
          'Calculado a partir das compras. Mostra a faixa real em vez de um número que finge ser exato.',
      },
      hooks: {
        afterRead: [
          ({ data }) => {
            if (!data) return ''

            const insumo = data as unknown as Insumo
            const ultimo = ultimoPreco(insumo)
            if (ultimo === null) return 'sem compra registrada'

            const medio = precoMedio(insumo)
            const faixa = faixaDePrecos(insumo)

            const unidade = rotuloCurto(String(data.unidadeDeCompra ?? 'unidade'))
            const partes = [`último ${formatarReais(ultimo)}/${unidade}`]

            if (faixa && faixa.minimo !== faixa.maximo) {
              partes.push(
                `faixa ${formatarReais(faixa.minimo)} a ${formatarReais(faixa.maximo)}`,
              )
            }
            if (medio !== null) partes.push(`média ${formatarReais(medio)}`)

            return partes.join(' · ')
          },
        ],
      },
    },
  ],
}

function rotuloCurto(unidade: string): string {
  const rotulos: Record<string, string> = {
    unidade: 'un',
    kg: 'kg',
    litro: 'L',
    metro: 'm',
    rolo: 'rolo',
    caixa: 'caixa',
  }
  return rotulos[unidade] ?? unidade
}
