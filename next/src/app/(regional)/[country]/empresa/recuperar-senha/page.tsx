import type { Metadata } from 'next'

import { CompanyForgotPassword } from '@/components/company/CompanyForgotPassword'

export const metadata: Metadata = { title: 'Recuperar acesso empresarial', robots: { index: false, follow: false } }
export default function CompanyForgotPasswordPage() { return <CompanyForgotPassword /> }
