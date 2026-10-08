import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { pt } from '@payloadcms/translations/languages/pt'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Media } from './collections/Media.ts'
import { Users } from './collections/Users.ts'
import { Addons } from './collections/catalog/Addons.ts'
import { Attributes, AttributeTerms } from './collections/catalog/Attributes.ts'
import { Events } from './collections/catalog/Events.ts'
import { Products } from './collections/catalog/Products.ts'
import { Categories, Occasions, Tags } from './collections/catalog/Taxonomies.ts'
import { Carts } from './collections/commerce/Carts.ts'
import { Coupons } from './collections/commerce/Coupons.ts'
import { Customers } from './collections/commerce/Customers.ts'
import { GiftCards } from './collections/commerce/GiftCards.ts'
import { IntegrationEvents } from './collections/commerce/IntegrationEvents.ts'
import { Orders } from './collections/commerce/Orders.ts'
import { FinanceCategories } from './collections/finance/FinanceCategories.ts'
import { LedgerEntries } from './collections/finance/LedgerEntries.ts'
import { Campaigns } from './collections/finance/Campaigns.ts'
import { Supplies } from './collections/finance/Supplies.ts'
import { StoreSettings } from './globals/StoreSettings.ts'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/** O armazenamento no Cloudflare R2 só é ligado quando as chaves existem. */
const storagePlugins = process.env.S3_BUCKET
  ? [
      s3Storage({
        collections: { media: true },
        bucket: process.env.S3_BUCKET,
        config: {
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
          },
          region: process.env.S3_REGION ?? 'auto',
          endpoint: process.env.S3_ENDPOINT,
          forcePathStyle: true,
        },
      }),
    ]
  : []

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL,

  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: ' — Lumini Aromas',
      description: 'Painel da Lumini Aromas',
    },
    components: {
      graphics: {},
      // O botão fica antes das coleções no menu: lançar a venda do WhatsApp
      // é a ação mais frequente do dia.
      beforeNavLinks: [
        '@/admin/BotaoNovoPedido#BotaoNovoPedido',
        '@/admin/BotaoResultado#BotaoResultado',
      ],
      views: {
        // A tela inicial do painel: o que precisa de ação e como o mês vai,
        // no lugar do índice de coleções que o Payload mostra por padrão.
        dashboard: {
          Component: '@/admin/painel/Painel#Painel',
        },
        novoPedido: {
          Component: '@/admin/NovoPedido#NovoPedido',
          path: '/novo-pedido',
        },
        resultadoDoMes: {
          Component: '@/admin/dre/Dre#Dre',
          path: '/dre',
        },
        listaDeMateriais: {
          Component: '@/admin/materiais/ListaDeCompras#ListaDeCompras',
          path: '/materiais',
        },
        importarAnuncios: {
          Component: '@/admin/marketing/ImportarAnuncios#ImportarAnuncios',
          path: '/importar-anuncios',
        },
        relatorioDoMes: {
          Component: '@/admin/dre/Relatorio#RelatorioDoMes',
          path: '/relatorio-do-mes',
        },
      },
    },
    dateFormat: 'dd/MM/yyyy HH:mm',
  },

  // Painel em português do Brasil.
  i18n: {
    supportedLanguages: { pt },
    fallbackLanguage: 'pt',
  },

  localization: false,

  collections: [
    // Catálogo
    Products,
    Categories,
    Occasions,
    Attributes,
    AttributeTerms,
    Addons,
    Tags,
    Events,
    Media,
    // Vendas
    Orders,
    Carts,
    Customers,
    Coupons,
    GiftCards,
    IntegrationEvents,
    // Financeiro
    FinanceCategories,
    LedgerEntries,
    Campaigns,
    Supplies,
    // Configurações
    Users,
  ],

  globals: [StoreSettings],

  editor: lexicalEditor(),

  db: postgresAdapter({
    /**
     * O pooler do Supabase no plano gratuito aceita 15 conexões no total.
     * Cada função da Vercel abre o seu próprio punhado, e sem teto elas
     * esgotam o limite sozinhas — derrubando o painel e qualquer script
     * que precise do banco ao mesmo tempo.
     *
     * Uma conexão por instância em produção, poucas em desenvolvimento.
     */
    pool: {
      connectionString: process.env.DATABASE_URI ?? '',
      max: process.env.VERCEL ? 1 : 4,
      idleTimeoutMillis: 10_000,
    },
    /**
     * Sincronização automática desligada, inclusive em desenvolvimento.
     *
     * Ela é prática, mas faz perguntas no terminal quando não consegue
     * decidir sozinha se uma coluna foi criada ou renomeada, e trava sem
     * resposta. Mais importante: com ela ligada, o banco de desenvolvimento
     * segue um caminho diferente do de produção, e a migração só é testada
     * de verdade no dia do lançamento.
     *
     * Fluxo ao mudar uma coleção: `npm run migrate:create` e `npm run migrate`.
     */
    push: false,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),

  secret: process.env.PAYLOAD_SECRET ?? '',

  // Processamento de imagens: gera as versões de 400, 800 e 1500 pixels.
  sharp,

  plugins: [...storagePlugins],

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  graphQL: {
    disable: true, // A loja usa a Local API e rotas REST próprias.
  },

  upload: {
    limits: { fileSize: 5_000_000 }, // 5 MB, igual ao limite atual de logo do cliente.
  },
})
