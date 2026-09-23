import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { COMPANY_ROUTES } from '../app/bff/company/[...path]/route'
import {
  authenticatedCompanyProxy,
  logoutCompanySession,
  publicCompanyAuthRequest,
  resolveCompanyRoute,
  validateCompanyCsrf,
} from './company-bff'
import { clearLegacyCompanySession, safeCompanyReturnPath } from './company-client'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('company BFF', () => {
  it('stores tokens only in company HttpOnly cookies and strips JWTs from JSON', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      access_token: 'company-access-secret',
      refresh_token: 'company-refresh-secret',
      user: { id: 7, user_type: 'company' },
    }), { status: 200, headers: { 'content-type': 'application/json' } })))
    const request = new NextRequest('https://jobs.portalerp.com.br/bff/company/auth/login', { method: 'POST' })
    const response = await publicCompanyAuthRequest(request, '/auth/login/company', {}, { establishSession: true, requireCompany: true })
    const payload = await response.json()
    const cookies = response.headers.getSetCookie().join('\n')

    expect(JSON.stringify(payload)).not.toContain('company-access-secret')
    expect(JSON.stringify(payload)).not.toContain('company-refresh-secret')
    expect(cookies).toContain('pej_company_access=company-access-secret')
    expect(cookies).toContain('pej_company_refresh=company-refresh-secret')
    expect(cookies).toContain('pej_company_csrf=')
    expect(cookies).toContain('HttpOnly')
    expect(cookies).toContain('Secure')
    expect(cookies).toContain('SameSite=strict')
  })

  it('requires matching double-submit CSRF for mutations', async () => {
    const valid = new NextRequest('https://jobs.portalerp.com.br/bff/company/profile', { headers: { cookie: 'pej_company_csrf=abc', 'x-csrf-token': 'abc' } })
    const invalid = new NextRequest('https://jobs.portalerp.com.br/bff/company/profile', { headers: { cookie: 'pej_company_csrf=abc', 'x-csrf-token': 'other' } })
    expect(validateCompanyCsrf(valid)).toBe(true)
    expect(validateCompanyCsrf(invalid)).toBe(false)

    const blocked = new NextRequest('https://jobs.portalerp.com.br/bff/company/profile', { method: 'PUT', body: '{}' })
    const response = await authenticatedCompanyProxy(blocked, '/companies/', { requireCsrf: true })
    expect(response.status).toBe(403)
  })

  it('deduplicates refresh and rotates company cookies after a 401', async () => {
    let refreshCalls = 0
    const mockedFetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const authorization = new Headers(init?.headers).get('Authorization')
      if (authorization === 'Bearer old-company-refresh') {
        refreshCalls += 1
        await new Promise(resolve => setTimeout(resolve, 10))
        return new Response(JSON.stringify({ access_token: 'new-company-access', refresh_token: 'new-company-refresh' }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      if (authorization === 'Bearer new-company-access') {
        return new Response(JSON.stringify({ id: 7, user_type: 'company' }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return new Response(JSON.stringify({ error: 'expired' }), { status: 401, headers: { 'content-type': 'application/json' } })
    })
    vi.stubGlobal('fetch', mockedFetch)
    const makeRequest = () => new NextRequest('https://jobs.portalerp.com.br/bff/company/auth/me', { headers: { cookie: 'pej_company_access=old; pej_company_refresh=old-company-refresh' } })
    const [first, second] = await Promise.all([
      authenticatedCompanyProxy(makeRequest(), '/auth/me', { requireCompanyResponse: true }),
      authenticatedCompanyProxy(makeRequest(), '/auth/me', { requireCompanyResponse: true }),
    ])
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(refreshCalls).toBe(1)
    expect(first.headers.getSetCookie().join('\n')).toContain('pej_company_access=new-company-access')
  })

  it('revokes with refresh when access is expired and clears all company cookies', async () => {
    const mockedFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'expired' }), { status: 401, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'revoked' }), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', mockedFetch)
    const request = new NextRequest('https://jobs.portalerp.com.br/bff/company/auth/logout', { method: 'POST', headers: { cookie: 'pej_company_access=expired; pej_company_refresh=valid-refresh; pej_company_csrf=csrf', 'x-csrf-token': 'csrf' } })
    const response = await logoutCompanySession(request)
    expect(response.status).toBe(200)
    expect(new Headers(mockedFetch.mock.calls[1][1]?.headers).get('Authorization')).toBe('Bearer valid-refresh')
    expect(response.headers.getSetCookie().filter(value => value.includes('Max-Age=0'))).toHaveLength(3)
  })

  it('preserves the regional Host only on internal backend calls and disables caching', async () => {
    vi.stubEnv('NEXT_INTERNAL_API_ORIGIN', 'http://127.0.0.1:5000')
    const mockedFetch = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({ user_type: 'company' }), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', mockedFetch)
    const request = new NextRequest('https://mx.jobs.portalerp.com/bff/company/auth/me', { headers: { host: 'mx.jobs.portalerp.com', cookie: 'pej_company_access=access' } })
    const response = await authenticatedCompanyProxy(request, '/auth/me', { requireCompanyResponse: true })
    const headers = new Headers(mockedFetch.mock.calls[0][1]?.headers)
    expect(headers.get('X-Regional-Host')).toBe('mx.jobs.portalerp.com')
    expect(mockedFetch.mock.calls[0][1]?.cache).toBe('no-store')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('blocks non-allowlisted paths, methods, query keys and browser authority', () => {
    expect(resolveCompanyRoute('catalog/skills', 'GET', new URLSearchParams(), COMPANY_ROUTES)).toEqual({ target: '/config/skills' })
    expect(resolveCompanyRoute('admin/companies', 'GET', new URLSearchParams(), COMPANY_ROUTES)).toEqual({ error: 'path' })
    expect(resolveCompanyRoute('dashboard', 'DELETE', new URLSearchParams(), COMPANY_ROUTES)).toEqual({ error: 'method' })
    expect(resolveCompanyRoute('jobs', 'GET', new URLSearchParams('site_id=4'), COMPANY_ROUTES)).toEqual({ error: 'query' })
    expect(resolveCompanyRoute('applications', 'GET', new URLSearchParams('company_id=8'), COMPANY_ROUTES)).toEqual({ error: 'query' })
    expect(resolveCompanyRoute('jobs/12/toggle-status/extra', 'PATCH', new URLSearchParams(), COMPANY_ROUTES)).toEqual({ error: 'path' })
  })

  it('rejects a candidate identity before opening the company UI', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: 1, user_type: 'candidate' }), { status: 200, headers: { 'content-type': 'application/json' } })))
    const request = new NextRequest('https://jobs.portalerp.com.br/bff/company/auth/me', { headers: { cookie: 'pej_company_access=wrong-principal' } })
    const response = await authenticatedCompanyProxy(request, '/auth/me', { requireCompanyResponse: true })
    expect(response.status).toBe(403)
    expect(response.headers.getSetCookie().join('\n')).toContain('Max-Age=0')
  })

  it('client contains no bearer/JWT storage and clears only legacy company state', () => {
    const source = readFileSync(new URL('./company-client.ts', import.meta.url), 'utf8')
    expect(source).not.toMatch(/Authorization|Bearer|setItem\s*\(/)
    expect(safeCompanyReturnPath('/empresa/vagas/2/editar')).toBe('/empresa/vagas/2/editar')
    expect(safeCompanyReturnPath('/admin')).toBe('/empresa/dashboard')
    expect(safeCompanyReturnPath('//attacker.example')).toBe('/empresa/dashboard')

    const values = new Map<string, string>([['userType', 'admin'], ['authToken', 'admin-token'], ['companyId', '7'], ['companyUsers', '[]']])
    vi.stubGlobal('window', { localStorage: { getItem: (key: string) => values.get(key) || null, removeItem: (key: string) => values.delete(key) } })
    clearLegacyCompanySession()
    expect(values.get('authToken')).toBe('admin-token')
    expect(values.get('userType')).toBe('admin')
    expect(values.has('companyId')).toBe(false)
    expect(values.has('companyUsers')).toBe(false)
  })
})
