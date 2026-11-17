import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, DELETE, GET } from '../app/(regional)/[country]/bff/company/[...path]/route'
import { authenticatedCompanyLogoProxy, authenticatedCompanyProxy, COMPANY_LOGO_BODY_MAX_BYTES } from './company-bff'
import { COMPANY_LOGO_MAX_BYTES } from './company-logo'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const identity = (changes: Record<string, unknown> = {}) => ({ user_type: 'company', role: 'owner', site_status: 'pending', permissions: { manage_company: true }, ...changes })
const csrfHeaders = { cookie: 'pej_company_access=access; pej_company_refresh=refresh; pej_company_csrf=csrf', 'x-csrf-token': 'csrf', origin: 'https://jobs.portalerp.com', 'sec-fetch-site': 'same-origin' }
function multipart(file = new File(['image'], 'private-company-name.png', { type: 'image/png' })) {
  const body = new FormData()
  body.append('logo', file)
  return body
}
function request(options: { method?: string; body?: BodyInit; headers?: Record<string, string>; query?: string; region?: string } = {}) {
  return new NextRequest(`https://jobs.portalerp.com/${options.region || 'br'}/bff/company/profile/logo${options.query || ''}`, { method: options.method || 'POST', body: options.body, headers: { ...csrfHeaders, ...options.headers } })
}
const context = (country = 'br', path = ['profile', 'logo']) => ({ params: Promise.resolve({ country, path }) })
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe('company logo BFF', () => {
  it('uses only an authenticated fixed regional upstream, regenerates the boundary and strips filename/authority', async () => {
    vi.stubEnv('NEXT_INTERNAL_API_ORIGIN', 'http://127.0.0.1:5000')
    const fetchMock = vi.fn().mockResolvedValueOnce(json(identity())).mockResolvedValueOnce(json({ logo_url: 'https://jobs.portalerp.com/br/api/companies/logos/id.png', company: { id: 7 }, access_token: 'DO_NOT_RETURN' }))
    vi.stubGlobal('fetch', fetchMock)
    const response = await POST(request({ body: multipart(), headers: { authorization: 'Bearer browser-forged', 'x-regional-host': 'attacker.invalid', 'x-regional-prefix': '/ar', 'x-forwarded-host': 'attacker.invalid' } }), context())
    expect(response.status).toBe(200)
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual(['http://127.0.0.1:5000/api/auth/me', 'http://127.0.0.1:5000/api/companies/logo'])
    const init = fetchMock.mock.calls[1][1] as RequestInit
    const headers = new Headers(init.headers)
    expect(headers.get('authorization')).toBe('Bearer access')
    expect(headers.get('host')).toBeNull()
    expect(headers.get('cookie')).toBeNull()
    expect(headers.get('x-forwarded-host')).toBeNull()
    expect(headers.get('x-regional-host')).toBe('jobs.portalerp.com')
    expect(headers.get('x-regional-prefix')).toBe('/br')
    expect(headers.get('content-type')).toBeNull()
    expect(init.cache).toBe('no-store')
    expect(init.redirect).toBe('error')
    const outgoing = new Request(String(fetchMock.mock.calls[1][0]), init)
    expect(outgoing.headers.get('content-type')).toMatch(/^multipart\/form-data; boundary=/)
    const parsed = await outgoing.formData()
    expect([...parsed.keys()]).toEqual(['logo'])
    expect((parsed.get('logo') as File).name).toBe('logo.png')
    const payload = await response.json()
    expect(payload.logo_url).toBe('https://jobs.portalerp.com/br/api/companies/logos/id.png')
    expect(payload.access_token).toBeUndefined()
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it.each([
    { cookie: '', 'x-csrf-token': '' },
    { 'x-csrf-token': 'wrong' },
    { origin: 'https://attacker.invalid' },
    { 'sec-fetch-site': 'cross-site' },
    { 'sec-fetch-site': 'same-site' },
  ] as Record<string, string>[])('rejects CSRF or non-same-origin uploads before parsing/fetching %j', async headers => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const req = request({ body: multipart(), headers })
    const parser = vi.spyOn(req, 'formData')
    const response = await POST(req, context())
    expect(response.status).toBe(403)
    expect(parser).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects anonymous calls even with forged browser Authorization before an upload fetch or parser', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const req = request({ body: multipart(), headers: { cookie: 'pej_company_csrf=csrf', authorization: 'Bearer forged' } })
    const response = await authenticatedCompanyLogoProxy(req)
    expect(response.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(response.headers.getSetCookie().filter(cookie => cookie.includes('Max-Age=0'))).toHaveLength(3)
  })

  it.each([
    identity({ role: 'viewer' }), identity({ role: 'hr' }), identity({ permissions: { manage_company: false } }),
    identity({ user_type: 'candidate' }), identity({ role: undefined }),
  ])('rejects unauthorized identities before upload %j', async principal => {
    const fetchMock = vi.fn().mockResolvedValue(json(principal))
    vi.stubGlobal('fetch', fetchMock)
    const response = await POST(request({ body: multipart() }), context())
    expect(response.status).toBe(403)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/auth/me')
  })

  it.each(['owner', 'admin'])('lets an authorized %s prepare a logo while pending', async role => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json(identity({ role }))).mockResolvedValueOnce(json({ logo_url: 'https://jobs.portalerp.com/br/api/companies/logos/id.png', company: { id: 7, status: 'pending' } }))
    vi.stubGlobal('fetch', fetchMock)
    expect((await POST(request({ body: multipart() }), context())).status).toBe(200)
  })

  it.each([
    [new File(['bad'], 'fake.svg', { type: 'image/svg+xml' }), 400],
    [new File([], 'empty.png', { type: 'image/png' }), 400],
    [new File([new Uint8Array(COMPANY_LOGO_MAX_BYTES + 1)], 'large.png', { type: 'image/png' }), 413],
  ] as const)('validates file type, emptiness and 2 MiB limit without upload', async (file, status) => {
    const fetchMock = vi.fn().mockResolvedValue(json(identity()))
    vi.stubGlobal('fetch', fetchMock)
    const response = await POST(request({ body: multipart(file) }), context())
    expect(response.status).toBe(status)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('accepts a file at exactly 2 MiB', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json(identity())).mockResolvedValueOnce(json({ logo_url: '/media/logo.png', company: { id: 7 } }))
    vi.stubGlobal('fetch', fetchMock)
    expect((await POST(request({ body: multipart(new File([new Uint8Array(COMPANY_LOGO_MAX_BYTES)], 'logo.webp', { type: 'image/webp' })) }), context())).status).toBe(200)
  })

  it.each([
    ['JSON instead of multipart', (): BodyInit => '{}', { 'content-type': 'application/json' }, 415],
    ['missing boundary', (): BodyInit => 'not-multipart', { 'content-type': 'multipart/form-data' }, 415],
    ['broken multipart', (): BodyInit => 'broken', { 'content-type': 'multipart/form-data; boundary=example' }, 400],
    ['text logo', () => { const body = new FormData(); body.append('logo', 'value'); return body }, {}, 400],
    ['additional authority field', () => { const body = multipart(); body.append('company_id', '9'); return body }, {}, 400],
    ['duplicate logo field', () => { const body = multipart(); body.append('logo', new File(['a'], 'a.png', { type: 'image/png' })); return body }, {}, 400],
  ] as const)('rejects %s with no JSON fallback', async (_label, body, headers, status) => {
    const fetchMock = vi.fn().mockResolvedValue(json(identity()))
    vi.stubGlobal('fetch', fetchMock)
    const response = await POST(request({ body: body(), headers }), context())
    expect(response.status).toBe(status)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('bounds declared and chunked body bytes before multipart parser', async () => {
    const fetchMock = vi.fn(async () => json(identity()))
    vi.stubGlobal('fetch', fetchMock)
    const parser = vi.spyOn(Response.prototype, 'formData')
    const largeDeclared = request({ body: 'tiny', headers: { 'content-type': 'multipart/form-data; boundary=x', 'content-length': String(COMPANY_LOGO_BODY_MAX_BYTES + 1) } })
    expect((await POST(largeDeclared, context())).status).toBe(413)
    const largeActual = request({ body: new Uint8Array(COMPANY_LOGO_BODY_MAX_BYTES + 1), headers: { 'content-type': 'multipart/form-data; boundary=x', 'content-length': '1' } })
    expect((await POST(largeActual, context())).status).toBe(413)
    expect(parser).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('protects region, exact route, method and query before any upstream', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect((await POST(request({ query: '?site_id=2', body: multipart() }), context())).status).toBe(400)
    expect((await POST(request({ query: '?url=https://attacker.invalid', body: multipart() }), context())).status).toBe(400)
    expect((await POST(request({ body: multipart() }), context('ar'))).status).toBe(404)
    expect((await POST(request({ body: multipart() }), context('br', ['profile', 'logo', 'extra']))).status).toBe(404)
    expect((await GET(request({ method: 'GET' }), context())).status).toBe(405)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('removes logos with an authenticated bodyless DELETE and rejects DELETE body', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json(identity())).mockResolvedValueOnce(json({ logo_url: null, company: { id: 7 } })).mockResolvedValueOnce(json(identity()))
    vi.stubGlobal('fetch', fetchMock)
    const response = await DELETE(request({ method: 'DELETE' }), context())
    expect(response.status).toBe(200)
    expect((await response.json()).logo_url).toBeNull()
    const init = fetchMock.mock.calls[1][1] as RequestInit
    expect(init.method).toBe('DELETE')
    expect(init.body).toBeUndefined()
    expect(new Headers(init.headers).get('content-type')).toBeNull()
    expect((await DELETE(request({ method: 'DELETE', body: '{}' }), context())).status).toBe(400)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('refreshes once, replays multipart and rotates HttpOnly cookies scoped to the same region', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json(identity()))
      .mockResolvedValueOnce(json({ error: 'expired' }, 401))
      .mockResolvedValueOnce(json({ access_token: 'new-access', refresh_token: 'new-refresh' }))
      .mockResolvedValueOnce(json({ logo_url: 'https://jobs.portalerp.com/ar/api/companies/logos/id.png', company: { id: 7 } }))
    vi.stubGlobal('fetch', fetchMock)
    const response = await POST(request({ body: multipart(), region: 'ar' }), context('ar'))
    expect(response.status).toBe(200)
    expect(new Headers(fetchMock.mock.calls[2][1]?.headers).get('authorization')).toBe('Bearer refresh')
    expect(new Headers(fetchMock.mock.calls[3][1]?.headers).get('authorization')).toBe('Bearer new-access')
    expect(fetchMock.mock.calls[1][1]?.body).toBe(fetchMock.mock.calls[3][1]?.body)
    const cookies = response.headers.getSetCookie().join('\n')
    expect(cookies).toContain('pej_company_access=new-access')
    expect(cookies).toContain('pej_company_refresh=new-refresh')
    expect(cookies).toContain('HttpOnly')
    expect(cookies).toContain('Path=/ar')
    expect(cookies).not.toContain('Path=/br')
  })

  it('refreshes before parsing when only a refresh cookie remains', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ access_token: 'renewed', refresh_token: 'renewed-refresh' }))
      .mockResolvedValueOnce(json(identity())).mockResolvedValueOnce(json({ logo_url: null, company: { id: 7 } }))
    vi.stubGlobal('fetch', fetchMock)
    const response = await DELETE(request({ method: 'DELETE', headers: { cookie: 'pej_company_refresh=refresh; pej_company_csrf=csrf' } }), context())
    expect(response.status).toBe(200)
    expect(String(fetchMock.mock.calls[0][0])).toContain('/auth/refresh')
    expect(response.headers.getSetCookie().join('\n')).toContain('pej_company_access=renewed')
  })

  it.each([401, 403, 400, 413, 500])('sanitizes upstream %s errors; only expired sessions clear cookies', async status => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json(identity())).mockResolvedValueOnce(json({ error: 'PRIVATE_EMAIL@example.invalid PRIVATE_FILENAME TOKEN' }, status))
    if (status === 401) fetchMock.mockResolvedValueOnce(json({ error: 'PRIVATE_REFRESH_TOKEN' }, 401))
    vi.stubGlobal('fetch', fetchMock)
    const response = await POST(request({ body: multipart() }), context())
    expect(response.status).toBe(status)
    expect(JSON.stringify(await response.json())).not.toMatch(/PRIVATE|TOKEN|@/)
    const cleared = response.headers.getSetCookie().filter(cookie => cookie.includes('Max-Age=0'))
    expect(cleared).toHaveLength(status === 401 ? 3 : 0)
  })

  it.each(['/jobs/12', '/company-team/invitations'])('keeps the existing JSON proxy unchanged for %s', async backendPath => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => json({ message: 'ok' }))
    vi.stubGlobal('fetch', fetchMock)
    const body = JSON.stringify({ description: 'unchanged JSON', skills: ['ERP'] })
    const req = new NextRequest('https://jobs.portalerp.com/br/bff/company/jobs/12', { method: 'PUT', body, headers: csrfHeaders })
    const result = await authenticatedCompanyProxy(req, backendPath, { requireCsrf: true })
    expect(result.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1]?.body).toBe(body)
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('content-type')).toBe('application/json')
    expect(String(fetchMock.mock.calls[0][0])).toContain(`/api${backendPath}`)
  })

  it('preserves newly refreshed cookies even when validation fails afterward', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ error: 'expired' }, 401))
      .mockResolvedValueOnce(json({ access_token: 'new-access', refresh_token: 'new-refresh' })).mockResolvedValueOnce(json(identity()))
    vi.stubGlobal('fetch', fetchMock)
    const response = await POST(request({ body: '{}', headers: { 'content-type': 'application/json' } }), context())
    expect(response.status).toBe(415)
    expect(response.headers.getSetCookie().join('\n')).toContain('pej_company_access=new-access')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})

