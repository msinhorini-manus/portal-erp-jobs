import { NextRequest } from 'next/server'

import { authenticatedProxy } from '@/lib/candidate-bff'

export async function GET(request: NextRequest) {
  return authenticatedProxy(request, '/auth/me')
}
