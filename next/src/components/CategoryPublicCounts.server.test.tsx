import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getSiteContext: vi.fn(), getAreas: vi.fn(), getSkills: vi.fn(), pageMetadata: vi.fn() }))
vi.stubGlobal('React', React)
vi.mock('@/lib/site-resolver.server', () => ({ getSiteContext: mocks.getSiteContext }))
vi.mock('@/lib/api', () => ({ getAreas: mocks.getAreas, getSkills: mocks.getSkills }))
vi.mock('@/lib/regional-seo.server', () => ({ pageMetadata: mocks.pageMetadata }))
vi.mock('@/components/RegionalLink', () => ({ default: ({ children, href, ...props }: React.ComponentProps<'a'>) => React.createElement('a', { href: `/br${href}`, ...props }, children) }))
import AreasPage from '@/app/(regional)/[country]/areas/page'
import TechnologiesPage from '@/app/(regional)/[country]/tecnologias/page'
const site = { id: 1, code: 'BR', name: 'Brasil', country_code: 'BR', locale: 'pt-BR', url_prefix: '/br', is_active: true }
beforeEach(() => {
  vi.resetAllMocks()
  mocks.getSiteContext.mockResolvedValue({ site, locale: site.locale })
  mocks.getAreas.mockResolvedValue([{ id: 1, name: 'Consultoria & ERP', job_count: 0 }, { id: 2, name: 'Desenvolvimento', job_count: 1 }, { id: 3, name: 'DevOps', job_count: 2 }])
  mocks.getSkills.mockResolvedValue([{ id: 1, name: 'SAP', category: 'ERP', job_count: 0 }, { id: 2, name: 'C#', category: 'Linguagem', job_count: 1 }, { id: 3, name: 'Python', job_count: 12 }])
})
const areas = async () => renderToStaticMarkup(await AreasPage())
const skills = async () => renderToStaticMarkup(await TechnologiesPage())
describe('regional category cards with truthful public job counts', () => {
  it('requests counted areas and shows zero, singular and plural with preserved name filters', async () => {
    const html = await areas()
    expect(mocks.getAreas).toHaveBeenCalledExactlyOnceWith({ includeCounts: true })
    for (const text of ['0 vagas ativas', '1 vaga ativa', '2 vagas ativas', '/br/vagas?area=Consultoria%20%26%20ERP', '/br/vagas?area=Desenvolvimento']) expect(html).toContain(text)
    expect(html).not.toContain('area_id=')
  })
  it('requests counted skills rather than unrelated Technology ids and preserves broad tech search', async () => {
    const html = await skills()
    expect(mocks.getSkills).toHaveBeenCalledExactlyOnceWith({ includeCounts: true })
    for (const text of ['0 vagas ativas', '1 vaga ativa', '12 vagas ativas', '/br/vagas?tech=SAP', '/br/vagas?tech=C%23']) expect(html).toContain(text)
    expect(html).not.toContain('skill_id=')
    expect(html).not.toContain('tech_id=')
  })
  it('distinguishes counts missing from a legacy or partial DTO', async () => {
    mocks.getAreas.mockResolvedValue([{ id: 1, name: 'Área sem count' }])
    mocks.getSkills.mockResolvedValue([{ id: 1, name: 'Skill sem count', job_count: null }])
    expect(await areas()).toContain('Quantidade indisponível')
    expect(await skills()).toContain('Quantidade indisponível')
  })
  it('does not claim zero categories when fetching fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.getAreas.mockRejectedValue(new Error('upstream unavailable'))
    mocks.getSkills.mockRejectedValue(new Error('upstream unavailable'))
    const a = await areas(), t = await skills()
    expect(a).toContain('Áreas temporariamente indisponíveis')
    expect(a).not.toContain('0 áreas disponíveis')
    expect(t).toContain('Tecnologias temporariamente indisponíveis')
    expect(t).not.toContain('0 tecnologias cadastradas')
    log.mockRestore()
  })
  it('uses locale-specific count text without enabling other countries', async () => {
    mocks.getSiteContext.mockResolvedValue({ site: { ...site, locale: 'en-US' } })
    expect(await areas()).toContain('0 active jobs')
    mocks.getSiteContext.mockResolvedValue({ site: { ...site, locale: 'es-MX' } })
    expect(await skills()).toContain('1 vacante activa')
  })
})
