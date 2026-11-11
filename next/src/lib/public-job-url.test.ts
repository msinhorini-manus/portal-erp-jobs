import { describe, expect, it } from 'vitest'
import { canonicalJobId, fallbackJobSlug, jobCollection, publicJobCanonical, publicJobPath, validPublicJobSlug } from './public-job-url'
import { regionalSitemapXml, xmlEscape } from './regional-sitemap'
import type { RegionalSite } from './site'
const br: RegionalSite = { code: 'BR', name: 'Brasil', country_code: 'BR', locale: 'pt-BR', currency_code: 'BRL', timezone: 'America/Sao_Paulo', canonical_origin: 'https://jobs.portalerp.com', url_prefix: '/br', is_active: true }
const job = { id: 12, title: 'Título atual alterado', company_name: 'Nome atual alterado', public_company_slug: 'snapshot-company', public_title_slug: 'snapshot-title' }
describe('shared public job URL contract', () => {
  it('uses persisted snapshots, never renames the URL from current labels', () => {
    expect(publicJobPath(job, br)).toBe('/br/vagas/snapshot-company/snapshot-title/12')
    expect(publicJobCanonical(job, br)).toBe('https://jobs.portalerp.com/br/vagas/snapshot-company/snapshot-title/12')
    expect(publicJobPath({ ...job, title: 'Novo título', company_name: 'Outra empresa' }, br)).toBe(publicJobPath(job, br))
  })
  it.each([['pt-BR', 'br', 'vagas'], ['es-MX', 'mx', 'vacantes'], ['es-CO', 'co', 'vacantes'], ['en-US', 'us', 'jobs']])('maps locale %s to the prepared collection', (locale, country, collection) => {
    expect(jobCollection(locale)).toBe(collection)
    expect(publicJobPath(job, { ...br, locale, url_prefix: `/${country}` })).toBe(`/${country}/${collection}/snapshot-company/snapshot-title/12`)
  })
  it('falls back deterministically only for missing snapshots; handles accents/punctuation/140 max', () => {
    const fallback = { id: 1, title: 'Engenharia Sênior: C++ / ERP', company_name: 'Ação & Gestão Ltda.' }
    expect(publicJobPath(fallback, br)).toBe('/br/vagas/acao-gestao-ltda/engenharia-senior-c-erp/1')
    expect(publicJobPath({ id: 1, name: 'Analista Ágil' }, br)).toBe('/br/vagas/empresa/analista-agil/1')
    expect(fallbackJobSlug('a'.repeat(139) + ' BBB', 'vaga')).toBe('a'.repeat(139))
    expect(validPublicJobSlug(fallbackJobSlug('a'.repeat(300), 'vaga'))).toBe(true)
  })
  it('never leaks real organization in hidden URLs, even if DTO snapshots are unsanitized', () => {
    const path = publicJobPath({ ...job, is_company_hidden: true, company: { name: 'Segredo' } }, br)
    expect(path).toBe('/br/vagas/empresa-confidencial/snapshot-title/12')
    expect(path).not.toMatch(/snapshot-company|Segredo|alterado/)
  })
  it.each(['../admin', 'x/y', '//evil.test', 'a%2Fb', 'a?x=1', 'a#b', 'Ágil', 'UPPER', '-a', 'a--b', '', 'a'.repeat(141), '<script>'])('rejects corrupt snapshot %s rather than escaping unsafe DTO into Location', value => {
    expect(validPublicJobSlug(value)).toBe(false)
    expect(() => publicJobPath({ ...job, public_title_slug: value }, br)).toThrow('Invalid public job slug snapshot')
  })
  it.each(['0', '-1', 'NaN', '1e3', '../1', '1?x', '9007199254740992', '9999999999999999999999999', ''])('rejects invalid ID %s before API', id => { expect(() => canonicalJobId(id)).toThrow() })
  it('normalizes legacy leading zeros and rejects missing/inactive context or locale', () => {
    expect(canonicalJobId('01')).toBe('1')
    expect(() => publicJobPath(job, { ...br, url_prefix: '//evil.test' })).toThrow()
    expect(() => publicJobPath(job, { ...br, is_active: false })).toThrow()
    expect(() => jobCollection('fr-FR')).toThrow()
  })
  it('sitemap uses only friendly URLs, hides organization and keeps XML escaping/fail-closed', () => {
    const xml = regionalSitemapXml(br, [job, { ...job, id: 13, is_company_hidden: true }], [])
    expect(xml).toContain('/br/vagas/snapshot-company/snapshot-title/12</loc>')
    expect(xml).toContain('/br/vagas/empresa-confidencial/snapshot-title/13</loc>')
    expect(xml).not.toContain('/vagas/12</loc>')
    expect(xml).not.toContain('hreflang')
    expect(xmlEscape('<&"\'>')).toBe('&lt;&amp;&quot;&apos;&gt;')
    expect(() => regionalSitemapXml(br, [{ ...job, public_company_slug: 'evil&name' }], [])).toThrow()
    expect(() => regionalSitemapXml({ ...br, locale: 'es-MX' }, [job], [])).toThrow('not homologated')
  })
})
