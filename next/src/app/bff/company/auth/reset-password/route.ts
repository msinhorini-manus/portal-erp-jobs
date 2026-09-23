import { NextRequest } from 'next/server'

import { publicCompanyAuthRequest } from '@/lib/company-bff'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  return publicCompanyAuthRequest(request, '/auth/reset-password', body, { clearOnSuccess: true })
}
