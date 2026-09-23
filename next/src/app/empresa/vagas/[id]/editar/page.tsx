import type { Metadata } from 'next'

import { CompanyJobForm } from '@/components/company/CompanyJobForm'
import { CompanyShell } from '@/components/company/CompanyShell'
import { requireCompanySession } from '@/lib/company-page.server'

export const metadata: Metadata = { title: 'Editar vaga', robots: { index: false, follow: false } }
export default async function EditCompanyJobPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; await requireCompanySession(`/empresa/vagas/${id}/editar`); return <CompanyShell><CompanyJobForm jobId={id} /></CompanyShell> }
