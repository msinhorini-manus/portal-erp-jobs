import { withRegionalRoute } from '@/lib/regional-bff'
import { NextRequest } from 'next/server'

import { clearSessionCookies, publicAuthRequest } from '@/lib/candidate-bff'

async function POSTHandler(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const response = await publicAuthRequest(request, '/auth/reset-password', body)
  if (response.ok) clearSessionCookies(response, request)
  return response
}

export const POST = withRegionalRoute(POSTHandler)
