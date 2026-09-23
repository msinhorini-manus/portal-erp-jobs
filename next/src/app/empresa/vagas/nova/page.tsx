import type { Metadata } from 'next'

import { CompanyJobForm } from '@/components/company/CompanyJobForm'
import { CompanyShell } from '@/components/company/CompanyShell'
import { requireCompanySession } from '@/lib/company-page.server'

export const metadata: Metadata = { title: 'Nova vaga', robots: { index: false, follow: false } }
export default async function NewCompanyJobPage() { await requireCompanySession('/empresa/vagas/nova'); return <CompanyShell><CompanyJobForm /></CompanyShell> }
