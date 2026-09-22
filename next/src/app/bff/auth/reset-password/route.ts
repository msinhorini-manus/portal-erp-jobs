import { NextRequest } from 'next/server'

import { clearSessionCookies, publicAuthRequest } from '@/lib/candidate-bff'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const response = await publicAuthRequest(request, '/auth/reset-password', body)
  if (response.ok) clearSessionCookies(response)
  return response
}
