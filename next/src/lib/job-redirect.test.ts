import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RegionalSite } from './site'
const mocks = vi.hoisted(() => ({ getSiteContext: vi.fn(), getJobById: vi.fn() }))
vi.mock('./site-resolver.server', () => ({ getSiteContext: mocks.getSiteContext, RegionalApiError: class extends Error { constructor(public status: number) { super('regional unavailable') } } }))
vi.mock('./api', () => ({ getJobById: mocks.getJobById, ApiError: class extends Error { constructor(public status: number) { super('API unavailable') } } }))
import { ApiError } from './api'
import { GET, HEAD } from '../app/(regional)/[country]/vagas/[companySlug]/route'
import { GET as localizedGET, HEAD as localizedHEAD } from '../app/(regional)/[country]/[collection]/[companySlug]/route'
const site: RegionalSite = { id: 1, code: 'BR', name: 'Brasil', country_code: 'BR', locale: 'pt-BR', currency_code: 'BRL', timezone: 'America/Sao_Paulo', canonical_origin: 'https://jobs.portalerp.com', url_prefix: '/br', is_active: true }
const context = { site, locale: site.locale }
const job = { id: 1, site_id: 1, public_company_slug: 'empresa-original', public_title_slug: 'titulo-original', title: 'Atual', company_name: 'Atual', is_active: true, status: 'active' }
function params(id = '1', country = 'br', collection?: string) { return { params: Promise.resolve({ companySlug: id, country, ...(collection ? { collection } : {}) }) } }
beforeEach(() => { vi.resetAllMocks(); mocks.getSiteContext.mockResolvedValue(context); mocks.getJobById.mockResolvedValue(job) })
describe('rejected numeric public job route HTTP contract', () => {
  it.each([['GET', GET], ['HEAD', HEAD]] as const)('returns EXACT HTTP404 without Location or body on %s, ignoring host/query', async (method, handler) => {
    const response = await handler(new Request('https://evil.invalid/br/vagas/1?utm_source=a&next=https%3A%2F%2Fevil.invalid', { method }), params())
    expect(response.status).toBe(404)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('x-robots-tag')).toBe('noindex')
    expect(await response.text()).toBe('')
    expect(mocks.getSiteContext).not.toHaveBeenCalled()
    expect(mocks.getJobById).not.toHaveBeenCalled()
  })
  it.each(['0', '-1', 'NaN', '1e3', '9007199254740992', '999999999999999999999999999'])('rejects %s without contacting API', async id => {
    const response = await GET(new Request('https://jobs.portalerp.com/br/vagas/1'), params(id))
    expect(response.status).toBe(404); expect(response.headers.get('location')).toBeNull(); expect(mocks.getJobById).not.toHaveBeenCalled()
  })
  it('rejects 01 without normalizing to a public identity', async () => {
    const response = await GET(new Request('https://jobs.portalerp.com/br/vagas/01'), params('01'))
    expect(response.status).toBe(404); expect(response.headers.get('location')).toBeNull()
    expect(mocks.getJobById).not.toHaveBeenCalled()
  })
  it.each([{ ...job, is_active: false }, { ...job, status: 'draft' }, { ...job, site_id: 2 }, { ...job, site_code: 'MX' }, { ...job, id: 2 }, { ...job, expires_at: '2001-01-01' }])('never reveals labels of unavailable/out-of-region data', async data => {
    mocks.getJobById.mockResolvedValue(data)
    const response = await GET(new Request('https://jobs.portalerp.com/br/vagas/1'), params())
    expect(response.status).toBe(404); expect(response.headers.get('location')).toBeNull(); expect(await response.text()).toBe('')
    expect(mocks.getJobById).not.toHaveBeenCalled()
  })
  it.each([401, 403, 404, 500, 503])('numeric 404 does not depend on upstream %s', async status => {
    mocks.getJobById.mockRejectedValue(new ApiError(status))
    const response = await GET(new Request('https://jobs.portalerp.com/br/vagas/1'), params())
    expect(response.status).toBe(404); expect(response.headers.get('location')).toBeNull()
    expect(mocks.getJobById).not.toHaveBeenCalled()
  })
  it('does not expose hidden company even with a real snapshot', async () => {
    mocks.getJobById.mockResolvedValue({ ...job, is_company_hidden: true })
    const response = await HEAD(new Request('https://jobs.portalerp.com/br/vagas/1', { method: 'HEAD' }), params())
    expect(response.status).toBe(404); expect(response.headers.get('location')).toBeNull()
    expect(mocks.getJobById).not.toHaveBeenCalled()
  })
  it('rejects localized numerical URLs without activating sites or reading entities', async () => {
    for (const [country, collection] of [['br', 'jobs'], ['mx', 'vacantes'], ['co', 'vacantes'], ['us', 'jobs'], ['zz', 'vagas']]) {
      for (const [method, handler] of [['GET', localizedGET], ['HEAD', localizedHEAD]] as const) {
        const response = await handler(new Request(`https://jobs.portalerp.com/${country}/${collection}/1`, { method }), params('1', country, collection))
        expect(response.status).toBe(404); expect(response.headers.get('location')).toBeNull()
      }
    }
    expect(mocks.getSiteContext).not.toHaveBeenCalled()
    expect(mocks.getJobById).not.toHaveBeenCalled()
  })
  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])('keeps unsupported %s at 405 without Location or backend calls', async method => {
    const response = await GET(new Request('https://jobs.portalerp.com/br/vagas/1', { method }), params())
    expect(response.status).toBe(405); expect(response.headers.get('allow')).toBe('GET, HEAD')
    expect(response.headers.get('location')).toBeNull(); expect(await response.text()).toBe('')
    expect(mocks.getSiteContext).not.toHaveBeenCalled(); expect(mocks.getJobById).not.toHaveBeenCalled()
  })
})
