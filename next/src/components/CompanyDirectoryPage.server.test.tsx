import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getSiteContext: vi.fn(), getCompanies: vi.fn(), pageMetadata: vi.fn() }))
vi.stubGlobal('React', React)
vi.mock('@/lib/site-resolver.server', () => ({ getSiteContext: mocks.getSiteContext }))
vi.mock('@/lib/api', () => ({ getCompanies: mocks.getCompanies }))
vi.mock('@/lib/regional-seo.server', () => ({ pageMetadata: mocks.pageMetadata }))
vi.mock('@/components/RegionalLink', () => ({ default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => React.createElement('a', { href, ...props }, children) }))
import EmpresasPage from '@/app/(regional)/[country]/empresas/page'
const site = { id: 1, code: 'BR', country_code: 'BR', locale: 'pt-BR', currency_code: 'BRL', timezone: 'America/Sao_Paulo', canonical_origin: 'https://jobs.portalerp.com', url_prefix: '/br', is_active: true }
const company = { id: 4, site_id: 1, site_code: 'BR', company_name: 'Empresa de Tecnologia', public_profile_slug: 'empresa-tecnologia', status: 'approved', description: 'Descrição original preservada', sector: 'ERP', city: 'São Paulo', state: 'SP', company_size: 'Grande', website: 'https://example.invalid', active_jobs_count: 3 }
beforeEach(() => {
  vi.clearAllMocks()
  mocks.getSiteContext.mockResolvedValue({ site, locale: site.locale })
  mocks.getCompanies.mockResolvedValue({ companies: [company], total: 1, pages: 1, current_page: 1 })
})
const render = async (searchParams = {}) => renderToStaticMarkup(await EmpresasPage({ searchParams: Promise.resolve(searchParams) }))
describe('company directory registered logos without redesign', () => {
  it('renders a registered logo in a 96×64px tile with object-contain and company name at 18px', async () => {
    const src = 'https://jobs.portalerp.com/br/api/companies/logos/example.png'
    mocks.getCompanies.mockResolvedValue({ companies: [{ ...company, logo_url: src }], total: 1 })
    const html = await render()
    expect(html).toContain(`src="${src}"`)
    expect(html).toContain('data-employer-logo="image"')
    expect(html).toContain('h-16 w-24 rounded-xl text-xl')
    expect(html).toContain('object-contain p-1')
    expect(html).toContain('break-words text-lg leading-6 font-bold')
    expect(html).toContain('min-w-0 flex-1')
    expect(html).not.toContain('lucide-building-2')
  })
  it('uses initials at the same size when no logo exists', async () => {
    const html = await render()
    expect(html).toContain('data-employer-logo="initials"')
    expect(html).toContain('h-16 w-24 rounded-xl text-xl')
    expect(html).toContain('>ED</span>')
    expect(html).not.toContain('<img')
  })
  it.each(['javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'http://example.invalid/x.png', '//example.invalid/x.png', 'https://user:pass@example.invalid/x.png', '/admin/users'])('rejects an unsafe image URL: %s', async logo_url => {
    mocks.getCompanies.mockResolvedValue({ companies: [{ ...company, logo_url }], total: 1 })
    const html = await render()
    expect(html).toContain('data-employer-logo="initials"')
    expect(html).not.toContain('<img')
    expect(html).not.toContain(logo_url)
  })
  it('preserves cards, public data, three-column grid and slug-only company links', async () => {
    const html = await render()
    for (const text of ['grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3', 'rounded-xl border border-gray-100 bg-white p-6 shadow-sm', '/br/empresas/empresa-tecnologia', 'Descrição original preservada', 'São Paulo', 'SP', 'ERP', 'Grande', '3 vaga(s) ativa(s)', 'Ver perfil e vagas']) expect(html).toContain(text)
    expect(html).not.toContain('/empresas/4')
  })
  it('preserves search inputs, twenty-result pagination and the regional form action', async () => {
    mocks.getCompanies.mockResolvedValue({ companies: [company], total: 24, pages: 2, current_page: 1 })
    const html = await render({ q: 'tecnologia', city: 'São Paulo', state: 'SP' })
    expect(mocks.getCompanies).toHaveBeenCalledWith({ q: 'tecnologia', city: 'São Paulo', state: 'SP', per_page: '20' })
    expect(html).toContain('action="/br/empresas"')
    expect(html).toContain('mb-8 grid grid-cols-1 gap-3')
    expect(html).toContain('Página 1 de 2')
    expect(html).toContain('page=2')
  })
  it('never renders logos or names from nonpublic or foreign-region companies', async () => {
    mocks.getCompanies.mockResolvedValue({ companies: [{ ...company, status: 'pending', company_name: 'Hidden Pending', logo_url: 'https://example.invalid/pending.png' }, { ...company, site_id: 2, company_name: 'Hidden Foreign', logo_url: 'https://example.invalid/foreign.png' }], total: 2 })
    const html = await render()
    expect(html).toContain('Nenhuma empresa encontrada')
    expect(html).not.toContain('Hidden Pending')
    expect(html).not.toContain('Hidden Foreign')
    expect(html).not.toContain('<img')
  })
  it('allows full long company names to wrap without truncation', async () => {
    const name = 'EmpresaComNomeMuitoLongoSemEspacos Consultoria de Sistemas Empresariais'
    mocks.getCompanies.mockResolvedValue({ companies: [{ ...company, company_name: name }], total: 1 })
    const html = await render()
    expect(html).toContain(name)
    expect(html).toContain('break-words text-lg')
    expect(html).not.toContain('truncate')
  })
})
