import type { Metadata } from 'next'

import { CompanyInvitationAccept } from '@/components/company/CompanyInvitationAccept'

export const metadata: Metadata = {
  title: 'Aceitar convite empresarial',
  robots: { index: false, follow: false },
}

export default async function CompanyInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <CompanyInvitationAccept token={token} />
}
