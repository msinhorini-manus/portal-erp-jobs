import { withRegionalRoute } from '@/lib/regional-bff'
import { NextRequest } from 'next/server'

import { authenticatedCompanyProxy } from '@/lib/company-bff'

async function PUTHandler(request: NextRequest) {
  return authenticatedCompanyProxy(request, '/auth/change-password', { requireCsrf: true, clearOnSuccess: true })
}

export const PUT = withRegionalRoute(PUTHandler)
