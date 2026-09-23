import type { Metadata } from 'next'

import { CompanyRegisterForm } from '@/components/company/CompanyRegisterForm'

export const metadata: Metadata = { title: 'Cadastro de empresa', robots: { index: false, follow: false } }
export default function CompanyRegisterPage() { return <CompanyRegisterForm /> }
