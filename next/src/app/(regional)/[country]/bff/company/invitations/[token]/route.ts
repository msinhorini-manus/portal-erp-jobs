import { withRegionalRoute } from '@/lib/regional-bff'
import { NextRequest, NextResponse } from 'next/server'

import { publicCompanyRequest } from '@/lib/company-bff'

function safeToken(value: string) {
  return /^[A-Za-z0-9_-]{32,128}$/.test(value)
}

type Context = { params: Promise<{ country: string; token: string }> }

async function proxy(request: NextRequest, context: Context) {
  const { token } = await context.params
  if (!safeToken(token)) {
    return NextResponse.json({ error: 'Convite inválido.' }, { status: 404 })
  }
  return publicCompanyRequest(request, `/company-team/invitations/${encodeURIComponent(token)}`)
}

export const GET = withRegionalRoute((request: NextRequest, context: Context) => proxy(request, context))
export const POST = withRegionalRoute((request: NextRequest, context: Context) => proxy(request, context))
