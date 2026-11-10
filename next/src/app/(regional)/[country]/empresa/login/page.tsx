import type { Metadata } from 'next'

import { CompanyLoginForm } from '@/components/company/CompanyLoginForm'

export const metadata: Metadata = { title: 'Login da empresa', robots: { index: false, follow: false } }
export default function CompanyLoginPage() { return <CompanyLoginForm /> }
