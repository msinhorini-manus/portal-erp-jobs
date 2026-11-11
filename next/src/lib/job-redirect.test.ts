import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RegionalSite } from './site'
const mocks = vi.hoisted(() => ({ getSiteContext: vi.fn(), getJobById: vi.fn() }))
vi.mock('./site-resolver.server', () => ({ getSiteContext: mocks.getSiteContext, RegionalApiError: class extends Error { constructor(public status: number) { super('regional unavailable') } } }))
vi.mock('./api', () => ({ getJobById: mocks.getJobById, ApiError: class extends Error { constructor(public status: number) { super('API unavailable') } } }))
import { ApiError } from './api'
import { GET, HEAD } from '../app/(regional)/[country]/vagas/[companySlug]/route'
import { GET as localizedGET } from '../app/(regional)/[country]/[collection]/[companySlug]/route'
const site: RegionalSite = { id: 1, code: 'BR', name: 'Brasil', country_code: 'BR', locale: 'pt-BR', currency_code: 'BRL', timezone: 'America/Sao_Paulo', canonical_origin: 'https://jobs.portalerp.com', url_prefix: '/br', is_active: true }
const context = { site, locale: site.locale }
const job = { id: 1, site_id: 1, public_company_slug: 'empresa-original', public_title_slug: 'titulo-original', title: 'Atual', company_name: 'Atual', is_active: true, status: 'active' }
function params(id = '1', country = 'br', collection?: string) { return { params: Promise.resolve({ companySlug: id, country, ...(collection ? { collection } : {}) }) } }
beforeEach(() => { vi.resetAllMocks(); mocks.getSiteContext.mockResolvedValue(context); mocks.getJobById.mockResolvedValue(job) })
describe('numeric public job route HTTP contract', () => {
  it.each([GET, HEAD])('returns EXACT HTTP301 same-origin with query and no body, never 308', async handler => {
    const response = await handler(new Request('https://evil.invalid/br/vagas/1?utm_source=a&next=https%3A%2F%2Fevil.invalid'), params())
    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('https://jobs.portalerp.com/br/vagas/empresa-original/titulo-original/1?utm_source=a&next=https%3A%2F%2Fevil.invalid')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.text()).toBe('')
    expect(mocks.getJobById).toHaveBeenCalledWith('1', { country: 'br', context, cache: 'no-store' })
  })
  it.each(['0', '-1', 'NaN', '1e3', '9007199254740992', '999999999999999999999999999'])('rejects %s without contacting API', async id => {
    const response = await GET(new Request('https://jobs.portalerp.com/br/vagas/1'), params(id))
    expect(response.status).toBe(404); expect(response.headers.get('location')).toBeNull(); expect(mocks.getJobById).not.toHaveBeenCalled()
  })
  it('normalizes 01 directly to friendly identity 1 without numeric chain', async () => {
    expect((await GET(new Request('https://jobs.portalerp.com/br/vagas/01'), params('01'))).headers.get('location')).toBe('https://jobs.portalerp.com/br/vagas/empresa-original/titulo-original/1')
  })
  it.each([{ ...job, is_active: false }, { ...job, status: 'draft' }, { ...job, site_id: 2 }, { ...job, site_code: 'MX' }, { ...job, id: 2 }, { ...job, expires_at: '2001-01-01' }])('never reveals labels of unavailable/out-of-region data', async data => {
    mocks.getJobById.mockResolvedValue(data)
    const response = await GET(new Request('https://jobs.portalerp.com/br/vagas/1'), params())
    expect(response.status).toBe(404); expect(response.headers.get('location')).toBeNull(); expect(await response.text()).toBe('')
  })
  it.each([401, 403, 404, 500, 503])('upstream %s fails without Location', async status => {
    mocks.getJobById.mockRejectedValue(new ApiError(status))
    const response = await GET(new Request('https://jobs.portalerp.com/br/vagas/1'), params())
    expect(response.status).toBe(status >= 500 ? 503 : 404); expect(response.headers.get('location')).toBeNull()
  })
  it('does not expose hidden company even with a real snapshot', async () => {
    mocks.getJobById.mockResolvedValue({ ...job, is_company_hidden: true })
    expect((await HEAD(new Request('https://jobs.portalerp.com/br/vagas/1', { method: 'HEAD' }), params())).headers.get('location')).toBe('https://jobs.portalerp.com/br/vagas/empresa-confidencial/titulo-original/1')
  })
  it('rejects collection/locale mismatch before entity fetch and prepares MX/CO/EN without activating sites', async () => {
    expect((await localizedGET(new Request('https://jobs.portalerp.com/br/jobs/1'), params('1', 'br', 'jobs'))).status).toBe(404)
    expect(mocks.getJobById).not.toHaveBeenCalled()
    for (const [country, locale, collection] of [['mx', 'es-MX', 'vacantes'], ['co', 'es-CO', 'vacantes'], ['us', 'en-US', 'jobs']]) {
      mocks.getSiteContext.mockResolvedValue({ site: { ...site, country_code: country.toUpperCase(), code: country.toUpperCase(), url_prefix: `/${country}`, locale }, locale })
      expect((await localizedGET(new Request(`https://jobs.portalerp.com/${country}/${collection}/1`), params('1', country, collection))).headers.get('location')).toBe(`https://jobs.portalerp.com/${country}/${collection}/empresa-original/titulo-original/1`)
    }
  })
})
