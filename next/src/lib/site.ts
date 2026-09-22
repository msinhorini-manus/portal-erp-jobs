export type SiteCode = string

export type RegionalSite = {
  code: SiteCode
  name: string
  country_code: string
  locale: string
  currency_code: string
  timezone: string
  canonical_origin: string | null
  is_active: boolean
}

export type RegionalContext = {
  site: RegionalSite
  locale: string
}

export type ActiveSitesResponse = {
  sites: RegionalSite[]
}

export function requireCanonicalOrigin(site: RegionalSite): string {
  if (!site.is_active || !site.canonical_origin) {
    throw new Error(`Regional site ${site.code} is not publicly routable`)
  }
  return site.canonical_origin.replace(/\/$/, '')
}

export function getSelectableSites(sites: RegionalSite[]): RegionalSite[] {
  return sites
    .filter((site) => site.is_active && Boolean(site.canonical_origin))
    .sort((a, b) => a.name.localeCompare(b.name, a.locale))
}

export function formatCurrency(value: number, site: RegionalSite): string {
  return new Intl.NumberFormat(site.locale, {
    style: 'currency',
    currency: site.currency_code,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(value: string | Date, site: RegionalSite): string {
  return new Intl.DateTimeFormat(site.locale, {
    dateStyle: 'short',
    timeZone: site.timezone,
  }).format(new Date(value))
}

export function openGraphLocale(site: RegionalSite): string {
  return site.locale.replace('-', '_')
}
