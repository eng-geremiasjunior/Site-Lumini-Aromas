import type { Metadata } from 'next'
import type React from 'react'

import './globals.css'
import { Cabecalho } from './comum/Cabecalho.tsx'
import { Entradas } from './comum/Entradas.tsx'
import { ProvedorDeFiltro } from './comum/filtro.tsx'
import { Rodape } from './comum/Rodape.tsx'
import { AvisoDeCookies } from './rastreamento/AvisoDeCookies.tsx'
import { GoogleTag } from './rastreamento/GoogleTag.tsx'
import { MetaPixel } from './rastreamento/MetaPixel.tsx'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://luminiaromas.com.br'),
  title: {
    default: 'Lumini Aromas — Lembrancinhas personalizadas de luxo',
    template: '%s — Lumini Aromas',
  },
  description:
    'Velas aromáticas artesanais e lembrancinhas de luxo, feitas à mão e personalizadas para casamentos, bodas, 15 anos e eventos corporativos.',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Lumini Aromas',
  },
  robots: {
    // A loja só é liberada para indexação no dia da virada de DNS.
    index: process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true',
    follow: process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true',
  },
}

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Antes de tudo, para o consentimento valer já no primeiro evento. */}
        <GoogleTag />
      </head>
      <body>
        {/*
         * O filtro da vitrine envolve cabeçalho e página porque os dois
         * mexem nele: o menu "Peças" escolhe a ocasião e a vitrine
         * desenha o resultado.
         */}
        <ProvedorDeFiltro>
          <Cabecalho />
          {children}
          <Rodape />
        </ProvedorDeFiltro>
        <Entradas />
        <MetaPixel />
        <AvisoDeCookies />
      </body>
    </html>
  )
}