describe('company logo public origin behind loopback Nginx upstream', () => {
  it('accepts canonical HTTPS Host/protocol when Next sees a loopback HTTP URL', async () => {
    vi.stubEnv('NEXT_INTERNAL_API_ORIGIN', 'http://127.0.0.1:5000')
    const fetchMock = vi.fn().mockResolvedValueOnce(json(identity())).mockResolvedValueOnce(json({ logo_url: 'https://jobs.portalerp.com/br/api/companies/logos/id.png', company: { id: 7 } }))
    vi.stubGlobal('fetch', fetchMock)
    const proxied = new NextRequest('http://127.0.0.1:3001/br/bff/company/profile/logo', { method: 'POST', body: multipart(), headers: { ...csrfHeaders, host: 'jobs.portalerp.com', 'x-forwarded-proto': 'https', 'x-forwarded-host': 'attacker.invalid' } })
    expect((await POST(proxied, context())).status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const outgoingHeaders = new Headers(fetchMock.mock.calls[1][1].headers)
    expect(outgoingHeaders.get('x-regional-host')).toBe('jobs.portalerp.com')
    expect(outgoingHeaders.get('x-forwarded-host')).toBeNull()
  })

  it.each([
    { origin: 'https://attacker.invalid', 'x-forwarded-host': 'attacker.invalid' },
    { origin: 'http://jobs.portalerp.com' },
    { 'x-forwarded-proto': 'https,http' },
    { origin: 'http://127.0.0.1:3001' },
  ] as Record<string, string>[])('rejects a noncanonical origin or ambiguous protocol before upstream %j', async changes => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const proxied = new NextRequest('http://127.0.0.1:3001/br/bff/company/profile/logo', { method: 'POST', body: multipart(), headers: { ...csrfHeaders, host: 'jobs.portalerp.com', 'x-forwarded-proto': 'https', ...changes } })
    expect((await POST(proxied, context())).status).toBe(403)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
