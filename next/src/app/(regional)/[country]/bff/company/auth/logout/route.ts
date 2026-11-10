import { withRegionalRoute } from '@/lib/regional-bff'
import { NextRequest } from 'next/server'

import { logoutCompanySession } from '@/lib/company-bff'

async function POSTHandler(request: NextRequest) {
  return logoutCompanySession(request)
}

export const POST = withRegionalRoute(POSTHandler)
