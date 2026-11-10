import { withRegionalRoute } from '@/lib/regional-bff'
import { NextRequest } from 'next/server'

import { logoutSession } from '@/lib/candidate-bff'

async function POSTHandler(request: NextRequest) {
  return logoutSession(request)
}

export const POST = withRegionalRoute(POSTHandler)
