import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

export const COMPANY_ACCESS_COOKIE = 'pej_company_access'
export const COMPANY_REFRESH_COOKIE = 'pej_company_refresh'
export const COMPANY_CSRF_COOKIE = 'pej_company_csrf'

const ACCESS_MAX_AGE = 15 * 60
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60
const refreshFlights = new Map<string, Promise<Tokens | null>>()

type Tokens = { access_token: string; refresh_token: string }
type Payload = Record<string, unknown>

function backendOrigin(request: NextRequest) {
  return process.env.NEXT_INTERNAL_API_ORIGIN?.replace(/\/$/, '') || request.nextUrl.origin
}

function regionalHeaders(request: NextRequest, headers?: HeadersInit) {
  const result = new Headers(headers)
  if (backendOrigin(request) !== request.nextUrl.origin) {
    result.set('X-Regional-Host', request.headers.get('host') || request.nextUrl.host)
  }
  return result
}

async function parseBody(response: Response): Promise<Payload> {
  if ((response.headers.get('content-type') || '').includes('application/json')) {
    return response.json().catch(() => ({}))
  }
  return { error: response.ok ? undefined : 'Resposta inválida do serviço.' }
}

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function validateCompanyCsrf(request: NextRequest) {
  const cookie = request.cookies.get(COMPANY_CSRF_COOKIE)?.value || ''
  const header = request.headers.get('x-csrf-token') || ''
  return Boolean(cookie && header && safeEqual(cookie, header))
}

export function clearCompanySessionCookies(response: NextResponse) {
  for (const name of [COMPANY_ACCESS_COOKIE, COMPANY_REFRESH_COOKIE, COMPANY_CSRF_COOKIE]) {
    response.cookies.set(name, '', {
      httpOnly: name !== COMPANY_CSRF_COOKIE,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    })
  }
  return response
}

