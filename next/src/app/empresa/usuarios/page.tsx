import type { Metadata } from 'next'

import { CompanyShell } from '@/components/company/CompanyShell'
import { CompanyUsersNotice } from '@/components/company/CompanyUsersNotice'
import { requireCompanySession } from '@/lib/company-page.server'

export const metadata: Metadata = { title: 'Equipe empresarial', robots: { index: false, follow: false } }
export default async function CompanyUsersPage() { await requireCompanySession('/empresa/usuarios'); return <CompanyShell><CompanyUsersNotice /></CompanyShell> }
