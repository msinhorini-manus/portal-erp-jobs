import type { Metadata } from 'next'
import { CandidateLoginForm } from '@/components/candidate/CandidateLoginForm'
import { getSiteContext } from '@/lib/site-resolver.server'

export const metadata: Metadata = { title: 'Acesso do candidato', robots: { index: false, follow: false } }

export default async function CandidateLoginPage() {
  const { locale } = await getSiteContext()
  return <CandidateLoginForm locale={locale} />
}
