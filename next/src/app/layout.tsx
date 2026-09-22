import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import './globals.css'
import { Footer } from '@/components/layout/Footer'
import { Navbar } from '@/components/layout/Navbar'
import { getActiveSites, getSiteContext } from '@/lib/site-resolver.server'
import { openGraphLocale, requireCanonicalOrigin } from '@/lib/site'

const inter = Inter({ subsets: ['latin'] })

export const dynamic = 'force-dynamic'

const COPY: Record<string, { title: string; description: string; keywords: string[] }> = {
  'pt-BR': {
    title: 'Portal ERP Jobs - Vagas de Software e ERP',
    description: 'Plataforma de empregos especializada no setor de software e ERP. Encontre vagas de desenvolvimento, consultoria SAP, Oracle, Protheus e mais.',
    keywords: ['vagas software', 'empregos ERP', 'vagas SAP', 'vagas Protheus', 'vagas Oracle', 'desenvolvedor', 'consultor ERP', 'Portal ERP'],
  },
  'es-MX': {
    title: 'Portal ERP Jobs - Empleos de Software y ERP',
    description: 'Plataforma de empleo especializada en software y ERP para profesionales y empresas de México.',
    keywords: ['empleos software', 'empleos ERP', 'vacantes SAP', 'consultor ERP', 'Portal ERP'],
  },
}

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getSiteContext()
  const origin = requireCanonicalOrigin(site)
  const copy = COPY[site.locale] || COPY['pt-BR']

  return {
    metadataBase: new URL(origin),
    title: {
      default: copy.title,
      template: '%s | Portal ERP Jobs',
    },
    description: copy.description,
    keywords: copy.keywords,
    authors: [{ name: 'Portal ERP Group' }],
    creator: 'Portal ERP Group',
    openGraph: {
      type: 'website',
      locale: openGraphLocale(site),
      url: origin,
      siteName: 'Portal ERP Jobs',
      title: copy.title,
      description: copy.description,
      images: [
        {
          url: `${origin}/og-image.png`,
          width: 1200,
          height: 630,
          alt: 'Portal ERP Jobs',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.title,
      description: copy.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ site }, activeSites] = await Promise.all([getSiteContext(), getActiveSites()])

  return (
    <html lang={site.locale}>
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <Navbar currentSite={site} sites={activeSites} />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
