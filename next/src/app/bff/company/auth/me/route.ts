import { NextRequest } from 'next/server'

import { authenticatedCompanyProxy } from '@/lib/company-bff'

export async function GET(request: NextRequest) {
  return authenticatedCompanyProxy(request, '/auth/me', { requireCompanyResponse: true })
}
