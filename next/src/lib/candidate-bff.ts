import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export const ACCESS_COOKIE = 'pej_access'
export const REFRESH_COOKIE = 'pej_refresh'
export const CSRF_COOKIE = 'pej_csrf'

const ACCESS_MAX_AGE = 15 * 60
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60
const refreshFlights = new Map<string, Promise<{ access_token: string; refresh_token: string } | null>>()

function backendOrigin(request: NextRequest) {
  return process.env.NEXT_INTERNAL_API_ORIGIN?.replace(/\/$/, '') || request.nextUrl.origin
}

function regionalHeaders(request: NextRequest, headers?: HeadersInit) {
  const result = new Headers(headers)
  const internal = backendOrigin(request)
  if (internal !== request.nextUrl.origin) {
    result.set('X-Regional-Host', request.headers.get('host') || request.nextUrl.host)
  }
  return result
}

async function parseBody(response: Response) {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json().catch(() => ({}))
  }
  return { error: response.ok ? undefined : 'Resposta inválida do serviço de autenticação.' }
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function validateCsrf(request: NextRequest) {
  const cookie = request.cookies.get(CSRF_COOKIE)?.value || ''
  const header = request.headers.get('x-csrf-token') || ''
  return Boolean(cookie && header && safeEqual(cookie, header))
}

export function clearSessionCookies(response: NextResponse) {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE]) {
    response.cookies.set(name, '', {
      httpOnly: name !== CSRF_COOKIE,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    })
  }
  return response
}

export function setSessionCookies(
  response: NextResponse,
  tokens: { access_token: string; refresh_token?: string },
) {
  const common = {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
  }
  response.cookies.set(ACCESS_COOKIE, tokens.access_token, {
    ...common,
    httpOnly: true,
    maxAge: ACCESS_MAX_AGE,
  })
  if (tokens.refresh_token) {
    response.cookies.set(REFRESH_COOKIE, tokens.refresh_token, {
      ...common,
      httpOnly: true,
      maxAge: REFRESH_MAX_AGE,
    })
  }
  if (!response.cookies.get(CSRF_COOKIE)?.value) {
    response.cookies.set(CSRF_COOKIE, randomBytes(32).toString('base64url'), {
      ...common,
      httpOnly: false,
      maxAge: REFRESH_MAX_AGE,
    })
  }
  return response
}

export async function callBackend(
  request: NextRequest,
  path: string,
  init: RequestInit = {},
  token?: string,
) {
  const headers = regionalHeaders(request, init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  return fetch(`${backendOrigin(request)}/api${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  })
}

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function publicAuthRequest(
  request: NextRequest,
  backendPath: string,
  body: unknown,
  options: { establishSession?: boolean } = {},
) {
  const backend = await callBackend(request, backendPath, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const payload = await parseBody(backend) as Record<string, unknown>
  const accessToken = typeof payload.access_token === 'string' ? payload.access_token : null
  const refreshToken = typeof payload.refresh_token === 'string' ? payload.refresh_token : null
  delete payload.access_token
  delete payload.refresh_token

  const response = jsonResponse(payload, backend.status)
  if (backend.ok && options.establishSession && accessToken && refreshToken) {
    setSessionCookies(response, { access_token: accessToken, refresh_token: refreshToken })
  }
  return response
}

async function executeRefresh(request: NextRequest, refreshToken: string) {
  const backend = await callBackend(request, '/auth/refresh', { method: 'POST' }, refreshToken)
  const payload = await parseBody(backend) as Record<string, unknown>
  if (!backend.ok || typeof payload.access_token !== 'string') return null
  return {
    access_token: payload.access_token,
    refresh_token: typeof payload.refresh_token === 'string' ? payload.refresh_token : refreshToken,
  }
}

async function refreshSession(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value
  if (!refreshToken) return null
  const refreshKey = createHash('sha256').update(refreshToken).digest('hex')
  const active = refreshFlights.get(refreshKey)
  if (active) return active

  const flight = executeRefresh(request, refreshToken).finally(() => refreshFlights.delete(refreshKey))
  refreshFlights.set(refreshKey, flight)
  return flight
}

export async function authenticatedProxy(
  request: NextRequest,
  backendPath: string,
  options: { requireCsrf?: boolean } = {},
) {
  if (options.requireCsrf && !validateCsrf(request)) {
    return jsonResponse({ error: 'Validação CSRF inválida. Atualize a página e tente novamente.' }, 403)
  }

  const method = request.method
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.text()
  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value
  let rotatedTokens: { access_token: string; refresh_token: string } | null = null

  const execute = (token?: string) => callBackend(request, backendPath, { method, body }, token)
  let backend = await execute(accessToken)

  if (backend.status === 401) {
    rotatedTokens = await refreshSession(request)
    if (!rotatedTokens) {
      return clearSessionCookies(jsonResponse({ error: 'Sessão expirada. Faça login novamente.' }, 401))
    }
    accessToken = rotatedTokens.access_token
    backend = await execute(accessToken)
  }

  const payload = await parseBody(backend)
  const response = jsonResponse(payload, backend.status)
  if (rotatedTokens) setSessionCookies(response, rotatedTokens)
  if (backend.status === 401 || backend.status === 403 && (payload as { error?: string }).error?.includes('Sessão')) {
    clearSessionCookies(response)
  }
  return response
}

export async function logoutSession(request: NextRequest) {
  if (!validateCsrf(request)) {
    return jsonResponse({ error: 'Validação CSRF inválida.' }, 403)
  }
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value
  let backend = accessToken
    ? await callBackend(request, '/auth/logout', { method: 'POST' }, accessToken)
    : null
  if ((!backend || !backend.ok) && refreshToken) {
    backend = await callBackend(request, '/auth/logout', { method: 'POST' }, refreshToken)
  }
  const payload = backend ? await parseBody(backend) : { message: 'Sessão encerrada.' }
  return clearSessionCookies(jsonResponse(payload, backend?.status || 200))
}
