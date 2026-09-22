import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { authenticatedProxy, logoutSession, publicAuthRequest, validateCsrf } from './candidate-bff'
import { safeReturnPath } from './candidate-client'

afterEach(() => vi.unstubAllGlobals())

describe('candidate BFF', () => {
  it('accepts only local return paths', () => {
    expect(safeReturnPath('/vagas/2')).toBe('/vagas/2')
    expect(safeReturnPath('https://attacker.example')).toBe('/candidato/dashboard')
    expect(safeReturnPath('//attacker.example')).toBe('/candidato/dashboard')
  })

  it('stores tokens only in HttpOnly cookies and strips them from JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      access_token: 'access-secret',
      refresh_token: 'refresh-secret',
      user: { id: 1, user_type: 'candidate' },
    }), { status: 200, headers: { 'content-type': 'application/json' } })))
    const request = new NextRequest('https://jobs.portalerp.com.br/bff/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'candidate@example.test', password: 'SafePassword1' }),
    })

    const response = await publicAuthRequest(request, '/auth/login/candidate', {}, { establishSession: true })
    const payload = await response.json()
    const cookies = response.headers.getSetCookie().join('\n')

    expect(JSON.stringify(payload)).not.toContain('access-secret')
    expect(JSON.stringify(payload)).not.toContain('refresh-secret')
    expect(cookies).toContain('pej_access=access-secret')
    expect(cookies).toContain('pej_refresh=refresh-secret')
    expect(cookies).toContain('HttpOnly')
    expect(cookies).toContain('SameSite=strict')
  })

  it('requires a matching double-submit CSRF token', () => {
    const valid = new NextRequest('https://jobs.portalerp.com.br/bff/candidate/profile', {
      headers: { cookie: 'pej_csrf=abc123', 'x-csrf-token': 'abc123' },
    })
    const invalid = new NextRequest('https://jobs.portalerp.com.br/bff/candidate/profile', {
      headers: { cookie: 'pej_csrf=abc123', 'x-csrf-token': 'different' },
    })
    expect(validateCsrf(valid)).toBe(true)
    expect(validateCsrf(invalid)).toBe(false)
  })

  it('refreshes once after a 401 and rotates both cookies', async () => {
    const mockedFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'expired' }), { status: 401, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'new-access', refresh_token: 'new-refresh' }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1, user_type: 'candidate' }), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', mockedFetch)
    const request = new NextRequest('https://jobs.portalerp.com.br/bff/auth/me', {
      headers: { cookie: 'pej_access=old-access; pej_refresh=old-refresh' },
    })

    const response = await authenticatedProxy(request, '/auth/me')
    expect(response.status).toBe(200)
    expect(mockedFetch).toHaveBeenCalledTimes(3)
    const cookies = response.headers.getSetCookie().join('\n')
    expect(cookies).toContain('pej_access=new-access')
    expect(cookies).toContain('pej_refresh=new-refresh')
  })

  it('deduplicates simultaneous refresh attempts for the same family', async () => {
    let refreshCalls = 0
    const mockedFetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const authorization = new Headers(init?.headers).get('Authorization')
      if (authorization === 'Bearer old-refresh') {
        refreshCalls += 1
        await new Promise(resolve => setTimeout(resolve, 10))
        return new Response(JSON.stringify({ access_token: 'shared-access', refresh_token: 'shared-refresh' }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      if (authorization === 'Bearer shared-access') {
        return new Response(JSON.stringify({ id: 1, user_type: 'candidate' }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return new Response(JSON.stringify({ error: 'expired' }), { status: 401, headers: { 'content-type': 'application/json' } })
    })
    vi.stubGlobal('fetch', mockedFetch)
    const makeRequest = () => new NextRequest('https://jobs.portalerp.com.br/bff/auth/me', {
      headers: { cookie: 'pej_access=old-access; pej_refresh=old-refresh' },
    })

    const [first, second] = await Promise.all([
      authenticatedProxy(makeRequest(), '/auth/me'),
      authenticatedProxy(makeRequest(), '/auth/me'),
    ])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(refreshCalls).toBe(1)
  })

  it('falls back to the refresh token when logout sees an expired access token', async () => {
    const mockedFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'expired' }), { status: 401, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'revoked' }), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', mockedFetch)
    const request = new NextRequest('https://jobs.portalerp.com.br/bff/auth/logout', {
      method: 'POST',
      headers: {
        cookie: 'pej_access=expired-access; pej_refresh=valid-refresh; pej_csrf=csrf-value',
        'x-csrf-token': 'csrf-value',
      },
    })

    const response = await logoutSession(request)
    expect(response.status).toBe(200)
    expect(mockedFetch).toHaveBeenCalledTimes(2)
    const secondHeaders = new Headers(mockedFetch.mock.calls[1][1]?.headers)
    expect(secondHeaders.get('Authorization')).toBe('Bearer valid-refresh')
    expect(response.headers.getSetCookie().join('\n')).toContain('Max-Age=0')
  })
})
