import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getSiteContext: vi.fn(), getCompanies: vi.fn(), pageMetadata: vi.fn() }))
vi.stubGlobal('React', React)
vi.mock('@/lib/site-resolver.server', () => ({ getSiteContext: mocks.getSiteContext }))
vi.mock('@/lib/api', () => ({ getCompanies: mocks.getCompanies }))
vi.mock('@/lib/regional-seo.server', () => ({ pageMetadata: mocks.pageMetadata }))
vi.mock('@/components/RegionalLink', () => ({ default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => React.createElement('a', { href, ...props }, children) }))
import EmpresasPage, { generateMetadata } from '@/app/(regional)/[country]/empresas/page'
const site = { id: 1, code: 'BR', country_code: 'BR', locale: 'pt-BR', currency_code: 'BRL', timezone: 'America/Sao_Paulo', canonical_origin: 'https://jobs.portalerp.com', url_prefix: '/br', is_active: true }
const company = { id: 4, site_id: 1, site_code: 'BR', company_name: 'Empresa de Tecnologia', public_profile_slug: 'empresa-tecnologia', status: 'approved', description: 'Descrição original preservada', sector: 'ERP', city: 'São Paulo', state: 'SP', company_size: 'Grande', website: 'https://example.invalid', active_jobs_count: 3 }
beforeEach(() => {
  vi.clearAllMocks()
  mocks.getSiteContext.mockResolvedValue({ site, locale: site.locale })
  mocks.getCompanies.mockResolvedValue({ companies: [company], total: 1, pages: 1, current_page: 1 })
})
const render = async (searchParams = {}) => renderToStaticMarkup(await EmpresasPage({ searchParams: Promise.resolve(searchParams) }))
const cards = (html: string) => html.match(/<a\b[^>]*data-company-card="[^"]*"[^>]*>[\s\S]*?<\/a>/g) || []
const card = (html: string, id = company.id) => {
  const found = cards(html).find(item => item.includes(`data-company-card="${id}"`))
  expect(found).toBeDefined()
  return found!
}

