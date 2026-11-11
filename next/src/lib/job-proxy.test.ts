import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '../proxy'
import type { RegionalContext } from './site'
const br: RegionalContext = { site: { id: 1, code: 'BR', name: 'Brasil', country_code: 'BR', locale: 'pt-BR', currency_code: 'BRL', timezone: 'America/Sao_Paulo', canonical_origin: 'https://jobs.portalerp.com', url_prefix: '/br', is_active: true }, locale: 'pt-BR' }
const job = { id: 1, site_id: 1, site_code: 'BR', title: 'Updated title', company_name: 'Updated company', public_company_slug: 'empresa-original', public_title_slug: 'titulo-original', is_active: true, status: 'active' }
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
const path = '/br/vagas/empresa-original/titulo-original/1'
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
describe('public friendly job proxy validates before SSR/redirect', () => {
  it.each(['GET', 'HEAD'])('validates anonymous detail then returns direct 301 for wrong slugs on %s', async method => {
    const fetcher = vi.fn().mockResolvedValueOnce(json(br)).mockResolvedValueOnce(json(job))
    vi.stubGlobal('fetch', fetcher)
    const response = await proxy(new NextRequest('https://jobs.portalerp.com/br/vagas/wrong-company/wrong-title/1?utm=a&next=https%3A%2F%2Fevil.test', { method, headers: { host: 'jobs.portalerp.com', Cookie: 'private=secret', Authorization: 'Bearer secret', 'X-Regional-Prefix': '/mx', 'X-Next-Regional-Country': 'mx', 'X-Regional-Host': 'evil.test' } }))
    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe(`https://jobs.portalerp.com${path}?utm=a&next=https%3A%2F%2Fevil.test`)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.text()).toBe('')
    const [url, init] = fetcher.mock.calls[1]
    expect(url).toBe('http://127.0.0.1:5000/api/jobs/1')
    expect(init.cache).toBe('no-store'); expect(init.redirect).toBe('error')
    const headers = new Headers(init.headers)
    expect(headers.get('X-Regional-Host')).toBe('jobs.portalerp.com')
    expect(headers.get('X-Regional-Prefix')).toBe('/br')
    for (const name of ['Cookie', 'Authorization', 'X-Next-Regional-Country', 'X-Forwarded-Host']) expect(headers.get(name)).toBeNull()
  })
  it('passes only exact authoritative friendly URL to SSR with sanitized regional headers', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json(br)).mockResolvedValueOnce(json(job)); vi.stubGlobal('fetch', fetcher)
    const result = await proxy(new NextRequest(`https://jobs.portalerp.com${path}`, { headers: { 'X-Regional-Prefix': '/mx', 'X-Next-Regional-Country': 'mx' } }))
    expect(result.status).toBe(200)
    expect(result.headers.get('location')).toBeNull()
    expect(result.headers.get('x-middleware-next')).toBe('1')
    expect(result.headers.get('x-middleware-request-x-next-regional-country')).toBe('br')
    expect(result.headers.get('x-middleware-request-x-regional-prefix')).toBeNull()
  })
  it.each([{ ...job, site_id: 2 }, { ...job, site_code: 'MX' }, { ...job, is_active: false }, { ...job, expires_at: '2000-01-01' }, { ...job, status: 'pending' }, { ...job, id: 2 }])('rejects inaccessible regional entity without Location/title/company before SSR', async data => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(br)).mockResolvedValueOnce(json(data)))
    const response = await proxy(new NextRequest('https://jobs.portalerp.com/br/vagas/wrong-company/wrong-title/1'))
    expect(response.status).toBe(404); expect(response.headers.get('location')).toBeNull(); expect(await response.text()).toBe('')
  })
  it('fails inactive country before detail and never reveals BR job on another region', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json({ ...br, site: { ...br.site, is_active: false } })); vi.stubGlobal('fetch', fetcher)
    expect((await proxy(new NextRequest(`https://jobs.portalerp.com${path}`))).status).toBe(404)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it.each(['0', '-1', 'NaN', '1e3', '9999999999999999999999999999999'])('rejects ID %s before querying details', async id => {
    const fetcher = vi.fn().mockResolvedValueOnce(json(br)); vi.stubGlobal('fetch', fetcher)
    expect((await proxy(new NextRequest(`https://jobs.portalerp.com/br/vagas/a/b/${id}`))).status).toBe(404)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('does not leak hidden organization, normalizes leading zero ID, and keeps encoded query', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(br)).mockResolvedValueOnce(json({ ...job, is_company_hidden: true })))
    const response = await proxy(new NextRequest('https://jobs.portalerp.com/br/vagas/real-company/title/01?x=%26%3C'))
    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('https://jobs.portalerp.com/br/vagas/empresa-confidencial/titulo-original/1?x=%26%3C')
  })
  it.each([401, 403, 404, 500, 503])('upstream detail %s fails without redirect data', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(br)).mockResolvedValueOnce(json({}, status)))
    const response = await proxy(new NextRequest(`https://jobs.portalerp.com${path}`))
    expect(response.status).toBe(status < 500 ? 404 : 503); expect(response.headers.get('location')).toBeNull()
  })
  it('validates prepared collection against site locale without activating ES/EN sites', async () => {
    for (const [country, locale, collection] of [['mx', 'es-MX', 'vacantes'], ['co', 'es-CO', 'vacantes'], ['us', 'en-US', 'jobs']]) {
      const context = { ...br, site: { ...br.site, code: country.toUpperCase(), country_code: country.toUpperCase(), locale, url_prefix: `/${country}` }, locale }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(context)).mockResolvedValueOnce(json({ ...job, site_code: context.site.code })))
      const response = await proxy(new NextRequest(`https://jobs.portalerp.com/${country}/${collection}/wrong/wrong/1`))
      expect(response.status).toBe(301)
      expect(response.headers.get('location')).toBe(`https://jobs.portalerp.com/${country}/${collection}/empresa-original/titulo-original/1`)
      const fetcher = vi.fn().mockResolvedValueOnce(json(context)); vi.stubGlobal('fetch', fetcher)
      expect((await proxy(new NextRequest(`https://jobs.portalerp.com/${country}/vagas/a/b/1`))).status).toBe(404)
      expect(fetcher).toHaveBeenCalledTimes(1)
    }
  })
})
