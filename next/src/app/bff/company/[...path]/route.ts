import { NextRequest, NextResponse } from 'next/server'

import { allowedQuery, authenticatedCompanyProxy, CompanyRoute, resolveCompanyRoute } from '../../../../lib/company-bff'

const JOB_QUERY = ['page', 'per_page', 'status'] as const
const APPLICATION_QUERY = ['page', 'per_page', 'status', 'job_id'] as const
const CANDIDATE_QUERY = ['page', 'per_page', 'q', 'city', 'state', 'min_salary', 'max_salary'] as const

export const COMPANY_ROUTES: CompanyRoute[] = [
  { pattern: /^profile$/, target: () => '/companies/', methods: ['GET', 'PUT'] },
  { pattern: /^dashboard$/, target: () => '/stats/company', methods: ['GET'] },
  {
    pattern: /^catalog\/(areas|levels|modalities|skills)$/,
    target: match => `/config/${match[1]}`,
    methods: ['GET'],
  },
  {
    pattern: /^jobs$/,
    target: (_match, query) => `/jobs/my-jobs${allowedQuery(query, JOB_QUERY)}`,
    methods: ['GET', 'POST'],
    query: JOB_QUERY,
  },
  { pattern: /^jobs\/(\d+)$/, target: match => `/jobs/${match[1]}`, methods: ['GET', 'PUT', 'DELETE'] },
  { pattern: /^jobs\/(\d+)\/toggle-status$/, target: match => `/jobs/${match[1]}/toggle-status`, methods: ['PATCH'] },
  {
    pattern: /^jobs\/(\d+)\/applications$/,
    target: (match, query) => `/jobs/${match[1]}/applications${allowedQuery(query, APPLICATION_QUERY)}`,
    methods: ['GET'],
    query: APPLICATION_QUERY,
  },
  {
    pattern: /^applications$/,
    target: (_match, query) => `/applications/company${allowedQuery(query, APPLICATION_QUERY)}`,
    methods: ['GET'],
    query: APPLICATION_QUERY,
  },
  { pattern: /^applications\/(\d+)$/, target: match => `/applications/${match[1]}`, methods: ['PUT'] },
  {
    pattern: /^candidates$/,
    target: (_match, query) => `/candidates/search${allowedQuery(query, CANDIDATE_QUERY)}`,
    methods: ['GET'],
    query: CANDIDATE_QUERY,
  },
  { pattern: /^candidates\/(\d+)$/, target: match => `/candidates/${match[1]}`, methods: ['GET'] },
]

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const joined = path.join('/')
  const resolved = resolveCompanyRoute(joined, request.method, request.nextUrl.searchParams, COMPANY_ROUTES)
  if ('error' in resolved) {
    const status = resolved.error === 'method' ? 405 : resolved.error === 'query' ? 400 : 404
    const error = resolved.error === 'method' ? 'Método não permitido.' : resolved.error === 'query' ? 'Parâmetro de consulta não permitido.' : 'Rota não permitida.'
    return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })
  }
  let target = joined === 'jobs' && request.method === 'POST' ? '/jobs/' : resolved.target
  if (request.method === 'GET' && /^jobs\/\d+$/.test(joined)) {
    target = `/jobs/my-jobs/${joined.split('/')[1]}`
  }
  return authenticatedCompanyProxy(request, target, { requireCsrf: !['GET', 'HEAD'].includes(request.method) })
}

type Context = { params: Promise<{ path: string[] }> }
export const GET = (request: NextRequest, context: Context) => proxy(request, context)
export const POST = (request: NextRequest, context: Context) => proxy(request, context)
export const PUT = (request: NextRequest, context: Context) => proxy(request, context)
export const PATCH = (request: NextRequest, context: Context) => proxy(request, context)
export const DELETE = (request: NextRequest, context: Context) => proxy(request, context)
