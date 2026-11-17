import { afterEach, describe, expect, it, vi } from 'vitest'
import { recentJobCompanyPath, recentJobPublication, selectRecentJobs, type RecentJob } from './recent-jobs'
import type { RegionalSite } from './site'

const site: RegionalSite = { id: 1, code: 'BR', name: 'Brasil', country_code: 'BR', locale: 'pt-BR', currency_code: 'BRL', timezone: 'America/Sao_Paulo', canonical_origin: 'https://jobs.portalerp.com', url_prefix: '/br', is_active: true }
const job = (id: number | string, changes: Partial<RecentJob> = {}): RecentJob => ({ id, site_id: 1, site_code: 'BR', status: 'active', is_active: true, title: 'Consultoria ERP', public_title_slug: 'consultoria-erp', public_company_slug: 'empresa-publica', created_at: '2026-11-01T12:00:00Z', ...changes })
afterEach(() => vi.useRealTimers())

describe('recent jobs selection', () => {
  it('sorts publication descending, then numeric ID descending, without mutating arrays or records', () => {
    const input = Object.freeze([
      Object.freeze(job(2)),
      Object.freeze(job(10)),
      Object.freeze(job(4, { created_at: '2026-11-02T00:00:00Z' })),
      Object.freeze(job(7, { created_at: '2026-10-30T00:00:00Z' })),
    ])
    const result = selectRecentJobs(input, site)
    expect(result.map(item => item.id)).toEqual([4, 10, 2, 7])
    expect(input.map(item => item.id)).toEqual([2, 10, 4, 7])
    expect(result[0]).toBe(input[2])
  })

  it('never prioritizes members or changes the established date/ID order and 20-card limit', () => {
    const input = Array.from({ length: 24 }, (_, index) => job(index + 1, { company_is_member: index % 2 === 0 }))
    expect(selectRecentJobs(input, site).map(item => item.id)).toEqual(selectRecentJobs(input.map(item => ({ ...item, company_is_member: false })), site).map(item => item.id))
    expect(selectRecentJobs(input, site)).toHaveLength(20)
    expect(selectRecentJobs([
      job(9, { company_is_member: true, created_at: '2026-10-01T12:00:00Z' }),
      job(1, { company_is_member: false, created_at: '2026-11-01T12:00:00Z' }),
    ], site).map(item => item.id)).toEqual([1, 9])
  })

  it('puts missing and invalid dates last, with numeric ID tie-breaker', () => {
    const input = [job(2, { created_at: 'invalid' }), job(11, { created_at: undefined }), job(9, { created_at: null }), job(5, { created_at: '' }), job(1)]
    expect(selectRecentJobs(input, site).map(item => item.id)).toEqual([1, 11, 9, 5, 2])
  })

  it('compares actual instants including timezone offsets and string IDs', () => {
    const input = [job('2', { created_at: '2026-11-01T09:00:00-03:00' }), job('10', { created_at: '2026-11-01T12:00:00Z' }), job('3', { created_at: '2026-11-01T12:01:00Z' })]
    expect(selectRecentJobs(input, site).map(item => item.id)).toEqual(['3', '10', '2'])
  })

  it.each([
    { is_active: false }, { status: 'pending' }, { status: 'draft' }, { status: 'suspended' },
    { site_id: 2 }, { site_code: 'MX' }, { id: 0 }, { id: 'bad' }, { id: '9007199254740992' },
    { public_title_slug: 'Bad/title' }, { public_company_slug: 'bad--slug' },
    { expires_at: 'invalid' }, { expires_at: '2020-01-01T00:00:00Z' },
  ])('rejects nonpublic, cross-region or corrupt URL DTO %j', changes => {
    expect(selectRecentJobs([job(1, changes)], site)).toEqual([])
  })

  it('honors the publicJob active/approved and expiration eligibility contract', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-17T12:00:00Z'))
    const input = [job(1, { status: 'approved', expires_at: '2026-11-18T12:00:00Z' }), job(2, { expires_at: '2026-11-17T12:00:00Z' }), job(3, { status: undefined })]
    expect(selectRecentJobs(input, site).map(item => item.id)).toEqual([3, 1])
  })

  it('filters before limiting to 20, never fills with fixtures or duplicates', () => {
    const input = [job(99, { status: 'draft' }), ...Array.from({ length: 25 }, (_, index) => job(index + 1))]
    const result = selectRecentJobs(input, site)
    expect(result).toHaveLength(20)
    expect(result.map(item => item.id)).toEqual(Array.from({ length: 20 }, (_, index) => 25 - index))
    expect(selectRecentJobs([], site)).toEqual([])
  })

  it.each([{ is_active: false }, { url_prefix: '/' }, { canonical_origin: null }])('does not render jobs from a nonroutable site %j', changes => {
    expect(selectRecentJobs([job(1)], { ...site, ...changes })).toEqual([])
  })
})

describe('recent job display metadata', () => {
  it('formats real publication in the site timezone rather than the server timezone', () => {
    const result = recentJobPublication(job(1, { created_at: '2026-11-17T01:00:00Z' }), site)
    expect(result).toEqual({ dateTime: '2026-11-17T01:00:00.000Z', label: '16/11/2026' })
  })

  it.each([undefined, null, '', 'invalid'])('omits missing or invalid publication %j', created_at => {
    expect(recentJobPublication(job(1, { created_at }), site)).toBeNull()
  })

  it('omits unformattable site timezone rather than inventing a publication date', () => {
    expect(recentJobPublication(job(1), { ...site, timezone: 'invalid/timezone' })).toBeNull()
  })

  it('uses only the company profile builder, never the brand snapshot or numeric company route', () => {
    expect(recentJobCompanyPath(job(1, { company_id: 7, company_profile_slug: 'perfil-publico' }), site)).toBe('/br/empresas/perfil-publico')
    expect(recentJobCompanyPath(job(1, { company_id: 7 }), site)).toBeNull()
    expect(recentJobCompanyPath(job(1, { company_id: 7, company_profile_slug: 'search' }), site)).toBeNull()
    expect(recentJobCompanyPath(job(1, { company_id: 7, company_profile_slug: 'perfil-publico', is_company_hidden: true }), site)).toBeNull()
  })
})
