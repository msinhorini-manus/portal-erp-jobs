import { NextRequest, NextResponse } from 'next/server'

import { authenticatedProxy } from '@/lib/candidate-bff'

const ALLOWED: Array<{ pattern: RegExp; target: (match: RegExpMatchArray) => string; methods: string[] }> = [
  { pattern: /^profile$/, target: () => '/candidates/profile', methods: ['GET', 'PUT'] },
  { pattern: /^privacy$/, target: () => '/candidates/me/privacy', methods: ['GET', 'PATCH'] },
  { pattern: /^applications$/, target: () => '/applications/', methods: ['GET', 'POST'] },
  { pattern: /^applications\/(\d+)$/, target: match => `/applications/${match[1]}`, methods: ['GET', 'DELETE'] },
  { pattern: /^resume$/, target: () => '/resume/complete', methods: ['GET', 'PUT'] },
  { pattern: /^resume\/(experiences|educations|skills|certifications|projects|languages)$/, target: match => `/resume/${match[1]}`, methods: ['GET', 'POST'] },
  { pattern: /^resume\/(experiences|educations|skills|certifications|projects|languages)\/(\d+)$/, target: match => `/resume/${match[1]}/${match[2]}`, methods: ['PUT', 'DELETE'] },
]

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const joined = path.join('/')
  for (const route of ALLOWED) {
    const match = joined.match(route.pattern)
    if (!match) continue
    if (!route.methods.includes(request.method)) {
      return NextResponse.json({ error: 'Método não permitido.' }, { status: 405 })
    }
    return authenticatedProxy(request, route.target(match), { requireCsrf: request.method !== 'GET' })
  }
  return NextResponse.json({ error: 'Rota não permitida.' }, { status: 404 })
}

type Context = { params: Promise<{ path: string[] }> }
export const GET = (request: NextRequest, context: Context) => proxy(request, context)
export const POST = (request: NextRequest, context: Context) => proxy(request, context)
export const PUT = (request: NextRequest, context: Context) => proxy(request, context)
export const PATCH = (request: NextRequest, context: Context) => proxy(request, context)
export const DELETE = (request: NextRequest, context: Context) => proxy(request, context)
