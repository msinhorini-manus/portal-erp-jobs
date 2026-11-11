import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getSiteContext: vi.fn(), getCompanyById: vi.fn(), notFound: vi.fn(() => { throw Object.assign(new Error('NEXT_HTTP_ERROR_FALLBACK;404'), { digest: 'NEXT_HTTP_ERROR_FALLBACK;404' }) }), permanentRedirect: vi.fn() }))
vi.stubGlobal('React', React)
vi.mock('@/lib/site-resolver.server', () => ({ getSiteContext: mocks.getSiteContext }))
vi.mock('@/lib/api', () => ({ ApiError: class ApiError extends Error { constructor(public status: number) { super(`API ${status}`) } }, getCompanyById: mocks.getCompanyById }))
vi.mock('next/navigation', () => ({ notFound: mocks.notFound, permanentRedirect: mocks.permanentRedirect }))
vi.mock('@/components/RegionalLink', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => React.createElement('a', { href }, children) }))
import { ApiError } from '@/lib/api'
import CompanyDetailPage, { generateMetadata } from './CompanyDetailPage.server'
import type { RegionalSite } from '@/lib/site'
const site: RegionalSite = { id: 1, code: 'BR', name: 'Brasil', country_code: 'BR', locale: 'pt-BR', currency_code: 'BRL', timezone: 'America/Sao_Paulo', canonical_origin: 'https://jobs.portalerp.com', url_prefix: '/br', is_active: true }
const company = { id: 4, site_id: 1, site_code: 'BR', company_name: 'MegaSoft Renamed', public_profile_slug: 'megasoft', status: 'approved', description: 'Synthetic public profile', sector: 'ERP', website: 'https://example.invalid', jobs: [{ id: 1, site_id: 1, site_code: 'BR', title: 'ERP Consultant', public_company_slug: 'job-company', public_title_slug: 'consultant', is_active: true, status: 'active' }, { id: 2, title: 'Hidden job', is_company_hidden: true }, { id: 3, title: 'Cross-region', site_id: 2 }, { id: 5, title: 'Inactive', is_active: false }] }
const params = (changes = {}) => Promise.resolve({ country: 'br', collection: 'empresas', companySlug: 'megasoft', id: '4', ...changes })
beforeEach(() => { vi.clearAllMocks(); mocks.getSiteContext.mockResolvedValue({ site, locale: site.locale }); mocks.getCompanyById.mockResolvedValue(company) })
describe('company SSR exact descriptive canonical without redirects', () => {
  it('retains all public profile sections, snapshot canonical, OG and Organization identity', async () => {
    const canonical = 'https://jobs.portalerp.com/br/empresas/megasoft/4'
    const metadata = await generateMetadata({ params: params() })
    expect(metadata.alternates?.canonical).toBe(canonical)
    expect(metadata.openGraph).toMatchObject({ url: canonical, locale: 'pt_BR' })
    const html = renderToStaticMarkup(await CompanyDetailPage({ params: params() }))
    expect(html).toContain(`"@id":"${canonical}#organization"`); expect(html).toContain(`"url":"${canonical}"`)
    for (const text of ['MegaSoft Renamed', 'Synthetic public profile', 'Sobre a Empresa', 'Informações', 'Quer trabalhar aqui?', 'Vagas Abertas (1)', '/br/vagas/job-company/consultant/1']) expect(html).toContain(text)
    for (const text of ['Hidden job', 'Cross-region', 'Inactive', '/empresas/4']) expect(html).not.toContain(text)
    expect(mocks.getCompanyById).toHaveBeenCalledWith('4', expect.objectContaining({ country: 'br', cache: 'no-store', context: { site, locale: site.locale } }))
    expect(mocks.permanentRedirect).not.toHaveBeenCalled()
  })
  it.each([{ companySlug: 'wrong' }, { companySlug: 'MegaSoft' }, { id: '04' }, { id: '0' }, { id: '9007199254740992' }, { collection: 'companies' }, { country: 'mx' }])('fails route mismatch %j with noindex and no redirect', async changes => {
    const metadata = await generateMetadata({ params: params(changes) })
    expect(metadata).toEqual({ title: 'Empresa não encontrada', robots: { index: false, follow: false } })
    await expect(CompanyDetailPage({ params: params(changes) })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    expect(mocks.permanentRedirect).not.toHaveBeenCalled()
  })
  it.each([{ site_id: 2 }, { site_id: undefined }, { status: 'pending' }, { status: 'suspended' }, { is_active: false }, { id: 5 }])('fails entity mismatch %j', async changes => {
    mocks.getCompanyById.mockResolvedValue({ ...company, ...changes })
    await expect(CompanyDetailPage({ params: params() })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    expect((await generateMetadata({ params: params() })).robots).toEqual({ index: false, follow: false })
  })
  it.each([400, 401, 403, 404])('definitive API %s becomes 404 without canonical', async status => {
    mocks.getCompanyById.mockRejectedValue(new ApiError(status))
    await expect(CompanyDetailPage({ params: params() })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    expect((await generateMetadata({ params: params() })).alternates).toBeUndefined()
  })
  it.each([429, 500, 503])('does not swallow API %s as a successful 404', async status => {
    mocks.getCompanyById.mockRejectedValue(new ApiError(status))
    await expect(CompanyDetailPage({ params: params() })).rejects.toThrow(`API ${status}`)
    await expect(generateMetadata({ params: params() })).rejects.toThrow(`API ${status}`)
    expect(mocks.notFound).not.toHaveBeenCalled()
  })
  it.each([['mx', 'es-MX', 'empresas', 'es_MX'], ['us', 'en-US', 'companies', 'en_US']])('uses validated locale-specific collection for %s', async (country, locale, collection, ogLocale) => {
    const localSite = { ...site, code: country.toUpperCase(), country_code: country.toUpperCase(), url_prefix: `/${country}`, locale }
    mocks.getSiteContext.mockResolvedValue({ site: localSite, locale })
    mocks.getCompanyById.mockResolvedValue({ ...company, site_code: localSite.code, jobs: [] })
    const metadata = await generateMetadata({ params: params({ country, collection }) })
    expect(metadata.alternates?.canonical).toBe(`https://jobs.portalerp.com/${country}/${collection}/megasoft/4`)
    expect(metadata.openGraph).toMatchObject({ locale: ogLocale })
    mocks.getSiteContext.mockResolvedValue({ site: { ...localSite, is_active: false }, locale })
    await expect(CompanyDetailPage({ params: params({ country, collection }) })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
  })
})
