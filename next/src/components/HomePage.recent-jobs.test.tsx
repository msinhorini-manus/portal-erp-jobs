import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RegionalSite } from '@/lib/site'
import { regionalizePath } from '@/lib/regional-routes'

const mocks = vi.hoisted(() => ({ getSiteContext: vi.fn(), getJobs: vi.fn(), getAreas: vi.fn() }))
vi.stubGlobal('React', React)
vi.mock('@/lib/site-resolver.server', () => ({ getSiteContext: mocks.getSiteContext }))
vi.mock('@/lib/api', () => ({ getJobs: mocks.getJobs, getAreas: mocks.getAreas }))
vi.mock('@/components/HeroSearch', () => ({ HeroSearch: () => React.createElement('form', { 'aria-label': 'Buscar vagas' }) }))
vi.mock('@/components/RegionalLink', () => ({ default: ({ children, href, ...props }: React.ComponentProps<'a'>) => React.createElement('a', { ...props, href: regionalizePath('/br', String(href)) }, children) }))
import HomePage, { generateMetadata } from '@/app/(regional)/[country]/page'

const site: RegionalSite = { id: 1, code: 'BR', name: 'Brasil', country_code: 'BR', locale: 'pt-BR', currency_code: 'BRL', timezone: 'America/Sao_Paulo', canonical_origin: 'https://jobs.portalerp.com', url_prefix: '/br', is_active: true }
const jobs = [{ id: 2, site_id: 1, site_code: 'BR', title: 'Vaga antiga', public_company_slug: 'marca', public_title_slug: 'titulo', created_at: '2026-11-01T12:00:00Z' }, { id: 1, site_id: 1, site_code: 'BR', title: 'Vaga recente', public_company_slug: 'marca', public_title_slug: 'titulo', created_at: '2026-11-02T12:00:00Z' }]
beforeEach(() => {
  vi.clearAllMocks()
  mocks.getSiteContext.mockResolvedValue({ site, locale: site.locale })
  mocks.getJobs.mockResolvedValue({ jobs })
  mocks.getAreas.mockResolvedValue([{ id: 1, name: 'Consultoria ERP', description: 'Atuação especializada' }])
})

describe('home recent jobs integration', () => {
  it('requests exactly 20 jobs with no company/stats fetch and inserts sorted mosaic before preserved sections', async () => {
    const html = renderToStaticMarkup(await HomePage())
    expect(mocks.getJobs).toHaveBeenCalledExactlyOnceWith({ per_page: '20' })
    expect(mocks.getAreas).toHaveBeenCalledTimes(1)
    for (const text of ['O mercado de tecnologia trabalha aqui.', 'Carreiras e talentos do ecossistema Portal ERP', 'Encontre oportunidades, talentos especializados e contexto para avançar no mercado de software de gestão.', 'aria-label="Buscar vagas"', 'Explore por área de atuação', 'Consultoria ERP', 'Programa de Membros', 'Conhecer o Portal ERP Pro', '/br/candidato/cadastro', '/br/empresa/cadastro']) expect(html).toContain(text)
    expect(html).not.toContain('Vagas em destaque')
    expect(html).not.toContain('<aside')
    expect(html).not.toContain('Vagas ativas')
    expect(html.indexOf('Vagas mais recentes')).toBeLessThan(html.indexOf('Explore por área de atuação'))
    expect(html.indexOf('Vaga recente')).toBeLessThan(html.indexOf('Vaga antiga'))
    expect(html).toContain('/br/vagas/marca/titulo/1')
    expect(html).toContain('href="/br/vagas"')
  })

  it('retains regional canonical, Organization and WebSite SearchAction with Portal ERP Jobs identity', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ country: 'br' }), searchParams: Promise.resolve({ utm_source: 'test' }) })
    expect(metadata.alternates?.canonical).toBe('https://jobs.portalerp.com/br')
    const html = renderToStaticMarkup(await HomePage())
    for (const text of ['"@type":"Organization"', '"name":"Portal ERP Group"', '"@type":"WebSite"', '"name":"Portal ERP Jobs"', '"@id":"https://jobs.portalerp.com/br/#website"', '"target":"https://jobs.portalerp.com/br/vagas?q={search_term_string}"', '"inLanguage":"pt-BR"']) expect(html).toContain(text)
  })

  it.each([jobs, { jobs }, { jobs: null }, { jobs: 'invalid' }, null])('handles list/envelope/empty responses without fixture cards: %j', async response => {
    mocks.getJobs.mockResolvedValue(response)
    const html = renderToStaticMarkup(await HomePage())
    if (response === jobs || response && typeof response === 'object' && !Array.isArray(response) && response.jobs === jobs) {
      expect(html).toContain('Vaga recente')
    } else {
      expect(html).toContain('Novas oportunidades serão publicadas aqui.')
      expect(html).not.toContain('Vaga recente')
    }
  })

  it('keeps inactive sites blocked before any catalog fetch', async () => {
    mocks.getSiteContext.mockResolvedValue({ site: { ...site, is_active: false }, locale: site.locale })
    await expect(HomePage()).rejects.toThrow('not publicly routable')
    expect(mocks.getJobs).not.toHaveBeenCalled()
    expect(mocks.getAreas).not.toHaveBeenCalled()
  })
})
