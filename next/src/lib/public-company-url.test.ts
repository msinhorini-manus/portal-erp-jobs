import { describe, expect, it } from 'vitest'
import { assertPublicRegionalCompany, canonicalCompanyId, companyCollection, RESERVED_COMPANY_SLUGS, publicCompanyCanonical, publicCompanyPath, publicJobCompanyPath, validPublicCompanySlug } from './public-company-url'
import { regionalHref } from './regional-routes'
import { regionalSitemapXml } from './regional-sitemap'
import type { RegionalSite } from './site'
const br: RegionalSite = { id: 1, code: 'BR', name: 'Brasil', country_code: 'BR', locale: 'pt-BR', currency_code: 'BRL', timezone: 'America/Sao_Paulo', canonical_origin: 'https://jobs.portalerp.com', url_prefix: '/br', is_active: true }
const company = { id: 4, site_id: 1, site_code: 'BR', company_name: 'MegaSoft', public_profile_slug: 'megasoft', status: 'approved' }
describe('single public company URL contract', () => {
  it('uses stable snapshots across rename, route registry, canonical and sitemap', () => {
    expect(publicCompanyPath(company, br)).toBe('/br/empresas/megasoft')
    expect(publicCompanyPath({ ...company, company_name: 'Renamed' }, br)).toBe('/br/empresas/megasoft')
    expect(publicCompanyCanonical(company, br)).toBe('https://jobs.portalerp.com/br/empresas/megasoft')
    expect(regionalHref(br, 'companies.detail', { companySlug: 'megasoft', id: 4 })).toBe('/br/empresas/megasoft')
    expect(() => regionalHref(br, 'companies.detail', { id: 4 })).toThrow('companySlug')
    const xml = regionalSitemapXml(br, [], [company, { ...company, id: 5, status: 'pending' }])
    expect(xml).toContain('/br/empresas/megasoft</loc>')
    expect(xml).not.toContain('/empresas/4</loc>'); expect(xml).not.toContain('/megasoft/5'); expect(xml).not.toContain('hreflang')
  })
  it.each([['pt-BR', 'br', 'empresas'], ['pt-PT', 'pt', 'empresas'], ['es-MX', 'mx', 'empresas'], ['es-CO', 'co', 'empresas'], ['en-US', 'us', 'companies'], ['en-AU', 'au', 'companies']])('prepares %s without activating sites', (locale, country, collection) => {
    const site = { ...br, locale, url_prefix: `/${country}` }
    expect(companyCollection(locale)).toBe(collection)
    expect(publicCompanyPath(company, site)).toBe(`/${country}/${collection}/megasoft`)
    expect(regionalHref(site, 'companies.detail', { companySlug: 'megasoft', id: 4 })).toBe(`/${country}/${collection}/megasoft`)
    expect(() => publicCompanyPath(company, { ...site, is_active: false })).toThrow()
  })
  it('never derives a public slug from a missing snapshot or internal ID', () => {
    for (const snapshot of [undefined, null, '']) {
      expect(() => publicCompanyPath({ id: 1, company_name: 'MegaSoft', public_profile_slug: snapshot }, br)).toThrow('snapshot')
    }
    expect(publicCompanyPath({ public_profile_slug: 'megasoft' }, br)).toBe('/br/empresas/megasoft')
    expect(regionalHref(br, 'companies.detail', { companySlug: 'megasoft' })).toBe('/br/empresas/megasoft')
    expect(publicCompanyPath({ ...company, id: 500 }, br)).toBe(publicCompanyPath(company, br))
    expect(validPublicCompanySlug('a'.repeat(140))).toBe(true)
  })
  it.each([...RESERVED_COMPANY_SLUGS, '123', '01', '123-456', '0'])('rejects reserved/numeric slug %s', slug => {
    expect(validPublicCompanySlug(slug)).toBe(false)
    expect(() => publicCompanyPath({ ...company, public_profile_slug: slug }, br)).toThrow('snapshot')
  })
  it.each(['../admin', 'x/y', '//evil', 'a%2Fb', 'a?b', 'a#b', 'Ágil', 'UPPER', '-a', 'a--b', '', 'a'.repeat(141)])('rejects corrupt snapshot %s', slug => {
    expect(() => publicCompanyPath({ ...company, public_profile_slug: slug }, br)).toThrow('snapshot')
  })
  it.each(['0', '-1', '01', '004', '1e3', '1.0', 'NaN', '', '9007199254740992', '../4', '4?x', ' 4'])('rejects noncanonical/bounded ID %s', id => { expect(() => canonicalCompanyId(id)).toThrow() })
  it('accepts upper safe bound and rejects unsafe site/locale', () => {
    expect(canonicalCompanyId('9007199254740991')).toBe('9007199254740991')
    expect(() => companyCollection('fr-FR')).toThrow()
    expect(() => publicCompanyPath(company, { ...br, url_prefix: '//evil' })).toThrow()
  })
  it.each([{ site_id: 2 }, { site_id: undefined }, { site_code: 'MX' }, { site_code: undefined }, { status: 'pending' }, { status: undefined }, { is_active: false }, { id: 5 }])('fails closed on regional/status/identity mismatch %j', changes => {
    expect(() => assertPublicRegionalCompany({ ...company, ...changes }, br, '4')).toThrow()
  })
  it('accepts trusted public context without exposing site ID, still requires exact site code and valid DTO site ID', () => {
    const { id: _id, ...publicSite } = br
    expect(() => assertPublicRegionalCompany(company, publicSite, '4')).not.toThrow()
    for (const changes of [{ site_id: undefined }, { site_id: 0 }, { site_code: undefined }, { site_code: 'MX' }]) {
      expect(() => assertPublicRegionalCompany({ ...company, ...changes }, publicSite, '4')).toThrow()
    }
  })
  it('employer profile uses its own snapshot and never leaks hidden data', () => {
    const job = { company_id: 4, company_name: 'New company name', company_profile_slug: 'megasoft', company: { id: 4, public_profile_slug: 'old-nested' } }
    expect(publicJobCompanyPath(job, br)).toBe('/br/empresas/megasoft')
    expect(publicJobCompanyPath({ ...job, is_company_hidden: true }, br)).toBeNull()
    expect(publicJobCompanyPath({ company: { id: 4, public_profile_slug: 'megasoft' } }, br)).toBe('/br/empresas/megasoft')
    expect(publicJobCompanyPath({}, br)).toBeNull()
    for (const slug of [null, '', 'BAD', '123', 'search']) expect(publicJobCompanyPath({ ...job, company_profile_slug: slug }, br)).toBeNull()
    expect(publicJobCompanyPath({ company_id: 4, company_name: 'MegaSoft' }, br)).toBeNull()
    expect(publicJobCompanyPath({ ...job, company_id: '04' }, br)).toBeNull()
  })
  it('sitemap fails corrupt regional identity/snapshot rather than publishing bad canonical links', () => {
    expect(() => regionalSitemapXml(br, [], [{ ...company, site_id: 2 }])).toThrow()
    expect(() => regionalSitemapXml(br, [], [{ ...company, public_profile_slug: 'bad&name' }])).toThrow()
    expect(() => regionalSitemapXml(br, [], [{ ...company, id: '04' }])).toThrow('Invalid sitemap entity ID')
  })
})
