export type SiteCode = string
export type RegionalSite = {
  id?: number
  code: SiteCode
  name: string
  country_code: string
  locale: string
  currency_code: string
  timezone: string
  canonical_origin: string | null
  url_prefix: string
  regional_base_url?: string | null
  is_active: boolean
}
export type RegionalContext = { site: RegionalSite; locale: string }
export type ActiveSitesResponse = { sites: RegionalSite[] }
export function requireCanonicalOrigin(site: RegionalSite): string {
  if (!site.is_active || !site.canonical_origin) throw new Error(`Regional site ${site.code} is not publicly routable`)
  const url = new URL(site.canonical_origin)
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error('Canonical origin must be an HTTPS origin without a path')
  return url.origin
}
export function requireRegionalBaseUrl(site: RegionalSite): string {
  const origin = requireCanonicalOrigin(site)
  if (!/^\/[a-z]{2}$/.test(site.url_prefix)) throw new Error('Site has no valid regional prefix')
  const base = `${origin}${site.url_prefix}`
  if (site.regional_base_url && site.regional_base_url !== base) throw new Error('Inconsistent regional base URL')
  return base
}
export function getSelectableSites(sites: RegionalSite[]): RegionalSite[] {
  return sites.filter(site => { try { requireRegionalBaseUrl(site); return true } catch { return false } }).sort((a, b) => a.name.localeCompare(b.name, a.locale))
}
export function formatCurrency(value: number, site: RegionalSite): string {
  return new Intl.NumberFormat(site.locale, { style: 'currency', currency: site.currency_code, maximumFractionDigits: 0 }).format(value)
}
export function formatDate(value: string | Date, site: RegionalSite): string {
  return new Intl.DateTimeFormat(site.locale, { dateStyle: 'short', timeZone: site.timezone }).format(new Date(value))
}
export function openGraphLocale(site: RegionalSite): string { return site.locale.replace(/-/g, '_') }
