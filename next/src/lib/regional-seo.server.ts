import type { Metadata } from 'next'
import type { RegionalSite } from './site'
import { openGraphLocale, requireCanonicalOrigin, requireRegionalBaseUrl } from './site'
import { regionalHref, regionalizePath, type RouteKey } from './regional-routes'
import { getSiteContext } from './site-resolver.server'

export function regionalCanonical(site: RegionalSite, key: RouteKey, params: Record<string, string | number> = {}) {
  return `${requireCanonicalOrigin(site)}${regionalHref(site, key, params)}`
}
export type EquivalentPublication = { entityKey: string; site: RegionalSite; path: string; published: boolean; indexable: boolean }
export function getPublishedAlternates(entityKey: string, publications: EquivalentPublication[]) {
  const live = publications.filter(p => p.entityKey === entityKey && p.published && p.indexable && p.site.is_active)
  if (live.length < 2) return undefined
  const languages: Record<string, string> = {}
  for (const p of live) {
    requireRegionalBaseUrl(p.site)
    if (!/^[a-z]{2,3}-[A-Z]{2}$/.test(p.site.locale) || !p.path.startsWith(`${p.site.url_prefix}/`) && p.path !== p.site.url_prefix) throw new Error('Invalid publication alternate')
    if (languages[p.site.locale]) throw new Error('Ambiguous locale equivalent')
    languages[p.site.locale] = `${requireCanonicalOrigin(p.site)}${p.path}`
  }
  return languages
}
export async function pageMetadata(metadata: Metadata, path: string, country: string, search?: Record<string, string | string[] | undefined>): Promise<Metadata> {
  const { site } = await getSiteContext(country)
  let route = regionalizePath(site.url_prefix, path)
  // Search/filter permutations remain crawlable but aren't independently indexed.
  // Genuine pagination retains a self canonical and no campaign parameters.
  const page = Number(Array.isArray(search?.page) ? search?.page[0] : search?.page)
  if (Number.isInteger(page) && page > 1) route += `?page=${page}`
  const filtered = Object.keys(search || {}).some(key => !['page', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'].includes(key) && Boolean(search?.[key]))
  const canonical = `${requireCanonicalOrigin(site)}${route}`
  return {
    ...metadata,
    alternates: { canonical },
    openGraph: { type: 'website', ...(typeof metadata.title === 'string' ? { title: metadata.title } : {}), ...(metadata.description ? { description: metadata.description } : {}), ...metadata.openGraph, url: canonical, locale: openGraphLocale(site) },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  }
}
