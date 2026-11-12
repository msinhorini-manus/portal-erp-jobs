import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getSiteContext: vi.fn(), getJobs: vi.fn(), getCompanies: vi.fn(), getAreas: vi.fn(), getDashboardStats: vi.fn() }))
vi.stubGlobal('React', React)
vi.mock('@/lib/site-resolver.server', () => ({ getSiteContext: mocks.getSiteContext }))
vi.mock('@/lib/api', () => ({ getJobs: mocks.getJobs, getCompanies: mocks.getCompanies, getAreas: mocks.getAreas, getDashboardStats: mocks.getDashboardStats }))
vi.mock('@/components/RegionalLink', () => ({ default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => React.createElement('a', { ...props, href }, children) }))
vi.mock('@/lib/regional-navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/components/HeroSearch', () => ({ HeroSearch: () => React.createElement('form') }))
import HomePage from '@/app/(regional)/[country]/page'
import EmpresasPage from '@/app/(regional)/[country]/empresas/page'
import { JobSearchClient } from './JobSearchClient'
const site = { id: 1, code: 'BR', country_code: 'BR', is_active: true, locale: 'pt-BR', url_prefix: '/br', canonical_origin: 'https://jobs.portalerp.com' }
const employer = { company_id: 4, company_name: 'MegaSoft Renamed', company_profile_slug: 'megasoft' }
const job = { id: 1, title: 'ERP Consultant', ...employer, public_company_slug: 'job-brand', public_title_slug: 'consultant' }
beforeEach(() => {
  vi.clearAllMocks()
  mocks.getSiteContext.mockResolvedValue({ site, locale: site.locale })
  mocks.getJobs.mockResolvedValue({ jobs: [job] })
  mocks.getAreas.mockResolvedValue([])
  mocks.getDashboardStats.mockResolvedValue({})
  mocks.getCompanies.mockResolvedValue({ companies: [{ id: 4, company_name: 'MegaSoft Renamed', public_profile_slug: 'megasoft', site_id: 1, site_code: 'BR', status: 'approved' }], total: 1 })
})
describe('public company links across SSR surfaces', () => {
  it('home uses distinct job/profile snapshots without nested anchors', async () => {
    const html = renderToStaticMarkup(await HomePage())
    expect(html).toContain('href="/br/empresas/megasoft"')
    expect(html).toContain('href="/br/vagas/job-brand/consultant/1"')
    let anchorDepth = 0
    for (const token of html.matchAll(/<a(?:\s[^>]*|)>|<\/a>/g)) {
      anchorDepth += token[0] === '</a>' ? -1 : 1
      expect(anchorDepth).toBeLessThanOrEqual(1)
    }
    expect(anchorDepth).toBe(0)
    mocks.getJobs.mockResolvedValue({ jobs: [{ ...job, is_company_hidden: true }] })
    const hidden = renderToStaticMarkup(await HomePage())
    expect(hidden).toContain('Empresa Confidencial'); expect(hidden).not.toContain('megasoft'); expect(hidden).not.toContain('MegaSoft Renamed')
  })
  it('companies directory emits canonical descriptive profile links only', async () => {
    const html = renderToStaticMarkup(await EmpresasPage({ searchParams: Promise.resolve({}) }))
    expect(html).toContain('href="/br/empresas/megasoft"')
    expect(html).not.toContain('href="/empresas/4"')
  })
  it('job search employer links respect hidden flags, independent from job URLs', () => {
    const props = { locale: site.locale, initialJobs: [job], pagination: { total: 1, pages: 1, currentPage: 1, perPage: 20 }, areas: [], skills: [], levels: [], modalities: [], companies: [], searchParams: {} }
    const html = renderToStaticMarkup(<JobSearchClient {...props} />)
    expect(html).toContain('href="/empresas/megasoft"'); expect(html).toContain('href="/vagas/job-brand/consultant/1"')
    const hidden = renderToStaticMarkup(<JobSearchClient {...props} initialJobs={[{ ...job, is_company_hidden: true }]} />)
    expect(hidden).not.toContain('megasoft'); expect(hidden).not.toContain('MegaSoft Renamed'); expect(hidden).toContain('Empresa Confidencial')
  })
})
