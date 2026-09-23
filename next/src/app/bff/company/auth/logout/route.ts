import { NextRequest } from 'next/server'

import { logoutCompanySession } from '@/lib/company-bff'

export async function POST(request: NextRequest) {
  return logoutCompanySession(request)
}
