import type { Metadata } from 'next'
import { CandidateRegisterForm } from '@/components/candidate/CandidateRegisterForm'
import { getSiteContext } from '@/lib/site-resolver.server'

export const metadata: Metadata = { title: 'Cadastro de candidato', robots: { index: false, follow: false } }

export default async function CandidateRegisterPage() {
  const { locale } = await getSiteContext()
  return <CandidateRegisterForm locale={locale} />
}
