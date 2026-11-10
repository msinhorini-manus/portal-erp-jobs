import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EquivalentPublication } from './regional-seo.server'
import type { RegionalSite } from './site'
const resolver = vi.hoisted(() => ({ getSiteContext: vi.fn() }))
vi.mock('./site-resolver.server', () => resolver)
import { getPublishedAlternates, pageMetadata, regionalCanonical } from './regional-seo.server'

const br: RegionalSite = { code: 'BR', name: 'Brasil', country_code: 'BR', locale: 'pt-BR', currency_code: 'BRL', timezone: 'America/Sao_Paulo', canonical_origin: 'https://jobs.portalerp.com', url_prefix: '/br', regional_base_url: 'https://jobs.portalerp.com/br', is_active: true }
const zz: RegionalSite = { ...br, code: 'ZZ', country_code: 'ZZ', locale: 'es-MX', url_prefix: '/zz', regional_base_url: 'https://jobs.portalerp.com/zz' }
const pub = (site: RegionalSite, path: string, override: Partial<EquivalentPublication> = {}): EquivalentPublication => ({ entityKey: 'about', site, path, published: true, indexable: true, ...override })
afterEach(() => vi.clearAllMocks())

describe('page-specific published alternates', () => {
  it('omits hreflang for one country or no published equivalence and never fabricates x-default', () => {
    expect(getPublishedAlternates('about', [pub(br, '/br/sobre')])).toBeUndefined()
    expect(getPublishedAlternates('job:1', [pub(br, '/br/sobre'), pub(zz, '/zz/acerca')])).toBeUndefined()
  })
  it('only includes active, published, indexable equivalents of the same entity', () => {
    const publications = [pub(br, '/br/sobre'), pub(zz, '/zz/acerca', { published: false }), pub(zz, '/zz/acerca', { indexable: false }), pub({ ...zz, is_active: false }, '/zz/acerca'), pub(zz, '/zz/empleos/2', { entityKey: 'job:2' })]
    expect(getPublishedAlternates('about', publications)).toBeUndefined()
  })
  it('builds the same reciprocal absolute set including both self URLs, not country home fallbacks', () => {
    const publications = [pub(br, '/br/sobre'), pub(zz, '/zz/acerca')]
    const expected = { 'pt-BR': 'https://jobs.portalerp.com/br/sobre', 'es-MX': 'https://jobs.portalerp.com/zz/acerca' }
    expect(getPublishedAlternates('about', publications)).toEqual(expected)
    expect(getPublishedAlternates('about', [...publications].reverse())).toEqual(expected)
    expect(getPublishedAlternates('about', publications)).not.toHaveProperty('x-default')
    expect(regionalCanonical(br, 'jobs.detail', { id: 1 })).toBe('https://jobs.portalerp.com/br/vagas/1')
  })
  it.each(['MX', 'es_MX', 'mx', ''])('rejects invalid hreflang locale %s rather than publishing it', locale => {
    expect(() => getPublishedAlternates('about', [pub(br, '/br/sobre'), pub({ ...zz, locale }, '/zz/acerca')])).toThrow('Invalid publication alternate')
  })
  it('rejects wrong regional paths, duplicate locales and inconsistent canonical bases', () => {
    expect(() => getPublishedAlternates('about', [pub(br, '/br/sobre'), pub(zz, '/br/sobre')])).toThrow('Invalid publication alternate')
    expect(() => getPublishedAlternates('about', [pub(br, '/br/sobre'), pub({ ...zz, locale: 'pt-BR' }, '/zz/acerca')])).toThrow('Ambiguous locale equivalent')
    expect(() => getPublishedAlternates('about', [pub(br, '/br/sobre'), pub({ ...zz, regional_base_url: 'https://evil.invalid/zz' }, '/zz/acerca')])).toThrow('Inconsistent regional base URL')
  })
})

describe('regional page metadata', () => {
  it('overrides inherited home canonical/og URL with exact entity URL and locale', async () => {
    resolver.getSiteContext.mockResolvedValue({ site: br, locale: br.locale })
    const metadata = await pageMetadata({ title: 'Consultor ERP', description: 'Vaga específica', alternates: { canonical: 'https://old.invalid/' }, openGraph: { url: 'https://old.invalid/', locale: 'en_US' } }, '/vagas/12', 'br')
    expect(metadata.alternates).toEqual({ canonical: 'https://jobs.portalerp.com/br/vagas/12' })
    expect(metadata.openGraph).toMatchObject({ title: 'Consultor ERP', description: 'Vaga específica', url: 'https://jobs.portalerp.com/br/vagas/12', locale: 'pt_BR' })
  })
  it('keeps real pagination self canonical while stripping campaigns and noindexes search permutations', async () => {
    resolver.getSiteContext.mockResolvedValue({ site: br, locale: br.locale })
    const metadata = await pageMetadata({}, '/vagas', 'br', { page: '2', utm_source: 'test', q: 'ERP' })
    expect(metadata.alternates).toEqual({ canonical: 'https://jobs.portalerp.com/br/vagas?page=2' })
    expect(metadata.robots).toEqual({ index: false, follow: true })
    expect((await pageMetadata({}, '/vagas', 'br', { page: '1', utm_source: 'test' })).robots).toBeUndefined()
  })
})
