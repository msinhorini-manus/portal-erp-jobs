import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://jobs.portalerp.com.br'),
  title: {
    default: 'Portal ERP Jobs - Vagas de Software e ERP',
    template: '%s | Portal ERP Jobs',
  },
  description: 'Plataforma de empregos especializada no setor de software e ERP. Encontre vagas de desenvolvimento, consultoria SAP, Oracle, Protheus e mais.',
  keywords: ['vagas software', 'empregos ERP', 'vagas SAP', 'vagas Protheus', 'vagas Oracle', 'desenvolvedor', 'consultor ERP', 'Portal ERP'],
  authors: [{ name: 'Portal ERP Group' }],
  creator: 'Portal ERP Group',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://jobs.portalerp.com.br',
    siteName: 'Portal ERP Jobs',
    title: 'Portal ERP Jobs - Vagas de Software e ERP',
    description: 'Plataforma de empregos especializada no setor de software e ERP.',
    images: [
      {
        url: 'https://jobs.portalerp.com.br/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Portal ERP Jobs',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Portal ERP Jobs - Vagas de Software e ERP',
    description: 'Plataforma de empregos especializada no setor de software e ERP.',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
