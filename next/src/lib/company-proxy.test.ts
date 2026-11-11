import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '../proxy'
import type { RegionalContext } from './site'
const br: RegionalContext = { site: { id: 1, code: 'BR', name: 'Brasil', country_code: 'BR', locale: 'pt-BR', currency_code: 'BRL', timezone: 'America/Sao_Paulo', canonical_origin: 'https://jobs.portalerp.com', url_prefix: '/br', is_active: true }, locale: 'pt-BR' }
const company = { id: 4, site_id: 1, site_code: 'BR', company_name: 'Renamed MegaSoft', public_profile_slug: 'megasoft', status: 'approved' }
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
const path = '/br/empresas/megasoft/4'
function stub(data: unknown = company, status = 200, context = br) {
  const fetcher = vi.fn().mockResolvedValueOnce(json(context)).mockResolvedValueOnce(json(data, status))
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
describe('anonymous exact company URL proxy', () => {
  it.each(['GET', 'HEAD'])('allows only canonical profile %s, sanitizing browser regional/auth headers', async method => {
    const fetcher = stub()
    const result = await proxy(new NextRequest(`https://jobs.portalerp.com${path}?utm=local`, { method, headers: { host: 'jobs.portalerp.com', Cookie: 'private=secret', Authorization: 'Bearer secret', 'X-Regional-Prefix': '/mx', 'X-Next-Regional-Country': 'mx', 'X-Regional-Host': 'evil.test' } }))
    expect(result.status).toBe(200); expect(result.headers.get('location')).toBeNull()
    expect(result.headers.get('x-middleware-next')).toBe('1')
    const [url, init] = fetcher.mock.calls[1]
    expect(url).toBe('http://127.0.0.1:5000/api/companies/4')
    expect(init.cache).toBe('no-store'); expect(init.redirect).toBe('error')
    const headers = new Headers(init.headers)
    expect(headers.get('X-Regional-Prefix')).toBe('/br'); expect(headers.get('X-Regional-Host')).toBe('jobs.portalerp.com')
    for (const key of ['Cookie', 'Authorization', 'X-Next-Regional-Country', 'X-Forwarded-Host']) expect(headers.get(key)).toBeNull()
  })
  it.each(['/br/empresas/4', '/br/empresas/4/', '/br/empresas/wrong/4', '/br/empresas/MegaSoft/4', '/br/empresas/megasoft/4/', '/br/empresas/megasoft/04', '/br/empresas/megasoft/0', '/br/empresas/megasoft/9007199254740992', '/br/companies/megasoft/4', '/br/empresas/mega%73oft/4'])('returns exact 404 without Location/body on GET and HEAD: %s', async variant => {
    for (const method of ['GET', 'HEAD']) {
      stub()
      const response = await proxy(new NextRequest(`https://jobs.portalerp.com${variant}?q=%26%3C`, { method }))
      expect(response.status).toBe(404); expect(response.headers.get('location')).toBeNull()
      expect(response.headers.get('cache-control')).toBe('no-store'); expect(response.headers.get('x-robots-tag')).toBe('noindex')
      expect(await response.text()).toBe('')
    }
  })
  it.each(['0', '04', '-1', '1e3', 'NaN', '9007199254740992'])('rejects noncanonical ID %s before upstream details', async id => {
    const fetcher = stub()
    expect((await proxy(new NextRequest(`https://jobs.portalerp.com/br/empresas/megasoft/${id}`))).status).toBe(404)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it.each([{ site_id: 2 }, { site_id: undefined }, { site_code: 'MX' }, { status: 'pending' }, { status: 'rejected' }, { status: 'suspended' }, { is_active: false }, { id: 5 }, { public_profile_slug: 'BAD' }])('does not reveal inaccessible entity %j', async changes => {
    stub({ ...company, ...changes })
    const response = await proxy(new NextRequest(`https://jobs.portalerp.com${path}`))
    expect(response.status).toBe(404); expect(response.headers.get('location')).toBeNull(); expect(await response.text()).toBe('')
  })
  it.each([400, 401, 403, 404, 429, 500, 503])('maps upstream %s to definitive unavailable/503 without redirect', async status => {
    stub({}, status)
    const response = await proxy(new NextRequest(`https://jobs.portalerp.com${path}`))
    expect(response.status).toBe([400, 401, 403, 404].includes(status) ? 404 : 503)
    expect(response.headers.get('location')).toBeNull()
  })
  it('preserves transport failure as service unavailable', async () => {
    const fetcher = stub(); fetcher.mockReset().mockResolvedValueOnce(json(br)).mockRejectedValueOnce(new Error('offline'))
    expect((await proxy(new NextRequest(`https://jobs.portalerp.com${path}`))).status).toBe(503)
  })
  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])('rejects %s before querying public details', async method => {
    for (const url of [path, `${path}/`, '/br/empresas/4', '/br/empresas/wrong/4']) {
      const fetcher = stub()
      const response = await proxy(new NextRequest(`https://jobs.portalerp.com${url}`, { method }))
      expect(response.status).toBe(405); expect(response.headers.get('allow')).toBe('GET, HEAD'); expect(response.headers.get('location')).toBeNull()
      expect(fetcher).toHaveBeenCalledTimes(1)
    }
  })
  it.each([['mx', 'es-MX', 'empresas'], ['co', 'es-CO', 'empresas'], ['us', 'en-US', 'companies']])('prepares %s regional routes but never activates inactive country', async (country, locale, collection) => {
    const context = { site: { ...br.site, code: country.toUpperCase(), country_code: country.toUpperCase(), url_prefix: `/${country}`, locale }, locale }
    stub({ ...company, site_code: context.site.code }, 200, context)
    expect((await proxy(new NextRequest(`https://jobs.portalerp.com/${country}/${collection}/megasoft/4`))).status).toBe(200)
    const fetcher = stub(company, 200, { ...context, site: { ...context.site, is_active: false } })
    const response = await proxy(new NextRequest(`https://jobs.portalerp.com/${country}/${collection}/megasoft/4`))
    expect(response.status).toBe(404); expect(response.headers.get('location')).toBeNull(); expect(fetcher).toHaveBeenCalledTimes(1)
    stub(company, 200, context)
    expect((await proxy(new NextRequest(`https://jobs.portalerp.com/${country}/${collection}/megasoft/4`))).status).toBe(404)
  })
})
