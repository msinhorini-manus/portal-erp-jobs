import { NextRequest } from 'next/server'

import { authenticatedCompanyProxy } from '@/lib/company-bff'

export async function PUT(request: NextRequest) {
  return authenticatedCompanyProxy(request, '/auth/change-password', { requireCsrf: true, clearOnSuccess: true })
}
