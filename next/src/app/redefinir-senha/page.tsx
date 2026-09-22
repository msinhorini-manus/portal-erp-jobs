import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/components/candidate/ResetPasswordForm'
import { getSiteContext } from '@/lib/site-resolver.server'

export const metadata: Metadata = { title: 'Redefinir senha', robots: { index: false, follow: false } }

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [{ locale }, params] = await Promise.all([getSiteContext(), searchParams])
  return <ResetPasswordForm locale={locale} token={params.token || ''} />
}
