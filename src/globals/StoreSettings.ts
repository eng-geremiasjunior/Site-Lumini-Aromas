import type { GlobalConfig } from 'payload'

import { admins, owner, staff } from '../access/roles.ts'
import { money } from '../fields/money.ts'
import { DEFAULT_LOT_SIZES } from '../commerce/pricing/lot-pricing.ts'

/**
 * Configurações da loja em um lugar só.
 *
 * O prazo de produção definido aqui alimenta ao mesmo tempo a página do
 * produto e a entrega estimada no feed do Google, para o dono ajustar o
 * prazo do fim de ano em um único campo.
 */
export const StoreSettings: GlobalConfig = {
  slug: 'store-settings',
  label: 'Configurações da loja',
  admin: {
    group: 'Configurações',
    description: 'Dados da empresa, prazos, parcelamento e textos legais.',
  },
  access: { read: staff, update: admins },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Empresa',
          description: 'Estes dados são obrigatórios por lei no rodapé e no checkout.',
          fields: [
            {
              name: 'legalName',
              type: 'text',
              label: 'Razão social',
              required: true,
              admin: { description: 'Nome registrado da empresa, como consta no CNPJ.' },
            },
            {
              name: 'tradeName',
              type: 'text',
              label: 'Nome fantasia',
              defaultValue: 'Lumini Aromas',
            },
            {
              name: 'cnpj',
              type: 'text',
              label: 'CNPJ',
              defaultValue: '34.499.353/0001-08',
              required: true,
            },
            {
              name: 'stateRegistration',
              type: 'text',
              label: 'Inscrição estadual',
              admin: {
                description:
                  'Necessária para emitir nota fiscal. Deixe vazio se a empresa for isenta.',
              },
            },
            {
              name: 'address',
              type: 'group',
              label: 'Endereço',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'street', type: 'text', label: 'Rua', admin: { width: '60%' } },
                    { name: 'number', type: 'text', label: 'Número', admin: { width: '20%' } },
                    { name: 'complement', type: 'text', label: 'Compl.', admin: { width: '20%' } },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'district', type: 'text', label: 'Bairro', admin: { width: '30%' } },
                    { name: 'city', type: 'text', label: 'Cidade', admin: { width: '30%' } },
                    { name: 'state', type: 'text', label: 'UF', admin: { width: '15%' } },
                    { name: 'postalCode', type: 'text', label: 'CEP', admin: { width: '25%' } },
                  ],
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'email',
                  type: 'email',
                  label: 'E-mail de atendimento',
                  admin: { width: '50%' },
                },
                {
                  name: 'whatsapp',
                  type: 'text',
                  label: 'WhatsApp',
                  defaultValue: '5533999478774',
                  admin: { width: '50%', description: 'Só números, com o 55 na frente.' },
                },
              ],
            },
            {
              name: 'businessHours',
              type: 'text',
              label: 'Horário de atendimento',
              admin: { description: 'Ex.: Segunda a sexta, das 9h às 18h.' },
            },
          ],
        },

        {
          label: 'Vendas e prazos',
          fields: [
            {
              name: 'defaultLotSizes',
              type: 'number',
              hasMany: true,
              label: 'Faixas padrão de quantidade',
              defaultValue: [...DEFAULT_LOT_SIZES],
              admin: {
                description:
                  'Usadas quando um produto novo não define faixas próprias. As mesmas do site atual.',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'defaultMinQty',
                  type: 'number',
                  label: 'Pedido mínimo padrão',
                  defaultValue: 20,
                  admin: { width: '50%' },
                },
                {
                  name: 'defaultMaxQty',
                  type: 'number',
                  label: 'Quantidade máxima padrão',
                  defaultValue: 200,
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'productionBanner',
              type: 'text',
              label: 'Aviso de prazo de produção',
              admin: {
                description:
                  'Aparece na loja inteira. Ex.: "Produção atual: 15 dias úteis". Deixe vazio para esconder.',
              },
            },
            {
              name: 'rushBlackout',
              type: 'group',
              label: 'Período sem produção expressa',
              admin: {
                description:
                  'Nos meses de pico (casamentos e brindes de fim de ano) a loja deixa de oferecer prazo reduzido.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'from', type: 'date', label: 'De', admin: { width: '50%' } },
                    { name: 'to', type: 'date', label: 'Até', admin: { width: '50%' } },
                  ],
                },
              ],
            },
            {
              name: 'maxInterestFreeInstallments',
              type: 'number',
              label: 'Parcelas sem juros que a loja absorve',
              defaultValue: 3,
              min: 1,
              max: 12,
              admin: {
                description:
                  'Acima disso o cliente paga os juros. Atenção: 12x sem juros custa cerca de 21,8% da venda para a loja.',
              },
            },
            money({
              name: 'freeShippingFrom',
              label: 'Frete grátis a partir de',
              admin: { description: 'Deixe vazio ou zero para não oferecer frete grátis.' },
            }),
          ],
        },

        {
          label: 'Textos legais',
          description:
            'Estes textos são exigidos por lei e também pelo Google Merchant e pela Meta.',
          fields: [
            {
              name: 'returnPolicy',
              type: 'richText',
              label: 'Trocas, devoluções e arrependimento',
              admin: {
                description:
                  'Precisa dizer com clareza que o cliente pode desistir em 7 dias corridos após receber, mesmo em produto personalizado, e como fazer isso.',
              },
            },
            {
              name: 'termsOfUse',
              type: 'richText',
              label: 'Termos de uso',
            },
            {
              name: 'privacyPolicy',
              type: 'richText',
              label: 'Política de privacidade e cookies',
              admin: {
                description:
                  'Deve listar quais dados são coletados, com que base legal, com quem são compartilhados (Mercado Pago, Melhor Envio, Meta, Google) e por quanto tempo ficam guardados.',
              },
            },
            {
              name: 'legalVersion',
              type: 'text',
              label: 'Versão dos textos',
              defaultValue: '1',
              admin: {
                description:
                  'Mude ao alterar as políticas. A versão aceita fica gravada em cada pedido, como prova.',
              },
            },
          ],
        },

        {
          label: 'Financeiro',
          description: 'O que o relatório do mês precisa saber para calcular o imposto.',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'rbt12',
                  type: 'number',
                  label: 'Faturamento dos últimos 12 meses (R$)',
                  min: 0,
                  admin: {
                    width: '50%',
                    description:
                      'O RBT12 que o contador usa. É ele que define a alíquota do Simples: sem esse número, o relatório usa a primeira faixa e mostra um lucro maior do que o real. Confira uma vez por mês.',
                  },
                },
                {
                  name: 'anexoPadrao',
                  type: 'select',
                  label: 'Anexo padrão',
                  defaultValue: 'II',
                  options: [
                    { label: 'Anexo II - indústria (velas fabricadas)', value: 'II' },
                    { label: 'Anexo I - comércio (itens revendidos)', value: 'I' },
                  ],
                  admin: {
                    width: '50%',
                    description:
                      'Usado só quando o produto não tem anexo próprio no cadastro.',
                  },
                },
              ],
            },
            {
              name: 'custoDeEmbalagemPadrao',
              type: 'number',
              label: 'Custo médio de embalagem por pedido (R$)',
              min: 0,
              admin: {
                description:
                  'Caixa, plástico-bolha e fita de um envio típico. Entra no resultado dos pedidos em que o valor real não foi informado. Deixe vazio para não estimar nada.',
              },
            },
          ],
        },

        {
          label: 'Integrações',
          description: 'Somente o dono enxerga esta aba.',
          fields: [
            {
              name: 'integrationsNote',
              type: 'textarea',
              label: 'Observações',
              access: { read: ({ req }) => (req.user as { role?: string })?.role === 'dono' },
              admin: {
                description:
                  'As chaves ficam nas variáveis de ambiente, nunca aqui. Este campo é só para anotações.',
              },
            },
          ],
        },
      ],
    },
  ],
}

export const _ownerOnlyGuard = owner