export function setCompanySessionCookies(response: NextResponse, tokens: { access_token: string; refresh_token?: string }) {
  const common = { secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/' }
  response.cookies.set(COMPANY_ACCESS_COOKIE, tokens.access_token, { ...common, httpOnly: true, maxAge: ACCESS_MAX_AGE })
  if (tokens.refresh_token) {
    response.cookies.set(COMPANY_REFRESH_COOKIE, tokens.refresh_token, { ...common, httpOnly: true, maxAge: REFRESH_MAX_AGE })
  }
  if (!response.cookies.get(COMPANY_CSRF_COOKIE)?.value) {
    response.cookies.set(COMPANY_CSRF_COOKIE, randomBytes(32).toString('base64url'), { ...common, httpOnly: false, maxAge: REFRESH_MAX_AGE })
  }
  return response
}

export async function callCompanyBackend(request: NextRequest, path: string, init: RequestInit = {}, token?: string) {
  const headers = regionalHeaders(request, init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  return fetch(`${backendOrigin(request)}/api${path}`, { ...init, headers, cache: 'no-store' })
}

const FORBIDDEN_AUTHORITY_KEYS = new Set(['company_id', 'companyId', 'site_id', 'siteId', 'site_code', 'siteCode'])

export function containsBrowserAuthority(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some(containsBrowserAuthority)
  return Object.entries(value as Payload).some(([key, nested]) => FORBIDDEN_AUTHORITY_KEYS.has(key) || containsBrowserAuthority(nested))
}

export async function readSafeJson(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  if (containsBrowserAuthority(body)) return null
  return body
}

export async function publicCompanyAuthRequest(
  request: NextRequest,
  backendPath: string,
  body: unknown,
  options: { establishSession?: boolean; requireCompany?: boolean; clearOnSuccess?: boolean } = {},
) {
  if (containsBrowserAuthority(body)) return jsonResponse({ error: 'Contexto empresarial ou regional não pode ser fornecido pelo navegador.' }, 400)
  const backend = await callCompanyBackend(request, backendPath, { method: 'POST', body: JSON.stringify(body) })
  const payload = await parseBody(backend)
  const accessToken = typeof payload.access_token === 'string' ? payload.access_token : null
  const refreshToken = typeof payload.refresh_token === 'string' ? payload.refresh_token : null
  delete payload.access_token
  delete payload.refresh_token

  if (options.requireCompany && backend.ok && (payload.user as { user_type?: string } | undefined)?.user_type !== 'company') {
    return clearCompanySessionCookies(jsonResponse({ error: 'Conta empresarial obrigatória.' }, 403))
  }
  const response = jsonResponse(payload, backend.status)
  if (backend.ok && options.establishSession && accessToken && refreshToken) {
    setCompanySessionCookies(response, { access_token: accessToken, refresh_token: refreshToken })
  }
  if (backend.ok && options.clearOnSuccess) clearCompanySessionCookies(response)
  return response
}

async function executeRefresh(request: NextRequest, refreshToken: string) {
  const backend = await callCompanyBackend(request, '/auth/refresh', { method: 'POST' }, refreshToken)
  const payload = await parseBody(backend)
  if (!backend.ok || typeof payload.access_token !== 'string') return null
  return {
    access_token: payload.access_token,
    refresh_token: typeof payload.refresh_token === 'string' ? payload.refresh_token : refreshToken,
  }
}

async function refreshCompanySession(request: NextRequest) {
  const refreshToken = request.cookies.get(COMPANY_REFRESH_COOKIE)?.value
  if (!refreshToken) return null
  const key = createHash('sha256').update(refreshToken).digest('hex')
  const active = refreshFlights.get(key)
  if (active) return active
  const flight = executeRefresh(request, refreshToken).finally(() => refreshFlights.delete(key))
  refreshFlights.set(key, flight)
  return flight
}

export async function authenticatedCompanyProxy(
  request: NextRequest,
  backendPath: string,
  options: { requireCsrf?: boolean; requireCompanyResponse?: boolean; clearOnSuccess?: boolean } = {},
) {
  if (options.requireCsrf && !validateCompanyCsrf(request)) {
    return jsonResponse({ error: 'Validação CSRF inválida. Atualize a página e tente novamente.' }, 403)
  }

  const method = request.method
  let body: string | undefined
  if (!['GET', 'HEAD'].includes(method)) {
    const raw = await request.text()
    if (raw) {
      let parsed: unknown
      try { parsed = JSON.parse(raw) } catch { return jsonResponse({ error: 'JSON inválido.' }, 400) }
      if (containsBrowserAuthority(parsed)) return jsonResponse({ error: 'Contexto empresarial ou regional não pode ser fornecido pelo navegador.' }, 400)
      body = JSON.stringify(parsed)
    }
  }

  let accessToken = request.cookies.get(COMPANY_ACCESS_COOKIE)?.value
  let rotated: Tokens | null = null
  const execute = (token?: string) => callCompanyBackend(request, backendPath, { method, body }, token)
  let backend = await execute(accessToken)
  if (backend.status === 401) {
    rotated = await refreshCompanySession(request)
    if (!rotated) return clearCompanySessionCookies(jsonResponse({ error: 'Sessão expirada. Faça login novamente.' }, 401))
    accessToken = rotated.access_token
    backend = await execute(accessToken)
  }

  const payload = await parseBody(backend)
  if (options.requireCompanyResponse && backend.ok && payload.user_type !== 'company') {
    return clearCompanySessionCookies(jsonResponse({ error: 'Conta empresarial obrigatória.' }, 403))
  }
  const response = jsonResponse(payload, backend.status)
  if (rotated) setCompanySessionCookies(response, rotated)
  if (options.clearOnSuccess && backend.ok) clearCompanySessionCookies(response)
  if (backend.status === 401 || (backend.status === 403 && String(payload.error || '').toLowerCase().includes('sess'))) {
    clearCompanySessionCookies(response)
  }
  return response
}

export async function logoutCompanySession(request: NextRequest) {
  if (!validateCompanyCsrf(request)) return jsonResponse({ error: 'Validação CSRF inválida.' }, 403)
  const access = request.cookies.get(COMPANY_ACCESS_COOKIE)?.value
  const refresh = request.cookies.get(COMPANY_REFRESH_COOKIE)?.value
  let backend = access ? await callCompanyBackend(request, '/auth/logout', { method: 'POST' }, access) : null
  if ((!backend || !backend.ok) && refresh) backend = await callCompanyBackend(request, '/auth/logout', { method: 'POST' }, refresh)
  const payload = backend ? await parseBody(backend) : { message: 'Sessão encerrada.' }
  return clearCompanySessionCookies(jsonResponse(payload, backend?.status || 200))
}

export type CompanyRoute = {
  pattern: RegExp
  target: (match: RegExpMatchArray, query: URLSearchParams) => string
  methods: string[]
  query?: readonly string[]
}

export function resolveCompanyRoute(path: string, method: string, query: URLSearchParams, routes: CompanyRoute[]) {
  for (const route of routes) {
    const match = path.match(route.pattern)
    if (!match) continue
    if (!route.methods.includes(method)) return { error: 'method' as const }
    const allowed = new Set(route.query || [])
    if ([...query.keys()].some(key => !allowed.has(key) || FORBIDDEN_AUTHORITY_KEYS.has(key))) return { error: 'query' as const }
    return { target: route.target(match, query) }
  }
  return { error: 'path' as const }
}

export function allowedQuery(query: URLSearchParams, keys: readonly string[]) {
  const clean = new URLSearchParams()
  for (const key of keys) {
    for (const value of query.getAll(key)) clean.append(key, value)
  }
  const suffix = clean.toString()
  return suffix ? `?${suffix}` : ''
}
