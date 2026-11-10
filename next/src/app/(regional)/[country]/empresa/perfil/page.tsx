import type { Metadata } from 'next'

import { CompanyProfileForm } from '@/components/company/CompanyProfileForm'
import { CompanyShell } from '@/components/company/CompanyShell'
import { requireCompanySession } from '@/lib/company-page.server'

export const metadata: Metadata = { title: 'Perfil empresarial', robots: { index: false, follow: false } }
export default async function CompanyProfilePage() { await requireCompanySession('/empresa/perfil'); return <CompanyShell><CompanyProfileForm /></CompanyShell> }
