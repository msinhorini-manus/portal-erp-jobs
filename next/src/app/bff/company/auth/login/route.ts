import { NextRequest } from 'next/server'

import { publicCompanyAuthRequest } from '@/lib/company-bff'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  return publicCompanyAuthRequest(request, '/auth/login/company', body, { establishSession: true, requireCompany: true })
}
