import type { Metadata } from 'next'

import { CompanyCandidates } from '@/components/company/CompanyCandidates'
import { CompanyShell } from '@/components/company/CompanyShell'
import { requireCompanySession } from '@/lib/company-page.server'

export const metadata: Metadata = { title: 'Candidatos da empresa', robots: { index: false, follow: false } }
export default async function CompanyCandidatesPage() { await requireCompanySession('/empresa/candidatos'); return <CompanyShell><CompanyCandidates /></CompanyShell> }
