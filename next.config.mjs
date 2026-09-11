import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // As URLs do site atual terminam com barra (/product/vela.../), e é assim
  // que elas estão nos anúncios ativos e no índice do Google. Manter o mesmo
  // formato evita um redirecionamento a cada visita vinda de anúncio.
  trailingSlash: true,

  // As funções rodam em São Paulo (gru1) para reduzir latência com o banco
  // Neon em sa-east-1 e com as APIs do Mercado Pago e Melhor Envio.
  // A região gru1 só existe no plano Vercel Pro.
  images: {
    remotePatterns: [
      // Imagens do catálogo servidas pelo Cloudflare R2.
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: '**.cloudflarestorage.com' },
      // Durante a migração, imagens ainda hospedadas no WordPress atual.
      { protocol: 'https', hostname: 'luminiaromas.com.br' },
      { protocol: 'https', hostname: 'antigo.luminiaromas.com.br' },
    ],
  },
  // Redirecionamentos permanentes ficam no middleware, lendo a tabela
  // `redirects` do banco, para o dono poder editar sem deploy.
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
