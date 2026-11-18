import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { RegionalSite } from '@/lib/site'
import type { RecentJob } from '@/lib/recent-jobs'

vi.stubGlobal('React', React)
vi.mock('@/components/RegionalLink', () => ({ default: ({ children, href, ...props }: React.ComponentProps<'a'>) => React.createElement('a', { href, ...props }, children) }))
import { RecentJobs } from './RecentJobs'
import { EmployerLogo } from './EmployerLogo'

const site: RegionalSite = { id: 1, code: 'BR', name: 'Brasil', country_code: 'BR', locale: 'pt-BR', currency_code: 'BRL', timezone: 'America/Sao_Paulo', canonical_origin: 'https://jobs.portalerp.com', url_prefix: '/br', is_active: true }
const job = (changes: Partial<RecentJob> = {}): RecentJob => ({ id: 1, site_id: 1, site_code: 'BR', status: 'active', title: 'Consultoria ERP com título completo e sem corte para uma oportunidade especializada', company_name: 'Empresa pública de teste', public_company_slug: 'marca-da-vaga', public_title_slug: 'consultoria-erp', company_id: 7, company_profile_slug: 'perfil-publico', company_logo_url: 'https://example.invalid/logo.png', location: 'São Paulo, SP', work_modality: 'hybrid', contract_type: 'clt', created_at: '2026-11-17T01:00:00Z', ...changes })
const render = (jobs: RecentJob[], regionalSite = site) => renderToStaticMarkup(<RecentJobs jobs={jobs} site={regionalSite} />)

