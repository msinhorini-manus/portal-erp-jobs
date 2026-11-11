import { describe, expect, it } from 'vitest'
import { countryPrefix, regionalHref, regionalizePath, safeRegionalReturn } from './regional-routes'
import { requireCanonicalOrigin, requireRegionalBaseUrl, type RegionalSite } from './site'
import { collectAll, regionalSitemapXml } from './regional-sitemap'
const site: RegionalSite = { code: 'BR', name: 'Brasil', country_code: 'BR', locale: 'pt-BR', currency_code: 'BRL', timezone: 'America/Sao_Paulo', canonical_origin: 'https://jobs.portalerp.com', url_prefix: '/br', regional_base_url: 'https://jobs.portalerp.com/br', is_active: true }
describe('regional routing and sitemap contract', () => {
  it('separates origins, regional bases, assets and exact entity URLs', () => {
    expect(requireCanonicalOrigin(site)).toBe('https://jobs.portalerp.com')
    expect(requireRegionalBaseUrl(site)).toBe('https://jobs.portalerp.com/br')
    expect(regionalHref(site, 'jobs.detail', { id: 12 })).toBe('/br/vagas/empresa/vaga/12')
    expect(regionalHref(site, 'company.invitation', { token: 'a_b-123' })).toBe('/br/empresa/convite/a_b-123')
    expect(regionalizePath('/br', '/')).toBe('/br')
    for (const path of ['/og-image.png', '/_next/image?a=b', '/uploads/logo.png', '/admin', 'mailto:a@example.test', '#contact', 'https://example.test/']) expect(regionalizePath('/br', path)).toBe(path)
    expect(() => requireCanonicalOrigin({ ...site, canonical_origin: 'https://jobs.portalerp.com/br' })).toThrow()
    expect(() => regionalizePath('/br', '/zz/vagas')).toThrow()
    expect(() => countryPrefix('BR')).toThrow()
  })
  it('keeps invite/reset and return paths regional and rejects open redirect/traversal variants', () => {
    expect(safeRegionalReturn('/br/vagas/2', '/br', '/candidato/dashboard')).toBe('/br/vagas/2')
    expect(safeRegionalReturn('/vagas/2', '/br', '/candidato/dashboard')).toBe('/br/vagas/2')
    for (const path of ['//attacker.test', '/zz/vagas/2', '/br/../admin', '/br/%2e%2e/admin', '/br/%5c%5cattacker.test', '/admin', '/bff/auth/me']) expect(safeRegionalReturn(path, '/br', '/candidato/dashboard')).toBe('/br/candidato/dashboard')
    expect(safeRegionalReturn('/br/vagas/2', '/br', '/empresa/dashboard', true)).toBe('/br/empresa/dashboard')
    expect(safeRegionalReturn('/br/empresa/vagas/2/editar', '/br', '/empresa/dashboard', true)).toBe('/br/empresa/vagas/2/editar')
  })
  it('collects every approved/public inventory page, excludes private/closed content and uses real lastmod only', async () => {
    const seen: number[] = []
    const jobs = await collectAll<{ id: number }>(async page => { seen.push(page); return { pages: 3, total: 3, jobs: [{ id: page }] } }, 'jobs')
    expect(seen).toEqual([1, 2, 3])
    const xml = regionalSitemapXml(site, [...jobs, { id: 5, is_active: false }, { id: 6, expires_at: '2001-01-01' }, { id: 7, created_at: '2026-10-01' }], [{ id: 1, status: 'approved', site_code: 'BR' }, { id: 2, status: 'pending' }])
    expect(xml).toContain('https://jobs.portalerp.com/br/vagas/empresa/vaga/3')
    expect(xml).toContain('<lastmod>2026-10-01T00:00:00.000Z</lastmod>')
    expect(xml).not.toContain('/vaga/5')
    expect(xml).not.toContain('/vaga/6')
    expect(xml).not.toContain('/empresas/2')
    for (const privatePath of ['/login', '/dashboard', '/bff/', '/convite/', '/recuperar-senha']) expect(xml).not.toContain(privatePath)
    await expect(collectAll(async () => ({ pages: 2 }), 'jobs')).rejects.toThrow('inventory')
    await expect(collectAll(async () => ({ pages: 1001, jobs: [] }), 'jobs')).rejects.toThrow('pagination')
    await expect(collectAll(async () => ({ total: 2, pages: 2, jobs: [] }), 'jobs')).rejects.toThrow('Incomplete')
  })
})
