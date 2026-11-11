import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import type { ActiveSitesResponse, RegionalContext, RegionalSite } from './site'
import { getSelectableSites, requireRegionalBaseUrl } from './site'
import { countryPrefix } from './regional-routes'
import { internalApiOrigin, normalizeRequestHost, trustedRegionalHeaders } from './regional-transport'
import { internalReadFetch } from './internal-read-fetch'

export class RegionalApiError extends Error {
  constructor(public status: number) { super(`Regional context unavailable (${status})`) }
}
export async function serverRegion(country?: string) {
  const h = await headers()
  const host = normalizeRequestHost(h.get('host'))
  const routeCountry = country || h.get('x-next-regional-country') || ''
  let prefix: string
  try { prefix = countryPrefix(routeCountry) } catch { notFound() }
  if (country && h.get('x-next-regional-country') && h.get('x-next-regional-country') !== country) notFound()
  return { host, prefix }
}
export function assertRegionalContext(context: RegionalContext, prefix: string) {
  if (!context?.site?.is_active || context.locale !== context.site.locale || context.site.url_prefix !== prefix || context.site.country_code.toLowerCase() !== prefix.slice(1)) throw new RegionalApiError(404)
  requireRegionalBaseUrl(context.site)
  return context
}
export const resolveSiteFor = cache(async (host: string, prefix: string): Promise<RegionalContext> => {
  const response = await internalReadFetch(`${internalApiOrigin()}/api/context`, { headers: trustedRegionalHeaders(host, prefix), cache: 'no-store' })
  if (!response.ok) throw new RegionalApiError(response.status)
  return assertRegionalContext(await response.json(), prefix)
})
export async function getSiteContext(country?: string): Promise<RegionalContext> {
  const { host, prefix } = await serverRegion(country)
  try { return await resolveSiteFor(host, prefix) } catch (error) {
    if (error instanceof RegionalApiError && [400, 404].includes(error.status)) notFound()
    throw error
  }
}
export async function getActiveSites(country?: string): Promise<RegionalSite[]> {
  const { host, prefix } = await serverRegion(country)
  return activeSitesFor(host, prefix)
}
export async function activeSitesFor(host: string, prefix: string): Promise<RegionalSite[]> {
  const response = await internalReadFetch(`${internalApiOrigin()}/api/sites`, { headers: trustedRegionalHeaders(host, prefix), cache: 'no-store' })
  if (!response.ok) throw new RegionalApiError(response.status)
  const payload = await response.json() as ActiveSitesResponse
  if (!Array.isArray(payload.sites)) throw new Error('Invalid active sites response')
  return getSelectableSites(payload.sites)
}
