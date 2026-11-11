import { publicJob } from './regional-sitemap'
import { getSiteContext, serverRegion } from './site-resolver.server'
import { contextCacheTag, internalApiOrigin, trustedRegionalHeaders } from './regional-transport'
import type { RegionalContext } from './site'
export class ApiError extends Error {
  constructor(public status: number) { super(`API request failed (${status})`) }
}
type SiteFetchOptions = RequestInit & { next?: { revalidate?: number; tags?: string[] }; country?: string; context?: RegionalContext }
export async function fetchAPI(endpoint: string, options: SiteFetchOptions = {}) {
  const { country, context: suppliedContext, ...init } = options
  const { host, prefix } = await serverRegion(country)
  const { site } = suppliedContext || await getSiteContext(country)
  if (site.url_prefix !== prefix || !site.is_active) throw new Error('API context does not match route')
  if (!endpoint.startsWith('/') || endpoint.startsWith('//')) throw new Error('Invalid internal API path')
  const tags = [...(init.next?.tags || []), contextCacheTag(host, prefix, site)]
  const response = await fetch(`${internalApiOrigin()}/api${endpoint}`, {
    ...init, headers: trustedRegionalHeaders(host, prefix, init.headers),
    ...(init.cache === 'no-store' ? {} : { next: { revalidate: init.next?.revalidate ?? 60, tags } }),
  })
  if (!response.ok) throw new ApiError(response.status)
  return response.json()
}
export async function getAreas() { return fetchAPI('/config/areas') }
export async function getTechnologies() { return fetchAPI('/config/technologies') }
export async function getSkills() { return fetchAPI('/config/skills') }
export async function getJobs(params?: Record<string, string>, options?: SiteFetchOptions) { return fetchAPI(`/jobs/${params ? `?${new URLSearchParams(params)}` : ''}`, options) }
export async function getJobById(id: string, options: SiteFetchOptions = {}) {
  const job = await fetchAPI(`/jobs/${encodeURIComponent(id)}`, { ...options, cache: 'no-store' })
  if (!publicJob(job)) throw new ApiError(404)
  return job
}
export async function getCompanies(params?: Record<string, string>, options?: SiteFetchOptions) { return fetchAPI(`/companies/search${params ? `?${new URLSearchParams(params)}` : ''}`, options) }
export async function getCompanyById(id: string, options: SiteFetchOptions = {}) { return fetchAPI(`/companies/${encodeURIComponent(id)}`, { ...options, cache: 'no-store', redirect: 'error' }) }
export async function getLevels() { return fetchAPI('/config/levels') }
export async function getModalities() { return fetchAPI('/config/modalities') }
export async function getDashboardStats() { return fetchAPI('/stats/dashboard') }
