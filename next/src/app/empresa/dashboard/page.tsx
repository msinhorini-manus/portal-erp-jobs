import type { Metadata } from 'next'

import { CompanyDashboard } from '@/components/company/CompanyDashboard'
import { CompanyShell } from '@/components/company/CompanyShell'
import { requireCompanySession } from '@/lib/company-page.server'

export const metadata: Metadata = { title: 'Dashboard empresarial', robots: { index: false, follow: false } }
export default async function CompanyDashboardPage() { await requireCompanySession('/empresa/dashboard'); return <CompanyShell><CompanyDashboard /></CompanyShell> }