describe('recent jobs HTML', () => {

  it.each([
    ['card', 'h-8 w-8'], ['hero', 'h-20 w-20'], ['sidebar', 'h-12 w-12'],
    ['profile', 'h-16 w-16'], ['directory', 'h-16 w-24'],
  ] as const)('keeps the original logo size outside the mosaic: %s', (size, classes) => {
    const html = renderToStaticMarkup(<EmployerLogo name="Empresa" src="https://example.invalid/logo.png" size={size} />)
    expect(html).toContain(classes)
    expect(html).not.toContain('h-10 w-10')
  })


  it('renders the real company logo with reserved 40px dimensions, full title, location, modality, contract and site-local publication', () => {
    const html = render([job()])
    for (const text of ['Vagas mais recentes', 'Empresa pública de teste', 'https://example.invalid/logo.png', 'h-10 w-10', 'Consultoria ERP com título completo e sem corte para uma oportunidade especializada', 'São Paulo, SP', '>Híbrido</span>', '>CLT</span>', '16/11/2026', 'dateTime="2026-11-17T01:00:00.000Z"', 'Publicada em 16/11/2026']) expect(html).toContain(text)
    expect(html).toContain('href="/br/empresas/perfil-publico"')
    expect(html.match(/href="\/br\/vagas\/marca-da-vaga\/consultoria-erp\/1"/g)).toHaveLength(2)
    expect(html).not.toContain('line-clamp')
    expect(html).not.toContain('truncate')
    expect(html).not.toContain('R$')
    expect(html).not.toContain('/empresas/7')
    expect(html).toContain('pt-1 text-sm font-semibold leading-5 text-slate-600')
  })

  it('adds one full navy tab and thin navy-gray frame only to an eligible member, retaining its 40px logo', () => {
    const html = render([job({ company_is_member: true })])
    expect(html.match(/Membro Ecossistema Portal ERP/g)).toHaveLength(1)
    expect(html).toContain('data-member-badge="card"')
    expect(html).toContain('bg-portal-dark')
    expect(html).toContain('border-portal-dark/30')
    expect(html).toContain('h-10 w-10')
    expect(html).toContain('href="/br/empresas/perfil-publico"')
    expect(html).not.toContain('bg-talent-teal')
    expect(html).not.toContain('line-clamp')
    expect(html).not.toContain('truncate')
  })

  it.each([false, undefined, null, 'true', 'false', 1, {}, []])('does not label or frame a nonmember or truthy malformed flag: %j', flag => {
    const html = render([job({ company_is_member: flag as unknown as RecentJob['company_is_member'] })])
    expect(html).toContain('border-slate-200')
    for (const text of ['Membro Ecossistema Portal ERP', 'data-member-badge', 'border-portal-dark/30', 'Não membro', 'não membro']) expect(html).not.toContain(text)
  })

  it('retains the same 20 latest cards, four columns and date/ID order with mixed member flags', () => {
    const jobs = Array.from({ length: 24 }, (_, index) => job({ id: index + 1, company_is_member: index % 2 === 0 }))
    const html = render(jobs)
    const ordinaryHtml = render(jobs.map(item => ({ ...item, company_is_member: false })))
    expect(html.match(/<article\b/g)).toHaveLength(20)
    expect(html.match(/data-member-badge="card"/g)).toHaveLength(10)
    expect(html).toContain('grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4')
    expect([...html.matchAll(/aria-label="Ver vaga:[^"]*"/g)].map(match => match[0])).toEqual([...ordinaryHtml.matchAll(/aria-label="Ver vaga:[^"]*"/g)].map(match => match[0]))
    expect([...html.matchAll(/href="(\/br\/vagas\/[^\"]*)"/g)].map(match => match[1])).toEqual([...ordinaryHtml.matchAll(/href="(\/br\/vagas\/[^\"]*)"/g)].map(match => match[1]))
    expect(html.indexOf('/consultoria-erp/24')).toBeLessThan(html.indexOf('/consultoria-erp/23'))
  })

  it('renders at most 20 cards in the 1/2/4-column mosaic without placeholders', () => {
    const html = render(Array.from({ length: 24 }, (_, index) => job({ id: index + 1 })))
    expect(html.match(/<article\b/g)).toHaveLength(20)
    expect(html).toContain('grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4')
    expect(html.indexOf('/consultoria-erp/24')).toBeLessThan(html.indexOf('/consultoria-erp/23'))
    expect(html).not.toContain('/consultoria-erp/1"')
  })

  it('does not leak a confidential company identity, logo, profile slug or brand in visible HTML', () => {
    const html = render([job({ company_is_member: true, is_company_hidden: true, company_name: 'CONFIDENTIAL_NAME', company_logo_url: 'https://example.invalid/SECRET_LOGO.png', company_profile_slug: 'secret-profile', public_company_slug: 'secret-brand', company: { name: 'SECRET_NESTED_NAME' } })])
    expect(html).toContain('Empresa confidencial')
    expect(html).toContain('data-employer-logo="confidential"')
    expect(html).toContain('h-10 w-10')
    expect(html).toContain('/br/vagas/empresa-confidencial/consultoria-erp/1')
    for (const text of ['CONFIDENTIAL_NAME', 'SECRET_LOGO', 'secret-profile', 'secret-brand', 'SECRET_NESTED_NAME', '/br/empresas/', 'Membro Ecossistema Portal ERP', 'data-member-badge', 'border-portal-dark/30']) expect(html).not.toContain(text)
  })

  it.each([null, undefined, 'search', 'Bad/slug'])('keeps company text but omits the profile link when not eligible: %j', company_profile_slug => {
    const html = render([job({ company_is_member: true, company_profile_slug })])
    expect(html).toContain('Empresa pública de teste')
    expect(html).not.toContain('href="/br/empresas/')
    expect(html).not.toContain('data-member-badge')
    expect(html).not.toContain('border-portal-dark/30')
    expect(html).toContain('/br/vagas/marca-da-vaga/consultoria-erp/1')
  })

  it('omits corrupt links and nonpublic/cross-region DTOs entirely', () => {
    const html = render([job({ id: 1, title: 'BAD_URL', public_title_slug: 'bad/slug' }), job({ id: 2, title: 'DRAFT', status: 'draft' }), job({ id: 3, title: 'OTHER_REGION', site_id: 2 }), job({ id: 4, title: 'INACTIVE', is_active: false }), job({ id: 5, title: 'PUBLIC_TITLE' })])
    expect(html.match(/<article\b/g)).toHaveLength(1)
    expect(html).toContain('PUBLIC_TITLE')
    for (const text of ['BAD_URL', 'DRAFT', 'OTHER_REGION', 'INACTIVE']) expect(html).not.toContain(text)
  })

  it.each([{ company_id: null }, { company_id: '04' }, { company_id: 'bad' }, { company_id: undefined }])('does not grant a member tab without a valid company identity: %j', changes => {
    const html = render([job({ company_is_member: true, ...changes })])
    expect(html).toContain('<article')
    expect(html).not.toContain('href="/br/empresas/')
    expect(html).not.toContain('data-member-badge')
  })

  it.each([{ site_id: 2 }, { site_code: 'MX' }, { public_title_slug: 'bad/slug' }])('never renders a tab for corrupt or cross-region member jobs: %j', changes => {
    const html = render([job({ company_is_member: true, ...changes })])
    expect(html).not.toContain('<article')
    expect(html).not.toContain('data-member-badge')
  })

  it.each([{ is_active: false }, { url_prefix: '/' }, { locale: 'invalid' }])('never renders a member tab in an invalid region: %j', changes => {
    const html = render([job({ company_is_member: true })], { ...site, ...changes })
    expect(html).not.toContain('<article')
    expect(html).not.toContain('data-member-badge')
  })

  it('renders an honest empty state, not fake cards or a current update date', () => {
    const html = render([])
    expect(html).toContain('Novas oportunidades serão publicadas aqui.')
    expect(html).toContain('Ver todas as vagas')
    expect(html).not.toContain('<article')
    expect(html).not.toContain('<time')
    expect(html).not.toContain('Atualizado em')
  })

  it('uses city/state when provided and leaves absent location, contract and publication unset', () => {
    const html = render([job({ location: undefined, city: 'Curitiba', state: 'PR', created_at: 'invalid', work_modality: undefined, contract_type: undefined, company_logo_url: null })])
    expect(html).toContain('Curitiba, PR')
    expect(html).toContain('data-employer-logo="initials"')
    expect(html).toContain('h-10 w-10')
    expect(html).not.toContain('<time')
    expect(html).not.toContain('CLT')
    expect(html).not.toContain('Híbrido')
    expect(html).not.toContain('Local a definir')
    const remote = render([job({ location: null, city: null, state: null, work_modality: 'remote', contract_type: 'pj' })])
    expect(remote).toContain('>Remoto</span>')
    expect(remote).toContain('>PJ</span>')
  })

  it('does not render vacancy links for an inactive region', () => {
    const html = render([job()], { ...site, is_active: false })
    expect(html).not.toContain('<article')
    expect(html).not.toContain('href="/br/vagas/')
  })
})
