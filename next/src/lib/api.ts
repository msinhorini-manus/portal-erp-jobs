import { getSiteContext } from './site-resolver.server'
import { requireCanonicalOrigin } from './site'

type SiteFetchOptions = RequestInit & {
  next?: {
    revalidate?: number
    tags?: string[]
  }
}

export async function fetchAPI(endpoint: string, options: SiteFetchOptions = {}) {
  const { site } = await getSiteContext()
  const publicOrigin = requireCanonicalOrigin(site)
  const internalOrigin = process.env.NEXT_INTERNAL_API_ORIGIN?.replace(/\/$/, '') || publicOrigin
  const url = `${internalOrigin}/api${endpoint}`
  const tags = [...(options.next?.tags || []), `site:${site.code}`]
  const siteHost = new URL(publicOrigin).host
  const requestHeaders = new Headers(options.headers)
  if (internalOrigin !== publicOrigin) {
    requestHeaders.set('X-Regional-Host', siteHost)
  }

  const response = await fetch(url, {
    ...options,
    headers: requestHeaders,
    next: {
      revalidate: options.next?.revalidate ?? 60,
      tags,
    },
  })

  if (!response.ok) {
    throw new Error(`API error for site ${site.code}: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

export async function getAreas() {
  return fetchAPI('/config/areas')
}

export async function getTechnologies() {
  return fetchAPI('/config/technologies')
}

export async function getJobs(params?: Record<string, string>) {
  const searchParams = params ? `?${new URLSearchParams(params).toString()}` : ''
  return fetchAPI(`/jobs/${searchParams}`)
}

export async function getJobById(id: string) {
  return fetchAPI(`/jobs/${id}`)
}

export async function getCompanies() {
  return fetchAPI('/companies/search')
}

export async function getCompanyById(id: string) {
  return fetchAPI(`/companies/${id}`)
}

export async function getLevels() {
  return fetchAPI('/config/levels')
}

export async function getModalities() {
  return fetchAPI('/config/modalities')
}
