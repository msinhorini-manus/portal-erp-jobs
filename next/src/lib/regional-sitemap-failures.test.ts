import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RegionalSite } from './site'
const mocks = vi.hoisted(() => ({ headers: vi.fn(), getSiteContext: vi.fn(), resolveSiteFor: vi.fn(), activeSitesFor: vi.fn(), getJobs: vi.fn(), getCompanies: vi.fn(), getJobById: vi.fn() }))
vi.mock('next/headers', () => ({ headers: mocks.headers }))
vi.mock('./site-resolver.server', () => ({ getSiteContext: mocks.getSiteContext, resolveSiteFor: mocks.resolveSiteFor, activeSitesFor: mocks.activeSitesFor }))
vi.mock('./api', () => ({ ApiError: class ApiError extends Error { constructor(public status: number) { super(`API ${status}`) } }, getJobs: mocks.getJobs, getCompanies: mocks.getCompanies, getJobById: mocks.getJobById }))
import { ApiError } from './api'
import { GET as regionalGET } from '../app/(regional)/[country]/sitemap.xml/route'
import { GET as globalGET } from '../app/sitemap.xml/route'
import { collectAll, regionalSitemapXml } from './regional-sitemap'

const br: RegionalSite = { code: 'BR', name: 'Brasil', country_code: 'BR', locale: 'pt-BR', currency_code: 'BRL', timezone: 'America/Sao_Paulo', canonical_origin: 'https://jobs.portalerp.com', url_prefix: '/br', regional_base_url: 'https://jobs.portalerp.com/br', is_active: true }
const ctx = { site: br, locale: br.locale }
const regional = () => regionalGET(new Request('https://jobs.portalerp.com/br/sitemap.xml'), { params: Promise.resolve({ country: 'br' }) })
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('NEXT_DEFAULT_COUNTRY', 'br')
  vi.stubEnv('NEXT_GLOBAL_CANONICAL_ORIGIN', 'https://jobs.portalerp.com')
  mocks.headers.mockResolvedValue(new Headers({ host: 'jobs.portalerp.com' }))
  mocks.getSiteContext.mockResolvedValue(ctx)
  mocks.resolveSiteFor.mockResolvedValue(ctx)
  mocks.activeSitesFor.mockResolvedValue([br])
  mocks.getJobs.mockResolvedValue({ total: 2, pages: 1, jobs: [{ id: 1 }, { id: 2 }] })
  mocks.getCompanies.mockResolvedValue({ total: 1, pages: 1, companies: [{ id: 1, status: 'approved' }] })
  mocks.getJobById.mockImplementation(async (id: string) => ({ id, status: 'active' }))
})
afterEach(() => vi.unstubAllEnvs())
async function unavailable(response: Response, body: string) {
  expect(response.status).toBe(503)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(response.headers.get('Retry-After')).toBe('60')
  expect(await response.text()).toBe(body)
}

describe('regional sitemap failure handling', () => {
  it('returns 503, not a partial successful sitemap, when later inventory pages fail', async () => {
    mocks.getJobs.mockResolvedValueOnce({ total: 2, pages: 2, jobs: [{ id: 1 }] }).mockRejectedValueOnce(new Error('upstream unavailable'))
    await unavailable(await regional(), 'Sitemap inventory unavailable')
    expect(mocks.getJobById).not.toHaveBeenCalled()
  })
  it('rejects missing company inventory instead of silently publishing only jobs', async () => {
    mocks.getCompanies.mockResolvedValue({ total: 1, pages: 1 })
    await unavailable(await regional(), 'Sitemap inventory unavailable')
  })
  it.each([401, 403, 429, 500, 503])('returns safe 503 on critical detail status %s, never dropping live inventory silently', async status => {
    mocks.getJobById.mockRejectedValueOnce(new ApiError(status))
    await unavailable(await regional(), 'Sitemap inventory unavailable')
  })
  it('only skips definitive 404 details, preserving every remaining canonical and no-store', async () => {
    mocks.getJobById.mockRejectedValueOnce(new ApiError(404))
    const response = await regional()
    expect(response.status).toBe(200)
    const xml = await response.text()
    expect(xml).not.toContain('/vaga/1</loc>')
    expect(xml).toContain('/br/vagas/empresa/vaga/2</loc>')
    expect(xml).toContain('/br/empresas/1</loc>')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
  it('rejects malformed IDs/dates rather than publishing a corrupt XML inventory', () => {
    expect(() => regionalSitemapXml(br, [{ id: '../admin' }], [])).toThrow('Invalid sitemap entity ID')
    expect(() => regionalSitemapXml(br, [{ id: 1, updated_at: 'not-a-date' }], [])).toThrow('Invalid sitemap lastmod')
  })
  it('fails incomplete/invalid pagination and propagates later page failures', async () => {
    await expect(collectAll(async () => ({ total: 2, pages: 0, jobs: [] }), 'jobs')).rejects.toThrow('Incomplete')
    await expect(collectAll(async () => ({ pages: -1, jobs: [] }), 'jobs')).rejects.toThrow('pagination')
    await expect(collectAll(async () => ({ pages: 1.5, jobs: [] }), 'jobs')).rejects.toThrow('pagination')
    await expect(collectAll(async page => page === 1 ? { total: 2, pages: 2, jobs: [{ id: 1 }] } : { total: 2, pages: 2, jobs: [] }, 'jobs')).rejects.toThrow('Incomplete')
  })
})

describe('global sitemap failure handling', () => {
  it('only advertises active routable canonical-origin mappings', async () => {
    mocks.activeSitesFor.mockResolvedValue([br, { ...br, code: 'ZZ', country_code: 'ZZ', url_prefix: '/zz', canonical_origin: 'https://other.invalid', regional_base_url: 'https://other.invalid/zz' }])
    const response = await globalGET()
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('<loc>https://jobs.portalerp.com/br/sitemap.xml</loc>')
    expect(mocks.resolveSiteFor).toHaveBeenCalledTimes(2)
  })
  it('fails on inactive/default context outage rather than an empty 200 index', async () => {
    mocks.resolveSiteFor.mockRejectedValue(new Error('default context unavailable'))
    await unavailable(await globalGET(), 'Sitemap index unavailable')
  })
  it('fails on active-site inventory outage or empty mappings', async () => {
    mocks.activeSitesFor.mockRejectedValueOnce(new Error('sites unavailable'))
    await unavailable(await globalGET(), 'Sitemap index unavailable')
    mocks.activeSitesFor.mockResolvedValueOnce([])
    await unavailable(await globalGET(), 'Sitemap index unavailable')
  })
  it('fails when an advertised prefix resolves to a different site instead of publishing ambiguity', async () => {
    mocks.resolveSiteFor.mockResolvedValueOnce(ctx).mockResolvedValueOnce({ ...ctx, site: { ...br, code: 'ZZ' } })
    await unavailable(await globalGET(), 'Sitemap index unavailable')
  })
})
