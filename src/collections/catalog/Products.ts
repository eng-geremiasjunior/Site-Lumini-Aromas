import type { CollectionConfig } from 'payload'

import { admins, publishedOrStaff } from '../../access/roles.ts'
import { money } from '../../fields/money.ts'
import { slugField } from '../../fields/slug.ts'
import {
  DEFAULT_LOT_SIZES,
  buildLotTable,
  generateLotSizes,
  type LotPricingConfig,
} from '../../commerce/pricing/lot-pricing.ts'
import { syncVariants } from './syncVariants.ts'

/**
 * Produto.
 *
 * A diferença central para o WooCommerce está na aba "Preço por lote":
 * o dono digita UM preço unitário e a tabela de 20 a 200 peças é gerada.
 * Não existe campo de preço de lote editável, porque foi exatamente isso
 * que produziu, na loja atual, 8 preços digitados errado e 21 variações
 * sem preço que sumiram da loja sem aviso.
 */
export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Produto', plural: 'Produtos' },
  admin: {
    group: 'Catálogo',
    useAsTitle: 'name',
    defaultColumns: ['name', 'unitPrice', 'category', 'status', 'updatedAt'],
    description: 'Cadastro dos produtos. O preço do lote é calculado sozinho.',
    livePreview: undefined,
  },
  access: {
    read: publishedOrStaff,
    create: admins,
    update: admins,
    delete: admins,
  },
  versions: {
    drafts: { autosave: false },
    maxPerDoc: 20,
  },
  hooks: {
    beforeChange: [
      syncVariants,
      ({ data }) => {
        // A tabela de lotes é sempre recalculada aqui, nunca recebida do formulário.
        if (typeof data.unitPrice !== 'number' || data.unitPrice <= 0) return data

        const minQty = typeof data.minQty === 'number' ? data.minQty : 20
        const qtyStep = typeof data.qtyStep === 'number' ? data.qtyStep : 10
        const maxQty = typeof data.maxQty === 'number' ? data.maxQty : 200

        const lotSizes: number[] =
          Array.isArray(data.lotSizes) && data.lotSizes.length > 0
            ? [...new Set(data.lotSizes as number[])].sort((a, b) => a - b)
            : generateLotSizes(minQty, qtyStep, maxQty)

        const volumeDiscounts = Array.isArray(data.volumeDiscounts)
          ? (data.volumeDiscounts as Array<{ fromQty: number; unitPrice: number }>)
              .filter((tier) => typeof tier?.fromQty === 'number' && typeof tier?.unitPrice === 'number')
              .sort((a, b) => a.fromQty - b.fromQty)
          : undefined

        const config: LotPricingConfig = {
          unitPrice: data.unitPrice,
          minQty,
          qtyStep,
          maxQty,
          lotSizes,
          volumeDiscounts,
        }

        try {
          data.lotSizes = lotSizes
          data.volumeDiscounts = volumeDiscounts
          data.lotTable = buildLotTable(config)
          data.priceFrom = data.lotTable[0]?.lotPrice ?? null
          data.priceTo = data.lotTable[data.lotTable.length - 1]?.lotPrice ?? null
        } catch (error) {
          // Configuração inconsistente: não grava uma tabela errada em silêncio.
          throw new Error(`Não foi possível calcular a tabela de lotes: ${(error as Error).message}`)
        }

        return data
      },
    ],
  },
  fields: [
    // ---------------------------------------------------------------- sidebar
    // Rascunho e publicado vêm do próprio Payload, pelo botão Publicar,
    // que também guarda o histórico de versões do produto. "Arquivado" é
    // um estado à parte: tira da loja sem apagar o histórico de vendas.
    {
      name: 'archived',
      type: 'checkbox',
      label: 'Arquivado',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Tira o produto da loja e dos anúncios sem apagar nada. Use em item sazonal ou descontinuado.',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Destacar na home',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    slugField(),
    {
      name: 'legacyWooId',
      type: 'number',
      label: 'ID no WooCommerce',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Preenchido pela migração, para rastrear a origem do produto.',
      },
    },

    // ------------------------------------------------------------------ abas
    {
      type: 'tabs',
      tabs: [
        // ------------------------------------------------------------- Geral
        {
          label: 'Geral',
          description: 'Nome, fotos e onde o produto aparece na loja.',
          fields: [
            { name: 'name', type: 'text', label: 'Nome do produto', required: true },
            {
              name: 'shortDescription',
              type: 'textarea',
              label: 'Resumo',
              maxLength: 300,
              admin: {
                description: 'Uma ou duas frases. Aparece na listagem e nos feeds do Google e da Meta.',
              },
            },
            {
              name: 'description',
              type: 'richText',
              label: 'Descrição',
            },
            {
              // Campo único com várias fotos, em vez de uma lista de linhas.
              // Na lista, a linha nascia antes do arquivo ser escolhido e já
              // aparecia com erro; aqui você escolhe as fotos de uma vez.
              name: 'gallery',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
              label: 'Fotos',
              admin: {
                description:
                  'A primeira foto é a principal. Arraste para mudar a ordem. Use imagens de no mínimo 1500x1500 para o Google não reprovar.',
              },
            },
            {
              name: 'category',
              type: 'relationship',
              relationTo: 'categories',
              label: 'Categoria',
              admin: { description: 'Tipo do produto. Ex.: Velas em vidro.' },
            },
            {
              name: 'occasions',
              type: 'relationship',
              relationTo: 'occasions',
              hasMany: true,
              label: 'Ocasiões',
              admin: {
                description:
                  'Para quais eventos este produto serve. Vira filtro na loja e etiqueta nos anúncios.',
              },
            },
            {
              name: 'tags',
              type: 'relationship',
              relationTo: 'tags',
              hasMany: true,
              label: 'Tags',
            },
          ],
        },

        // ----------------------------------------------------------- Opções
        {
          label: 'Opções',
          description: 'Aromas e outras variações oferecidas neste produto.',
          fields: [
            {
              name: 'optionGroups',
              type: 'array',
              label: 'Grupos de opção',
              labels: { singular: 'Grupo', plural: 'Grupos' },
              admin: {
                description:
                  'Ex.: Aroma, com os valores que este produto oferece. Cada combinação vira uma variação, sem preço próprio.',
              },
              fields: [
                {
                  name: 'attribute',
                  type: 'relationship',
                  relationTo: 'attributes',
                  label: 'Opção',
                  required: true,
                },
                {
                  name: 'terms',
                  type: 'relationship',
                  relationTo: 'attribute-terms',
                  hasMany: true,
                  label: 'Valores oferecidos',
                  required: true,
                  admin: {
                    description: 'Marque só os que este produto tem. Ex.: 6 dos 7 aromas.',
                  },
                },
              ],
            },
            {
              name: 'minQtyScope',
              type: 'select',
              label: 'O pedido mínimo vale por',
              defaultValue: 'variation',
              required: true,
              options: [
                { label: 'Cada aroma separadamente (um aroma por lote)', value: 'variation' },
                { label: 'Total do pedido (o cliente pode misturar aromas)', value: 'order' },
              ],
              admin: {
                description:
                  'Hoje a Lumini trabalha com um aroma por lote, igual ao site atual. Mudar para "total do pedido" permite misturar aromas dentro do mesmo lote.',
              },
            },
            {
              name: 'variants',
              type: 'array',
              label: 'Variações geradas',
              labels: { singular: 'Variação', plural: 'Variações' },
              admin: {
                description:
                  'Criadas automaticamente a partir dos valores marcados acima, e atualizadas a cada vez que você salva. Nenhuma tem preço próprio: o preço vem sempre da tabela de lotes.',
                initCollapsed: true,
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'label',
                      type: 'text',
                      label: 'Variação',
                      admin: { readOnly: true, width: '40%' },
                    },
                    {
                      name: 'sku',
                      type: 'text',
                      label: 'Código (SKU)',
                      admin: { width: '40%' },
                    },
                    {
                      name: 'active',
                      type: 'checkbox',
                      label: 'À venda',
                      defaultValue: true,
                      admin: { width: '20%' },
                    },
                  ],
                },
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  label: 'Foto desta variação',
                  admin: { description: 'Opcional. Se vazio, usa a primeira foto do produto.' },
                },
                {
                  name: 'key',
                  type: 'text',
                  admin: { hidden: true },
                },
                {
                  name: 'termIds',
                  type: 'text',
                  admin: { hidden: true },
                },
                {
                  name: 'legacyWooVariationId',
                  type: 'number',
                  label: 'ID da variação no WooCommerce',
                  admin: {
                    readOnly: true,
                    description:
                      'Usado para manter o histórico desta oferta no Google Merchant e no catálogo da Meta.',
                  },
                },
              ],
            },
          ],
        },

        // --------------------------------------------------- Preço por lote
        {
          label: 'Preço por lote',
          description: 'Digite o preço de uma peça. A tabela é calculada sozinha.',
          fields: [
            money({
              name: 'unitPrice',
              label: 'Preço de uma peça',
              required: true,
              admin: {
                description:
                  'É o único preço que você digita. Ex.: 38,00 gera 20 peças = R$ 760,00 e 200 peças = R$ 7.600,00.',
              },
            }),
            {
              type: 'row',
              fields: [
                {
                  name: 'minQty',
                  type: 'number',
                  label: 'Quantidade mínima',
                  defaultValue: 20,
                  required: true,
                  min: 1,
                  admin: { width: '33%' },
                },
                {
                  name: 'qtyStep',
                  type: 'number',
                  label: 'Intervalo entre faixas',
                  defaultValue: 10,
                  required: true,
                  min: 1,
                  admin: {
                    width: '33%',
                    description: 'Usado para gerar as faixas quando a lista abaixo está vazia.',
                  },
                },
                {
                  name: 'maxQty',
                  type: 'number',
                  label: 'Quantidade máxima',
                  defaultValue: 200,
                  required: true,
                  min: 1,
                  admin: {
                    width: '33%',
                    description: 'Acima disso o botão vira "Solicitar orçamento" no WhatsApp.',
                  },
                },
              ],
            },
            {
              name: 'lotSizes',
              type: 'number',
              hasMany: true,
              label: 'Faixas oferecidas ao cliente',
              defaultValue: [...DEFAULT_LOT_SIZES],
              admin: {
                description:
                  'As quantidades que aparecem para escolher. Só estas podem ser compradas. Deixe vazio para gerar automaticamente.',
              },
            },
            {
              name: 'volumeDiscounts',
              type: 'array',
              label: 'Desconto por volume (opcional)',
              labels: { singular: 'Faixa de desconto', plural: 'Faixas de desconto' },
              admin: {
                description:
                  'Deixe vazio para manter o mesmo preço por peça em todas as faixas, como é hoje. Se preencher, a partir da quantidade informada o preço da peça passa a ser o novo valor.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'fromQty',
                      type: 'number',
                      label: 'A partir de (peças)',
                      required: true,
                      min: 1,
                      admin: { width: '50%' },
                    },
                    money({
                      name: 'unitPrice',
                      label: 'Novo preço da peça',
                      required: true,
                      admin: { width: '50%' },
                    }),
                  ],
                },
              ],
            },
            {
              name: 'lotTable',
              type: 'json',
              label: 'Tabela de preços gerada',
              admin: {
                readOnly: true,
                description:
                  'Calculada a partir do preço da peça. Não é editável de propósito: é o que impede erro de digitação.',
                components: {
                  Field: '@/fields/LotTableField#LotTableField',
                },
              },
            },
            {
              type: 'row',
              fields: [
                money({
                  name: 'priceFrom',
                  label: 'Menor lote',
                  admin: { readOnly: true, width: '50%' },
                }),
                money({
                  name: 'priceTo',
                  label: 'Maior lote',
                  admin: { readOnly: true, width: '50%' },
                }),
              ],
            },
          ],
        },

        // ------------------------------------------------------ Personalização
        {
          label: 'Personalização',
          description: 'O que o cliente escreve ou envia, e os acabamentos.',
          fields: [
            {
              name: 'personalizationFields',
              type: 'array',
              label: 'Campos de personalização',
              labels: { singular: 'Campo', plural: 'Campos' },
              admin: {
                description:
                  'Ex.: "Frase ou nome para o rótulo" e o envio da logomarca. O texto é impresso exatamente como o cliente digitar.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'label',
                      type: 'text',
                      label: 'Título do campo',
                      required: true,
                      admin: { width: '50%' },
                    },
                    {
                      name: 'type',
                      type: 'select',
                      label: 'Tipo',
                      required: true,
                      defaultValue: 'text',
                      options: [
                        { label: 'Texto curto', value: 'text' },
                        { label: 'Texto longo', value: 'textarea' },
                        { label: 'Envio de arquivo', value: 'file' },
                        { label: 'Escolha uma opção', value: 'select' },
                        { label: 'Data', value: 'date' },
                      ],
                      admin: { width: '50%' },
                    },
                  ],
                },
                {
                  name: 'placeholder',
                  type: 'text',
                  label: 'Exemplo mostrado no campo',
                  admin: { description: 'Ex.: Para Luana com amor' },
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'required',
                      type: 'checkbox',
                      label: 'Obrigatório',
                      defaultValue: false,
                      admin: { width: '50%' },
                    },
                    {
                      name: 'maxChars',
                      type: 'number',
                      label: 'Máximo de caracteres',
                      admin: {
                        width: '50%',
                        description: 'Ex.: 20 na primeira linha do rótulo, 25 na segunda.',
                      },
                    },
                  ],
                },
                {
                  name: 'options',
                  type: 'text',
                  label: 'Opções',
                  admin: {
                    condition: (_, siblingData) => siblingData?.type === 'select',
                    description: 'Separe por vírgula. Ex.: Off white, Verde oliva, Rosé',
                  },
                },
              ],
            },
            {
              name: 'addons',
              type: 'relationship',
              relationTo: 'addons',
              hasMany: true,
              label: 'Acabamentos disponíveis',
              admin: { description: 'Cobrados por peça, somados ao lote.' },
            },
          ],
        },

        // -------------------------------------------------- Produção e envio
        {
          label: 'Produção e envio',
          description: 'Prazo prometido ao cliente e caixas usadas no frete.',
          fields: [
            {
              name: 'productionDays',
              type: 'array',
              label: 'Prazo de produção por faixa',
              labels: { singular: 'Faixa', plural: 'Faixas' },
              admin: {
                description:
                  'Em dias úteis. O site soma este prazo ao da transportadora e mostra a data prevista. O mesmo valor alimenta a entrega estimada no Google.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'fromQty',
                      type: 'number',
                      label: 'A partir de (peças)',
                      required: true,
                      admin: { width: '33%' },
                    },
                    {
                      name: 'minDays',
                      type: 'number',
                      label: 'Mínimo (dias úteis)',
                      required: true,
                      admin: { width: '33%' },
                    },
                    {
                      name: 'maxDays',
                      type: 'number',
                      label: 'Máximo (dias úteis)',
                      required: true,
                      admin: { width: '34%' },
                    },
                  ],
                },
              ],
            },
            {
              name: 'packaging',
              type: 'array',
              label: 'Embalagem por faixa',
              labels: { singular: 'Caixa', plural: 'Caixas' },
              admin: {
                description:
                  'Peso e medidas da caixa usada em cada faixa. É o que o Melhor Envio usa para cotar. Sem isso, a cotação de lotes grandes falha.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'fromQty',
                      type: 'number',
                      label: 'A partir de (peças)',
                      required: true,
                      admin: { width: '20%' },
                    },
                    {
                      name: 'boxes',
                      type: 'number',
                      label: 'Nº de caixas',
                      required: true,
                      defaultValue: 1,
                      admin: { width: '20%' },
                    },
                    {
                      name: 'weightKg',
                      type: 'number',
                      label: 'Peso (kg)',
                      required: true,
                      admin: { width: '20%' },
                    },
                    {
                      name: 'widthCm',
                      type: 'number',
                      label: 'Largura (cm)',
                      required: true,
                      admin: { width: '13%' },
                    },
                    {
                      name: 'heightCm',
                      type: 'number',
                      label: 'Altura (cm)',
                      required: true,
                      admin: { width: '13%' },
                    },
                    {
                      name: 'lengthCm',
                      type: 'number',
                      label: 'Comp. (cm)',
                      required: true,
                      admin: { width: '14%' },
                    },
                  ],
                },
              ],
            },
            {
              name: 'techSheet',
              type: 'group',
              label: 'Ficha técnica',
              admin: {
                description: 'Vira a tabela de informações na página do produto.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'durationHours',
                      type: 'number',
                      label: 'Duração (horas)',
                      admin: { width: '25%' },
                    },
                    { name: 'weight', type: 'text', label: 'Peso / volume', admin: { width: '25%' } },
                    { name: 'height', type: 'text', label: 'Altura', admin: { width: '25%' } },
                    { name: 'width', type: 'text', label: 'Largura', admin: { width: '25%' } },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'container',
                      type: 'text',
                      label: 'Recipiente',
                      admin: { width: '33%' },
                    },
                    { name: 'includes', type: 'text', label: 'Acompanha', admin: { width: '33%' } },
                    {
                      name: 'shelfLifeMonths',
                      type: 'number',
                      label: 'Validade (meses)',
                      admin: { width: '34%' },
                    },
                  ],
                },
              ],
            },
          ],
        },

        // ----------------------------------------------------- Fiscal e custo
        {
          label: 'Fiscal e custo',
          description: 'Usado na nota fiscal e no cálculo de lucro do DRE.',
          fields: [
            money({
              name: 'unitCost',
              label: 'Custo de uma peça',
              admin: {
                description:
                  'Matéria-prima, embalagem e mão de obra. Entra no DRE como custo do produto vendido. Fica gravado no pedido no dia da venda.',
              },
            }),
            {
              type: 'row',
              fields: [
                {
                  name: 'fiscalAnnex',
                  type: 'select',
                  label: 'Anexo do Simples',
                  defaultValue: 'II',
                  options: [
                    { label: 'Anexo II - fabricado pela Lumini', value: 'II' },
                    { label: 'Anexo I - comprado pronto e revendido', value: 'I' },
                  ],
                  admin: {
                    width: '50%',
                    description: 'Velas fabricadas vão no Anexo II; itens revendidos, no Anexo I.',
                  },
                },
                {
                  name: 'ncm',
                  type: 'text',
                  label: 'NCM',
                  defaultValue: '3406.00.00',
                  admin: { width: '50%', description: 'Velas: 3406.00.00.' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'csosn',
                  type: 'text',
                  label: 'CSOSN',
                  defaultValue: '102',
                  admin: { width: '33%' },
                },
                {
                  name: 'cfopInternal',
                  type: 'text',
                  label: 'CFOP dentro de MG',
                  defaultValue: '5.101',
                  admin: { width: '33%' },
                },
                {
                  name: 'cfopInterstate',
                  type: 'text',
                  label: 'CFOP outros estados',
                  defaultValue: '6.101',
                  admin: { width: '34%' },
                },
              ],
            },
          ],
        },

        // -------------------------------------------------------------- SEO
        {
          label: 'Google e SEO',
          fields: [
            { name: 'metaTitle', type: 'text', label: 'Título para o Google', maxLength: 70 },
            {
              name: 'metaDescription',
              type: 'textarea',
              label: 'Descrição para o Google',
              maxLength: 160,
            },
            {
              name: 'googleProductCategory',
              type: 'text',
              label: 'Categoria do Google',
              defaultValue: '588',
              admin: { description: 'Velas: 588 (Home & Garden > Decor > Home Fragrances > Candles).' },
            },
            {
              name: 'preserveLegacyFeedId',
              type: 'checkbox',
              label: 'Manter o ID antigo nos feeds',
              defaultValue: false,
              admin: {
                description:
                  'Marque apenas se este produto já tem histórico aprovado no Google Merchant. Assim ele não é tratado como produto novo e não perde desempenho.',
              },
            },
          ],
        },
      ],
    },
  ],
}
