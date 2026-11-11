import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ headers: vi.fn() }))
vi.mock('next/headers', () => ({ headers: mocks.headers }))
import { resolveSiteFor, activeSitesFor, RegionalApiError } from './site-resolver.server'
import { fetchAPI, ApiError, getCompanyById, getCompanyBySlug } from './api'
import { proxy } from '../proxy'
import type { RegionalContext } from './site'
import type { InternalReadInit } from './internal-read-fetch'

const br: RegionalContext = { site: { id: 1, code: 'BR', name: 'Brasil', country_code: 'BR', locale: 'pt-BR', currency_code: 'BRL', timezone: 'America/Sao_Paulo', canonical_origin: 'https://jobs.portalerp.com', url_prefix: '/br', is_active: true }, locale: 'pt-BR' }
const company = { id: 4, site_id: 1, site_code: 'BR', company_name: 'MegaSoft', public_profile_slug: 'megasoft', status: 'approved' }
const job = { id: 1, site_id: 1, site_code: 'BR', title: 'Title', company_name: 'Company', public_company_slug: 'company', public_title_slug: 'title', is_active: true, status: 'active' }
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status })
const close = () => new TypeError('fetch failed', { cause: Object.assign(new Error('other side closed'), { name: 'SocketError', code: 'UND_ERR_SOCKET', socket: { bytesRead: 1909, bytesWritten: 522 } }) })
const fetcher = vi.fn<typeof fetch>()
beforeEach(() => {
  fetcher.mockReset(); vi.stubGlobal('fetch', fetcher)
  mocks.headers.mockResolvedValue(new Headers({ host: 'jobs.portalerp.com', 'x-next-regional-country': 'br', Cookie: 'browser-secret', Authorization: 'Bearer browser-secret' }))
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
function anonymous(init?: RequestInit) {
  const headers = new Headers(init?.headers)
  expect(headers.get('X-Regional-Host')).toBe('jobs.portalerp.com')
  expect(headers.get('X-Regional-Prefix')).toBe('/br')
  for (const name of ['Cookie', 'Authorization', 'X-Next-Regional-Country', 'X-Forwarded-Host']) expect(headers.has(name)).toBe(false)
}

describe('server context/sites read integration', () => {
  it.each(['context', 'sites'])('retries the %s socket error preserving live no-store and regional identity', async endpoint => {
    fetcher.mockRejectedValueOnce(close()).mockResolvedValueOnce(json(endpoint === 'context' ? br : { sites: [br.site] }))
    const result = endpoint === 'context' ? await resolveSiteFor('jobs.portalerp.com', '/br') : await activeSitesFor('jobs.portalerp.com', '/br')
    expect(result).toEqual(endpoint === 'context' ? br : [br.site])
    expect(fetcher).toHaveBeenCalledTimes(2)
    for (const [url, init] of fetcher.mock.calls) {
      expect(url).toBe(`http://127.0.0.1:5000/api/${endpoint}`)
      expect(init?.cache).toBe('no-store'); anonymous(init)
    }
    expect(new Headers(fetcher.mock.calls[0][1]?.headers).has('Connection')).toBe(false)
    expect(new Headers(fetcher.mock.calls[1][1]?.headers).get('Connection')).toBe('close')
  })
  it.each([401, 403, 404, 429, 500, 503])('preserves context HTTP %s without retry', async status => {
    fetcher.mockResolvedValueOnce(json({}, status))
    await expect(resolveSiteFor('jobs.portalerp.com', '/br')).rejects.toMatchObject({ status, name: 'Error' })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('does not conceal malformed sites data or fall back to BR on a second context failure', async () => {
    fetcher.mockResolvedValueOnce(json({ sites: null }))
    await expect(activeSitesFor('jobs.portalerp.com', '/br')).rejects.toThrow('Invalid active sites response')
    expect(fetcher).toHaveBeenCalledTimes(1)
    fetcher.mockReset().mockRejectedValueOnce(close()).mockRejectedValueOnce(close())
    await expect(resolveSiteFor('jobs.portalerp.com', '/br')).rejects.toBeInstanceOf(TypeError)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('keeps inactive or mismatched contexts invalid even after transport recovers', async () => {
    fetcher.mockRejectedValueOnce(close()).mockResolvedValueOnce(json({ ...br, site: { ...br.site, url_prefix: '/mx' } }))
    await expect(resolveSiteFor('jobs.portalerp.com', '/br')).rejects.toBeInstanceOf(RegionalApiError)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})

describe('proxy read integration preserves definitive HTTP/503 behavior', () => {
  const routes = [
    { path: '/br/empresas/megasoft', endpoint: 'companies/by-slug/megasoft', data: company },
    { path: '/br/vagas/company/title/1', endpoint: 'jobs/1', data: job },
  ]
  it.each(routes)('recovers $endpoint using anonymous same-region detail and redirect error', async ({ path, endpoint, data }) => {
    fetcher.mockResolvedValueOnce(json(br)).mockRejectedValueOnce(close()).mockResolvedValueOnce(json(data))
    const response = await proxy(new NextRequest(`https://jobs.portalerp.com${path}`, { headers: { host: 'jobs.portalerp.com', Cookie: 'browser-secret', Authorization: 'Bearer browser-secret', 'X-Regional-Prefix': '/mx' } }))
    expect(response.status).toBe(200); expect(response.headers.get('location')).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(3)
    for (const [url, init] of fetcher.mock.calls.slice(1)) {
      expect(url).toBe(`http://127.0.0.1:5000/api/${endpoint}`)
      expect(init?.cache).toBe('no-store'); expect(init?.redirect).toBe('error'); anonymous(init)
    }
    expect(new Headers(fetcher.mock.calls[1][1]?.headers).has('Connection')).toBe(false)
    expect(new Headers(fetcher.mock.calls[2][1]?.headers).get('Connection')).toBe('close')
  })
  it('recovers regional context once without leaking browser auth into the retry', async () => {
    fetcher.mockRejectedValueOnce(close()).mockResolvedValueOnce(json(br))
    expect((await proxy(new NextRequest('https://jobs.portalerp.com/br/empresas', { headers: { Cookie: 'secret', Authorization: 'Bearer secret' } }))).status).toBe(200)
    expect(fetcher).toHaveBeenCalledTimes(2)
    for (const [, init] of fetcher.mock.calls) { anonymous(init); expect(init?.cache).toBe('no-store') }
  })
  it.each(routes)('keeps repeated detail socket failure as 503: $endpoint', async ({ path }) => {
    fetcher.mockResolvedValueOnce(json(br)).mockRejectedValueOnce(close()).mockRejectedValueOnce(close())
    const response = await proxy(new NextRequest(`https://jobs.portalerp.com${path}`))
    expect(response.status).toBe(503); expect(response.headers.get('location')).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(3)
  })
  it.each(routes)('keeps unknown detail failures as one-attempt 503: $endpoint', async ({ path }) => {
    fetcher.mockResolvedValueOnce(json(br)).mockRejectedValueOnce(new Error('offline'))
    expect((await proxy(new NextRequest(`https://jobs.portalerp.com${path}`))).status).toBe(503)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it.each(routes)('keeps response-body socket failures as 503 without retry: $endpoint', async ({ path }) => {
    fetcher.mockResolvedValueOnce(json(br)).mockResolvedValueOnce({ ok: true, status: 200, json: vi.fn().mockRejectedValueOnce(close()) } as unknown as Response)
    expect((await proxy(new NextRequest(`https://jobs.portalerp.com${path}`))).status).toBe(503)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it.each(routes)('keeps invalid JSON as 503 without retry: $endpoint', async ({ path }) => {
    fetcher.mockResolvedValueOnce(json(br)).mockResolvedValueOnce(new Response('{'))
    expect((await proxy(new NextRequest(`https://jobs.portalerp.com${path}`))).status).toBe(503)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it.each([401, 403, 429, 500, 503])('keeps context HTTP %s as 503 without retry', async status => {
    fetcher.mockResolvedValueOnce(json({}, status))
    expect((await proxy(new NextRequest('https://jobs.portalerp.com/br/empresas'))).status).toBe(503)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('keeps two context socket failures as 503 with no cross-region/fallback read', async () => {
    fetcher.mockRejectedValueOnce(close()).mockRejectedValueOnce(close())
    expect((await proxy(new NextRequest('https://jobs.portalerp.com/br/empresas'))).status).toBe(503)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(Array(2).fill('http://127.0.0.1:5000/api/context'))
  })
})

describe('fetchAPI selects bounded transport ONLY for GET', () => {
  it.each([undefined, 'GET', 'get'])('retries GET %s preserving revalidate and regional/custom tags', async method => {
    fetcher.mockRejectedValueOnce(close()).mockResolvedValueOnce(json({ result: true }))
    expect(await fetchAPI('/companies/4', { method, context: br, next: { revalidate: 120, tags: ['custom'] }, redirect: 'error', headers: { Accept: 'application/json', 'X-Regional-Prefix': '/mx' } })).toEqual({ result: true })
    expect(fetcher).toHaveBeenCalledTimes(2)
    for (const [url, init] of fetcher.mock.calls) {
      expect(url).toBe('http://127.0.0.1:5000/api/companies/4'); anonymous(init)
      expect(init?.redirect).toBe('error')
      expect((init as InternalReadInit).next).toEqual({ revalidate: 120, tags: ['custom', 'regional:jobs.portalerp.com:/br:1:pt-BR'] })
    }
  })
  it('preserves getCompanyById no-store and redirect error on both attempts', async () => {
    fetcher.mockRejectedValueOnce(close()).mockResolvedValueOnce(json(company))
    expect(await getCompanyById('4', { context: br })).toEqual(company)
    expect(fetcher).toHaveBeenCalledTimes(2)
    for (const [, init] of fetcher.mock.calls) { expect(init?.cache).toBe('no-store'); expect(init?.redirect).toBe('error'); expect((init as InternalReadInit).next).toBeUndefined() }
  })
  it('public by-slug GET strips credentials on both bounded transport attempts', async () => {
    fetcher.mockRejectedValueOnce(close()).mockResolvedValueOnce(json(company))
    expect(await getCompanyBySlug('megasoft', { context: br, headers: { Cookie: 'explicit-private', Authorization: 'Bearer explicit-private' } })).toEqual(company)
    expect(fetcher).toHaveBeenCalledTimes(2)
    for (const [url, init] of fetcher.mock.calls) {
      expect(url).toBe('http://127.0.0.1:5000/api/companies/by-slug/megasoft')
      anonymous(init); expect(init?.credentials).toBe('omit'); expect(init?.redirect).toBe('error'); expect(init?.cache).toBe('no-store')
    }
  })
  it.each(['search', 'by-slug', '123', 'BAD', 'a%2Fb'])('public by-slug rejects %s without transport', async slug => {
    await expect(getCompanyBySlug(slug, { context: br })).rejects.toMatchObject({ status: 404 })
    expect(fetcher).not.toHaveBeenCalled()
  })
  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])('keeps original single fetch for %s, including original mutation options', async method => {
    const error = close()
    fetcher.mockRejectedValueOnce(error)
    await expect(fetchAPI('/companies/4', { method, context: br, cache: 'no-store', redirect: 'error', ...(method === 'HEAD' ? {} : { body: '{}' }), headers: { Authorization: 'Bearer explicit-server-option' } })).rejects.toBe(error)
    expect(fetcher).toHaveBeenCalledTimes(1)
    const init = fetcher.mock.calls[0][1]
    expect(init?.method).toBe(method); expect(init?.cache).toBe('no-store'); expect(init?.redirect).toBe('error')
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer explicit-server-option')
    expect(new Headers(init?.headers).has('Connection')).toBe(false)
    if (method !== 'HEAD') expect(init?.body).toBe('{}')
  })
  it.each([401, 403, 404, 429, 500, 503])('preserves ApiError HTTP %s without retry', async status => {
    fetcher.mockResolvedValueOnce(json({}, status))
    await expect(fetchAPI('/companies/4', { context: br })).rejects.toMatchObject({ status })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('keeps a retry HTTP error as ApiError without a third request', async () => {
    fetcher.mockRejectedValueOnce(close()).mockResolvedValueOnce(json({}, 503))
    await expect(fetchAPI('/companies/4', { context: br })).rejects.toBeInstanceOf(ApiError)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('keeps malformed JSON after a response and never retries parsing', async () => {
    fetcher.mockResolvedValueOnce(new Response('{'))
    await expect(fetchAPI('/companies/4', { context: br })).rejects.toBeInstanceOf(SyntaxError)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
