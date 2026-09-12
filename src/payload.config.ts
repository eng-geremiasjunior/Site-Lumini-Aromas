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
import { IntegrationEvents } from './collections/commerce/IntegrationEvents.ts'
import { Orders } from './collections/commerce/Orders.ts'
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
      beforeNavLinks: ['@/admin/BotaoNovoPedido#BotaoNovoPedido'],
      views: {
        novoPedido: {
          Component: '@/admin/NovoPedido#NovoPedido',
          path: '/novo-pedido',
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
    IntegrationEvents,
    // Configurações
    Users,
  ],

  globals: [StoreSettings],

  editor: lexicalEditor(),

  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI ?? '' },
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
