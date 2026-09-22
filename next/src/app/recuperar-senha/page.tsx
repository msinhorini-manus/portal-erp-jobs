import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/candidate/ForgotPasswordForm'
import { getSiteContext } from '@/lib/site-resolver.server'

export const metadata: Metadata = { title: 'Recuperar senha', robots: { index: false, follow: false } }

export default async function ForgotPasswordPage() {
  const { locale } = await getSiteContext()
  return <ForgotPasswordForm locale={locale} />
}
