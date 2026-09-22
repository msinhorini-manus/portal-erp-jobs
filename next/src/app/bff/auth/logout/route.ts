import { NextRequest } from 'next/server'

import { logoutSession } from '@/lib/candidate-bff'

export async function POST(request: NextRequest) {
  return logoutSession(request)
}
