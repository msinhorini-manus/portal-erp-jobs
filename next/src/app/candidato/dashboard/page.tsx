import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { CandidateDashboard } from '@/components/candidate/CandidateDashboard'
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/candidate-bff'
import { getSiteContext } from '@/lib/site-resolver.server'

export const metadata: Metadata = { title: 'Painel do candidato', robots: { index: false, follow: false } }

export default async function CandidateDashboardPage() {
  const [cookieStore, { locale }] = await Promise.all([cookies(), getSiteContext()])
  if (!cookieStore.has(ACCESS_COOKIE) && !cookieStore.has(REFRESH_COOKIE)) {
    redirect('/candidato/login')
  }
  return <CandidateDashboard locale={locale} />
}
