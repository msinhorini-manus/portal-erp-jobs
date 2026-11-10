import { withRegionalRoute } from '@/lib/regional-bff'
import { NextRequest } from 'next/server'

import { authenticatedProxy } from '@/lib/candidate-bff'

async function GETHandler(request: NextRequest) {
  return authenticatedProxy(request, '/auth/me')
}

export const GET = withRegionalRoute(GETHandler)
