import type { Metadata } from 'next'
import { Inter, Manrope } from 'next/font/google'

import './globals.css'
import { Footer } from '@/components/layout/Footer'
import { Navbar } from '@/components/layout/Navbar'
import { getActiveSites, getSiteContext } from '@/lib/site-resolver.server'
import { openGraphLocale, requireCanonicalOrigin } from '@/lib/site'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' })

export const dynamic = 'force-dynamic'

const COPY: Record<string, { title: string; description: string; keywords: string[] }> = {
  'pt-BR': {
    title: 'Jobs by Portal ERP - Vagas de Software e ERP',
    description: 'O mercado de software trabalha aqui. Vagas, talentos e empresas conectados pela autoridade do Portal ERP.',
    keywords: ['vagas software', 'empregos ERP', 'vagas SAP', 'vagas Protheus', 'vagas Oracle', 'desenvolvedor', 'consultor ERP', 'Portal ERP'],
  },
  'es-MX': {
    title: 'Jobs by Portal ERP - Empleos de Software y ERP',
    description: 'El mercado de software trabaja aquí. Empleos, talentos y empresas conectados por la autoridad de Portal ERP.',
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
      template: '%s | Jobs by Portal ERP',
    },
    description: copy.description,
    keywords: copy.keywords,
    authors: [{ name: 'Portal ERP Group' }],
    creator: 'Portal ERP Group',
    openGraph: {
      type: 'website',
      locale: openGraphLocale(site),
      url: origin,
      siteName: 'Jobs by Portal ERP',
      title: copy.title,
      description: copy.description,
      images: [
        {
          url: `${origin}/og-image.png`,
          width: 1200,
          height: 628,
          alt: 'Jobs by Portal ERP',
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
      <body className={`${inter.variable} ${manrope.variable}`}>
        <div className="min-h-screen flex flex-col">
          <Navbar currentSite={site} sites={activeSites} />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
