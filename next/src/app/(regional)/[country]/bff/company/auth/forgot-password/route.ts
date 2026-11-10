import { withRegionalRoute } from '@/lib/regional-bff'
import { NextRequest } from 'next/server'

import { publicCompanyAuthRequest } from '@/lib/company-bff'

async function POSTHandler(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  return publicCompanyAuthRequest(request, '/auth/forgot-password', body)
}

export const POST = withRegionalRoute(POSTHandler)
