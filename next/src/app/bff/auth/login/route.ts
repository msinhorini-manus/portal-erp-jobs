import { NextRequest } from 'next/server'

import { publicAuthRequest } from '@/lib/candidate-bff'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  return publicAuthRequest(request, '/auth/login/candidate', body, { establishSession: true })
}
