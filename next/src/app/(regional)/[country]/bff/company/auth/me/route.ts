import { withRegionalRoute } from '@/lib/regional-bff'
import { NextRequest } from 'next/server'

import { authenticatedCompanyProxy } from '@/lib/company-bff'

async function GETHandler(request: NextRequest) {
  return authenticatedCompanyProxy(request, '/auth/me', { requireCompanyResponse: true })
}

export const GET = withRegionalRoute(GETHandler)
