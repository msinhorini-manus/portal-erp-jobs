import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { companyFetch, companyPath } from './company-client'
import { canManageCompanyLogo, companyLogoFileError, COMPANY_LOGO_MAX_BYTES, uploadCompanyLogo } from './company-logo'

beforeEach(() => {
  vi.stubGlobal('window', { location: { pathname: '/br/empresa/perfil' } })
  vi.stubGlobal('document', { cookie: 'pej_company_csrf=csrf-token' })
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('company logo client', () => {
  it('lets the browser generate a FormData boundary, retaining CSRF, cookies, region and no-store', async () => {
    vi.stubGlobal('window', { location: { pathname: '/ar/empresa/perfil' } })
    vi.stubGlobal('document', { cookie: 'pej_company_csrf=csrf-token' })
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => response({ logo_url: null, company: {} }))
    vi.stubGlobal('fetch', fetchMock)
    const form = new FormData()
    form.append('logo', new File(['image'], 'logo.png', { type: 'image/png' }))
    await companyFetch(companyPath('profile/logo'), { method: 'POST', body: form, headers: { 'Content-Type': 'application/json' } })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/ar/bff/company/profile/logo')
    const headers = new Headers(init.headers)
    expect(headers.get('content-type')).toBeNull()
    expect(headers.get('x-csrf-token')).toBe('csrf-token')
    expect(init.credentials).toBe('same-origin')
    expect(init.cache).toBe('no-store')
    const wireRequest = new Request(`https://jobs.portalerp.com${url}`, init)
    expect(wireRequest.headers.get('content-type')).toMatch(/^multipart\/form-data; boundary=/)
    expect((await wireRequest.formData()).get('logo')).toBeInstanceOf(File)
  })

  it.each(['profile', 'jobs', 'team/invitations'])('keeps existing JSON mutation behavior on %s', async path => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => response({ message: 'ok' }))
    vi.stubGlobal('fetch', fetchMock)
    const body = JSON.stringify({ description: 'unchanged JSON' })
    await companyFetch(`/br/bff/company/${path}`, { method: 'PUT', body })
    const init = fetchMock.mock.calls[0][1]
    expect(init.body).toBe(body)
    expect(new Headers(init.headers).get('content-type')).toBe('application/json')
  })

  it('does not change custom JSON content types', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => response({}))
    vi.stubGlobal('fetch', fetchMock)
    await companyFetch('/br/bff/company/jobs', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/vnd.test+json' } })
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('content-type')).toBe('application/vnd.test+json')
  })

  it.each(['image/png', 'image/jpeg', 'image/webp'])('accepts %s at exactly 2 MiB', type => {
    expect(companyLogoFileError({ size: COMPANY_LOGO_MAX_BYTES, type })).toBeNull()
  })

  it.each([{ type: 'image/svg+xml', size: 10 }, { type: 'image/png', size: 0 }, { type: 'image/png', size: COMPANY_LOGO_MAX_BYTES + 1 }])('rejects invalid files before fetch %j', async file => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(uploadCompanyLogo(new File([new Uint8Array(file.size)], 'private-name', { type: file.type }))).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not expose upstream PII in upload errors or local filenames in outgoing media', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => response({ error: 'PRIVATE_EMAIL@example.invalid' }, 500))
    vi.stubGlobal('fetch', fetchMock)
    await expect(uploadCompanyLogo(new File(['a'], 'PRIVATE_COMPANY.jpeg', { type: 'image/jpeg' }))).rejects.toThrow('Não foi possível alterar o logo.')
    const file = (fetchMock.mock.calls[0][1].body as FormData).get('logo') as File
    expect(file.name).toBe('logo.jpg')
  })

  it('requires owner/admin and respects explicit manage_company denial', () => {
    expect(canManageCompanyLogo('owner', { manage_company: true })).toBe(true)
    expect(canManageCompanyLogo('admin', { manage_company: true })).toBe(true)
    expect(canManageCompanyLogo('admin', { manage_company: false })).toBe(false)
    expect(canManageCompanyLogo('viewer', { manage_company: true })).toBe(false)
    expect(canManageCompanyLogo('hr')).toBe(false)
    expect(canManageCompanyLogo()).toBe(false)
  })
})
