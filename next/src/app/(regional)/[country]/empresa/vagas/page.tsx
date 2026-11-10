import type { Metadata } from 'next'

import { CompanyJobs } from '@/components/company/CompanyJobs'
import { CompanyShell } from '@/components/company/CompanyShell'
import { requireCompanySession } from '@/lib/company-page.server'

export const metadata: Metadata = { title: 'Vagas da empresa', robots: { index: false, follow: false } }
export default async function CompanyJobsPage() { await requireCompanySession('/empresa/vagas'); return <CompanyShell><CompanyJobs /></CompanyShell> }