describe('company directory registered logos without redesign', () => {
  it.each([false, true])('renders a registered logo in a 96×64px tile and company name at 18px for member=%s', async is_member => {
    const src = 'https://jobs.portalerp.com/br/api/companies/logos/example.png'
    mocks.getCompanies.mockResolvedValue({ companies: [{ ...company, logo_url: src, is_member }], total: 1 })
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
  it('preserves ordinary cards, public data, three-column grid and slug-only company links', async () => {
    const html = await render()
    for (const text of ['grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3', 'rounded-xl border border-gray-100 bg-white p-6 shadow-sm', '/br/empresas/empresa-tecnologia', 'Descrição original preservada', 'São Paulo', 'SP', 'ERP', 'Grande', '3 vagas ativas', 'Ver perfil e vagas']) expect(html).toContain(text)
    expect(html).not.toContain('/empresas/4')
    expect(card(html)).toContain('hover:border-portal-orange/30')
  })
  it.each([false, true])('preserves all search inputs, twenty-result pagination and regional action for member=%s', async is_member => {
    mocks.getCompanies.mockResolvedValue({ companies: [{ ...company, is_member }], total: 45, pages: 3, current_page: 2 })
    const html = await render({ q: 'tecnologia', sector: 'ERP', city: 'São Paulo', state: 'SP', page: '2' })
    expect(mocks.getCompanies).toHaveBeenCalledWith({ q: 'tecnologia', sector: 'ERP', city: 'São Paulo', state: 'SP', page: '2', per_page: '20' })
    expect(html).toContain('action="/br/empresas"')
    expect(html).toContain('mb-8 grid grid-cols-1 gap-3')
    for (const name of ['q', 'sector', 'city', 'state']) expect(html).toContain(`name="${name}"`)
    expect(html).toContain('value="tecnologia"')
    expect(html).toContain('value="ERP"')
    expect(html).toContain('value="São Paulo"')
    expect(html).toContain('value="SP"')
    expect(html).toContain('45 empresas encontradas')
    expect(html).toContain('Página 2 de 3')
    expect(html).toContain('href="/empresas?q=tecnologia&amp;sector=ERP&amp;city=S%C3%A3o+Paulo&amp;state=SP&amp;page=1"')
    expect(html).toContain('href="/empresas?q=tecnologia&amp;sector=ERP&amp;city=S%C3%A3o+Paulo&amp;state=SP&amp;page=3"')
    expect(html).not.toContain('per_page=')
  })
  it('never renders logos or names from nonpublic or foreign-region companies', async () => {
    mocks.getCompanies.mockResolvedValue({ companies: [{ ...company, status: 'pending', company_name: 'Hidden Pending', logo_url: 'https://example.invalid/pending.png', is_member: true }, { ...company, site_id: 2, company_name: 'Hidden Foreign', logo_url: 'https://example.invalid/foreign.png', is_member: true }], total: 2 })
    const html = await render()
    expect(html).toContain('Nenhuma empresa encontrada')
    expect(html).not.toContain('Hidden Pending')
    expect(html).not.toContain('Hidden Foreign')
    expect(html).not.toContain('<img')
    expect(cards(html)).toHaveLength(0)
    expect(html).not.toContain('data-member-badge')
    expect(html).not.toContain('data-active-jobs-count')
  })
  it.each([false, true])('allows full long names to wrap without truncation and retains description for member=%s', async is_member => {
    const name = 'EmpresaComNomeMuitoLongoSemEspacos Consultoria de Sistemas Empresariais'
    mocks.getCompanies.mockResolvedValue({ companies: [{ ...company, company_name: name, is_member }], total: 1 })
    const html = await render()
    expect(html).toContain(name)
    expect(html).toContain('break-words text-lg')
    expect(html).toContain('mb-3 line-clamp-2 text-sm text-gray-600')
    expect(html).toContain('Descrição original preservada')
    expect(html).not.toContain('truncate')
  })
})

describe('company directory affirmative regional membership', () => {
  it('uses a 2px navy frame, a single navy card tab and wrapping mobile-safe text for a literal true member', async () => {
    mocks.getCompanies.mockResolvedValue({ companies: [{ ...company, is_member: true }], total: 1 })
    const memberCard = card(await render())
    expect(memberCard).toContain('data-company-member="true"')
    expect(memberCard).toContain('group min-w-0 rounded-xl border-2 border-portal-dark bg-white p-6 shadow-sm')
    expect(memberCard).toContain('hover:border-portal-dark')
    expect(memberCard).not.toContain('border-gray-100')
    expect(memberCard).not.toContain('hover:border-portal-orange/30')
    expect(memberCard.match(/Membro Ecossistema Portal ERP/g)).toHaveLength(1)
    expect(memberCard.match(/data-member-badge="card"/g)).toHaveLength(1)
    expect(memberCard).toContain('-mx-6 -mt-6 mb-4 min-w-0')
    expect(memberCard).toContain('block min-w-0 max-w-full whitespace-normal break-words')
    expect(memberCard).toContain('bg-portal-dark px-3 py-2 text-[11px] font-semibold leading-4 text-white')
    expect(memberCard).not.toContain('whitespace-nowrap')
    expect(memberCard).not.toContain('data-member-badge="inline"')
    expect(memberCard).not.toContain('role="tab"')
    expect(memberCard.indexOf('data-member-badge')).toBeLessThan(memberCard.indexOf('data-employer-logo'))
  })
  it.each([false, undefined, null, 'true', 'false', 1, 0, {}, [], [true]])('retains gray borders and no member indication for false/missing/malformed flag %j', async is_member => {
    const dto: Record<string, unknown> = { ...company, is_member, global_is_member: true, company_is_member: true, membership: { is_member: true } }
    if (is_member === undefined) delete dto.is_member
    mocks.getCompanies.mockResolvedValue({ companies: [dto], total: 1 })
    const ordinaryCard = card(await render())
    expect(ordinaryCard).toContain('data-company-member="false"')
    expect(ordinaryCard).toContain('border border-gray-100 bg-white p-6 shadow-sm')
    expect(ordinaryCard).toContain('hover:border-portal-orange/30')
    expect(ordinaryCard).not.toContain('border-2')
    expect(ordinaryCard).not.toContain('border-portal-dark')
    expect(ordinaryCard).not.toContain('data-member-badge')
    expect(ordinaryCard).not.toContain('Membro Ecossistema Portal ERP')
    expect(ordinaryCard).not.toContain('Não membro')
  })
  it('preserves API order without promoting members and supports the existing array DTO', async () => {
    mocks.getCompanies.mockResolvedValue([
      { ...company, id: 7, company_name: 'Primeira Empresa', public_profile_slug: 'primeira-empresa', is_member: false },
      { ...company, id: 8, company_name: 'Segunda Empresa', public_profile_slug: 'segunda-empresa', is_member: true },
      { ...company, id: 9, company_name: 'Terceira Empresa', public_profile_slug: 'terceira-empresa' },
    ])
    const html = await render()
    expect(cards(html).map(item => item.match(/data-company-card="([^"]+)"/)?.[1])).toEqual(['7', '8', '9'])
    expect(card(html, 7)).toContain('data-company-member="false"')
    expect(card(html, 8)).toContain('data-company-member="true"')
    expect(card(html, 9)).toContain('data-company-member="false"')
    expect(html.match(/Membro Ecossistema Portal ERP/g)).toHaveLength(1)
  })
  it.each([{ status: 'pending' }, { status: 'suspended' }, { is_active: false }, { site_id: 2 }, { site_code: 'MX' }, { site_id: undefined }, { site_code: undefined }, { public_profile_slug: 'bad/slug' }])('does not expose member framing or counts for nonpublic/foreign/malformed company %j', async changes => {
    mocks.getCompanies.mockResolvedValue({ companies: [{ ...company, ...changes, is_member: true, company_name: 'Hidden Company', active_jobs_count: 999, logo_url: 'https://example.invalid/private.png' }], total: 1 })
    const html = await render()
    expect(html).toContain('Nenhuma empresa encontrada')
    for (const text of ['Hidden Company', 'private.png', 'data-company-card', 'data-member-badge', 'Membro Ecossistema Portal ERP', 'data-active-jobs-count', '999 vagas ativas']) expect(html).not.toContain(text)
  })
  it('does not expose member cards or counts when the regional site is inactive', async () => {
    mocks.getSiteContext.mockResolvedValue({ site: { ...site, is_active: false }, locale: site.locale })
    mocks.getCompanies.mockResolvedValue({ companies: [{ ...company, is_member: true }], total: 1 })
    const html = await render()
    expect(html).toContain('Nenhuma empresa encontrada')
    expect(cards(html)).toHaveLength(0)
    expect(html).not.toContain('data-member-badge')
    expect(html).not.toContain('data-active-jobs-count')
  })
  it('keeps page.private and company private data out of public cards, including member cards', async () => {
    mocks.getCompanies.mockResolvedValue({ companies: [{ ...company, is_member: true, private: { owner_email: 'company-private@example.invalid' }, owner_email: 'owner-secret@example.invalid' }], total: 1, private: { companies: [{ ...company, company_name: 'Private Page Company', is_member: true }], token: 'page-private-secret' } })
    const html = await render()
    expect(cards(html)).toHaveLength(1)
    expect(card(html)).toContain('Empresa de Tecnologia')
    for (const text of ['company-private@example.invalid', 'owner-secret@example.invalid', 'Private Page Company', 'page-private-secret']) expect(html).not.toContain(text)
  })
  it('preserves metadata delegation without adding membership or count metadata', async () => {
    const searchParams = { q: 'ERP', page: '2' }
    const metadata = { title: 'Empresas', robots: { index: false, follow: true } }
    mocks.pageMetadata.mockResolvedValue(metadata)
    expect(await generateMetadata({ params: Promise.resolve({ country: 'br' }), searchParams: Promise.resolve(searchParams) })).toBe(metadata)
    expect(mocks.pageMetadata).toHaveBeenCalledWith(expect.objectContaining({ title: 'Empresas', alternates: { canonical: '/empresas' } }), '/empresas', 'br', searchParams)
    expect(mocks.getCompanies).not.toHaveBeenCalled()
  })
})

describe('company directory active regional jobs count', () => {
  it.each([
    { count: 0, label: '0 vagas ativas' },
    { count: 1, label: '1 vaga ativa' },
    { count: 3, label: '3 vagas ativas' },
    { count: undefined, label: 'Quantidade indisponível' },
    { count: null, label: 'Quantidade indisponível' },
    { count: '0', label: 'Quantidade indisponível' },
    { count: '3', label: 'Quantidade indisponível' },
    { count: false, label: 'Quantidade indisponível' },
    { count: -1, label: 'Quantidade indisponível' },
    { count: 1.5, label: 'Quantidade indisponível' },
    { count: NaN, label: 'Quantidade indisponível' },
    { count: Infinity, label: 'Quantidade indisponível' },
    { count: {}, label: 'Quantidade indisponível' },
    { count: [], label: 'Quantidade indisponível' },
  ])('renders active_jobs_count=$count as "$label", for both member and ordinary cards', async ({ count, label }) => {
    const ordinary: Record<string, unknown> = { ...company, active_jobs_count: count, is_member: false }
    if (count === undefined) delete ordinary.active_jobs_count
    mocks.getCompanies.mockResolvedValue({ companies: [ordinary, { ...ordinary, id: 5, public_profile_slug: 'empresa-membro', is_member: true }], total: 2 })
    const html = await render()
    expect(cards(html)).toHaveLength(2)
    for (const item of cards(html)) {
      expect(item.match(/data-active-jobs-count/g)).toHaveLength(1)
      expect(item).toContain(`<span data-active-jobs-count="">${label}</span>`)
      expect(item).not.toContain('vaga(s) ativa(s)')
      if (label === 'Quantidade indisponível') expect(item).not.toContain('0 vagas ativas')
    }
  })
  it('uses only active_jobs_count from the regional DTO, not jobs length, global totals or page counts', async () => {
    mocks.getCompanies.mockResolvedValue({ companies: [{ ...company, active_jobs_count: 0, jobs: [{ id: 1 }, { id: 2 }], global_active_jobs_count: 81, jobs_count: 42 }, { ...company, id: 5, public_profile_slug: 'sem-contagem', active_jobs_count: undefined, jobs: [{ id: 1 }], global_active_jobs_count: 82, jobs_count: 43 }], total: 2, active_jobs_count: 91 })
    const html = await render()
    expect(card(html)).toContain('>0 vagas ativas</span>')
    expect(card(html, 5)).toContain('>Quantidade indisponível</span>')
    for (const count of [1, 2, 42, 43, 81, 82, 91]) expect(html).not.toContain(`>${count} vagas ativas</span>`)
  })
  it.each([
    { locale: 'en-US', code: 'US', count: 0, label: '0 active jobs' },
    { locale: 'en-US', code: 'US', count: 1, label: '1 active job' },
    { locale: 'en-US', code: 'US', count: undefined, label: 'Count unavailable' },
    { locale: 'es-MX', code: 'MX', count: 1, label: '1 vacante activa' },
    { locale: 'es-MX', code: 'MX', count: 3, label: '3 vacantes activas' },
    { locale: 'es-MX', code: 'MX', count: undefined, label: 'Cantidad no disponible' },
  ])('uses site.locale=$locale for the shared count label "$label"', async ({ locale, code, count, label }) => {
    const regionalSite = { ...site, locale, code, country_code: code, url_prefix: `/${code.toLowerCase()}` }
    mocks.getSiteContext.mockResolvedValue({ site: regionalSite, locale: 'pt-BR' })
    mocks.getCompanies.mockResolvedValue({ companies: [{ ...company, site_code: code, active_jobs_count: count }], total: 1 })
    expect(card(await render())).toContain(`<span data-active-jobs-count="">${label}</span>`)
  })
  it('does not show a fictitious zero-company result when the directory fetch fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.getCompanies.mockRejectedValue(new Error('Upstream unavailable'))
    const html = await render()
    expect(html).toContain('Empresas temporariamente indisponíveis')
    expect(html).toContain('Não foi possível carregar as empresas agora.')
    expect(html).not.toContain('0 empresas encontradas')
    expect(html).not.toContain('Nenhuma empresa encontrada com os filtros selecionados.')
    expect(cards(html)).toHaveLength(0)
    log.mockRestore()
  })
})
