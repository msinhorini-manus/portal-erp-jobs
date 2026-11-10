import { withRegionalRoute } from '@/lib/regional-bff'
import { NextRequest } from 'next/server'

import { publicAuthRequest } from '@/lib/candidate-bff'

async function POSTHandler(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  return publicAuthRequest(request, '/auth/login/candidate', body, { establishSession: true })
}

export const POST = withRegionalRoute(POSTHandler)
