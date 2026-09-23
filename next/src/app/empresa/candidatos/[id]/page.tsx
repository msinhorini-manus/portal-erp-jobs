import type { Metadata } from 'next'

import { CompanyCandidateDetail } from '@/components/company/CompanyCandidateDetail'
import { CompanyShell } from '@/components/company/CompanyShell'
import { requireCompanySession } from '@/lib/company-page.server'

export const metadata: Metadata = { title: 'Perfil do candidato', robots: { index: false, follow: false } }
export default async function CompanyCandidatePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; await requireCompanySession(`/empresa/candidatos/${id}`); return <CompanyShell><CompanyCandidateDetail candidateId={id} /></CompanyShell> }
