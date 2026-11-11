import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getSiteContext: vi.fn(), getJobById: vi.fn(), notFound: vi.fn(() => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404') }), permanentRedirect: vi.fn() }))
vi.stubGlobal('React', React)
vi.mock('@/lib/site-resolver.server', () => ({ getSiteContext: mocks.getSiteContext }))
vi.mock('@/lib/api', () => ({ getJobById: mocks.getJobById }))
vi.mock('next/navigation', () => ({ notFound: mocks.notFound, permanentRedirect: mocks.permanentRedirect }))
vi.mock('@/components/RegionalLink', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => React.createElement('a', { href }, children) }))
vi.mock('@/components/ApplyButton', () => ({ ApplyButton: ({ jobPath }: { jobPath: string }) => React.createElement('button', { 'data-job-path': jobPath }, 'Apply') }))
import JobDetailPage, { generateMetadata } from './JobDetailPage.server'
import type { RegionalSite } from '@/lib/site'
const site: RegionalSite = { id: 1, code: 'BR', name: 'Brasil', country_code: 'BR', locale: 'pt-BR', currency_code: 'BRL', timezone: 'America/Sao_Paulo', canonical_origin: 'https://jobs.portalerp.com', url_prefix: '/br', is_active: true }
const job = { id: 1, site_id: 1, site_code: 'BR', title: 'Updated title', company_name: 'Updated company', public_company_slug: 'empresa-original', public_title_slug: 'titulo-original', is_active: true, status: 'active', description: 'Synthetic public job', created_at: '2026-11-01', company: { website: 'https://example.invalid' } }
const params = (changes = {}) => Promise.resolve({ country: 'br', collection: 'vagas', companySlug: 'empresa-original', titleSlug: 'titulo-original', id: '1', ...changes })
beforeEach(() => { vi.clearAllMocks(); mocks.getSiteContext.mockResolvedValue({ site, locale: site.locale }); mocks.getJobById.mockResolvedValue(job) })
describe('job SSR exact friendly identity without permanent redirects', () => {
  it('retains snapshots, canonical, OG, JobPosting and apply return URL on an exact detail', async () => {
    const canonical = 'https://jobs.portalerp.com/br/vagas/empresa-original/titulo-original/1'
    const metadata = await generateMetadata({ params: params() })
    expect(metadata.alternates?.canonical).toBe(canonical)
    expect(metadata.openGraph).toMatchObject({ url: canonical, locale: 'pt_BR' })
    const html = renderToStaticMarkup(await JobDetailPage({ params: params() }))
    expect(html).toContain('"@type":"JobPosting"')
    expect(html).toContain(`"url":"${canonical}"`)
    expect(html).toContain('data-job-path="/br/vagas/empresa-original/titulo-original/1"')
    expect(mocks.permanentRedirect).not.toHaveBeenCalled()
  })
  it.each([{ companySlug: 'wrong' }, { titleSlug: 'wrong' }, { companySlug: 'Empresa-original' }, { id: '01' }, { collection: 'jobs' }])('returns 404 with noindex metadata on non-exact route %j without redirect', async changes => {
    const metadata = await generateMetadata({ params: params(changes) })
    expect(metadata).toEqual({ title: 'Vaga não encontrada', robots: { index: false, follow: false } })
    await expect(JobDetailPage({ params: params(changes) })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    expect(mocks.permanentRedirect).not.toHaveBeenCalled()
  })
  it('keeps hidden-company canonical while preventing real company data in metadata and SSR', async () => {
    mocks.getJobById.mockResolvedValue({ ...job, is_company_hidden: true })
    const hiddenParams = () => params({ companySlug: 'empresa-confidencial' })
    const metadata = await generateMetadata({ params: hiddenParams() })
    expect(metadata.alternates?.canonical).toBe('https://jobs.portalerp.com/br/vagas/empresa-confidencial/titulo-original/1')
    const html = renderToStaticMarkup(await JobDetailPage({ params: hiddenParams() }))
    expect(html).toContain('Empresa Confidencial'); expect(html).not.toContain('Updated company')
    expect(html).not.toContain('https://example.invalid')
    expect(mocks.permanentRedirect).not.toHaveBeenCalled()
  })
})
