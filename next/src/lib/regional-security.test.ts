import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '../proxy'
import { contextCacheTag, internalApiOrigin, trustedRegionalHeaders } from './regional-transport'
import { callBackend, setSessionCookies, clearSessionCookies } from './candidate-bff'
import { setCompanySessionCookies, clearCompanySessionCookies } from './company-bff'
import { NextResponse } from 'next/server'
const context = (country: string) => ({ site: { code: country.toUpperCase(), country_code: country.toUpperCase(), locale: 'pt-BR', url_prefix: `/${country}`, is_active: true }, locale: 'pt-BR' })
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
describe('trusted regional transport', () => {
  it('overwrites caller headers and validates active country through backend, including a synthetic country', async () => {
    const mock = vi.fn(async (_url: unknown, init?: RequestInit) => new Response(JSON.stringify(context(new Headers(init?.headers).get('X-Regional-Prefix')!.slice(1))), { headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', mock)
    const request = new NextRequest('https://jobs.portalerp.com/zz/vagas', { headers: { host: 'jobs.portalerp.com', 'X-Regional-Host': 'attacker.test', 'X-Regional-Prefix': '/br', 'X-Next-Regional-Country': 'br' } })
    const result = await proxy(request)
    const sent = new Headers(mock.mock.calls[0][1]?.headers)
    expect(sent.get('X-Regional-Host')).toBe('jobs.portalerp.com')
    expect(sent.get('X-Regional-Prefix')).toBe('/zz')
    expect(result.headers.get('x-middleware-request-x-next-regional-country')).toBe('zz')
    expect(result.headers.get('x-middleware-request-x-regional-prefix')).toBeNull()
    expect(result.headers.get('x-middleware-request-x-regional-host')).toBeNull()
  })
  it('fails closed for unknown/inactive/mismatched context and backend outage', async () => {
    const request = new NextRequest('https://jobs.portalerp.com/mx/vagas')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })))
    expect((await proxy(request)).status).toBe(404)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(context('br')))))
    expect((await proxy(request)).status).toBe(404)
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect((await proxy(request)).status).toBe(503)
  })
  it('global root temporarily redirects without sensitive header or user inference', async () => {
    vi.stubEnv('NEXT_DEFAULT_COUNTRY', 'br')
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
    const response = await proxy(new NextRequest('https://jobs.portalerp.com/', { headers: { 'X-Next-Regional-Country': 'mx', cookie: 'country=us' } }))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://jobs.portalerp.com/br')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('regional API rewrite retains trusted context and BFF calls overwrite forged init headers', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(context('br')))))
    const request = new NextRequest('https://jobs.portalerp.com/br/api/jobs/', { headers: { host: 'jobs.portalerp.com', 'X-Regional-Prefix': '/zz' } })
    const response = await proxy(request)
    expect(response.headers.get('x-middleware-request-x-regional-prefix')).toBe('/br')
    const mockedFetch = vi.fn(async (_url: unknown, _init?: RequestInit) => new Response('{}'))
    vi.stubGlobal('fetch', mockedFetch)
    await callBackend(new NextRequest('https://jobs.portalerp.com/br/bff/auth/me'), '/auth/me', { headers: { 'X-Regional-Prefix': '/zz', 'X-Regional-Host': 'attacker.test' } })
    const sent = new Headers(mockedFetch.mock.calls[0][1]?.headers)
    expect(sent.get('X-Regional-Prefix')).toBe('/br')
    expect(sent.get('X-Regional-Host')).toBe('jobs.portalerp.com')
    expect(String(mockedFetch.mock.calls[0][0])).toBe('http://127.0.0.1:5000/api/auth/me')
  })
  it('cache tags distinguish host/prefix/site/locale; no public fallback endpoint', () => {
    const a = contextCacheTag('jobs.portalerp.com', '/br', { id: 1, code: 'BR', locale: 'pt-BR' })
    expect(a).not.toBe(contextCacheTag('jobs.portalerp.com', '/zz', { id: 2, code: 'ZZ', locale: 'pt-BR' }))
    expect(a).not.toBe(contextCacheTag('alias.test', '/br', { id: 1, code: 'BR', locale: 'pt-BR' }))
    expect(a).not.toBe(contextCacheTag('jobs.portalerp.com', '/br', { id: 1, code: 'BR', locale: 'en-US' }))
    const headers = trustedRegionalHeaders('jobs.portalerp.com', '/br', { 'X-Forwarded-Host': 'attacker.test', 'X-Regional-Prefix': '/zz' })
    expect(headers.get('X-Forwarded-Host')).toBeNull()
    expect(headers.get('X-Regional-Prefix')).toBe('/br')
    expect(internalApiOrigin()).toBe('http://127.0.0.1:5000')
  })
  it('session create/clear preserves region Path, secure strict CSRF and root asset separation', () => {
    vi.stubEnv('NODE_ENV', 'production')
    for (const country of ['br', 'zz']) {
      const request = new NextRequest(`https://jobs.portalerp.com/${country}/bff/auth/login`)
      for (const [setter, clearer] of [[setSessionCookies, clearSessionCookies], [setCompanySessionCookies, clearCompanySessionCookies]] as const) {
        const created = setter(NextResponse.json({}), { access_token: 'access', refresh_token: 'refresh' }, request)
        for (const cookie of created.headers.getSetCookie()) { expect(cookie).toContain(`Path=/${country}`); expect(cookie).toContain('SameSite=strict'); expect(cookie).toContain('Secure') }
        const cleared = clearer(NextResponse.json({}), request)
        for (const cookie of cleared.headers.getSetCookie()) { expect(cookie).toContain(`Path=/${country}`); expect(cookie).toContain('Max-Age=0') }
      }
    }
  })
})
