import { headers } from 'next/headers'

import type { ActiveSitesResponse, RegionalContext, RegionalSite } from './site'
import { getSelectableSites } from './site'

function normalizeRequestHost(host: string | null): string {
  const value = (host || '').trim().toLowerCase()
  if (!value) {
    throw new Error('Request host is unavailable')
  }
  return value
}

async function requestApi<T>(path: string, revalidate = 60): Promise<T> {
  const requestHeaders = await headers()
  const host = normalizeRequestHost(requestHeaders.get('host'))
  const forwardedProto = requestHeaders.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const protocol = forwardedProto || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')
  const publicOrigin = `${protocol}://${host}`
  const internalOrigin = process.env.NEXT_INTERNAL_API_ORIGIN?.replace(/\/$/, '') || publicOrigin

  const response = await fetch(`${internalOrigin}/api${path}`, {
    headers: internalOrigin === publicOrigin ? undefined : { 'X-Regional-Host': host },
    next: { revalidate, tags: [`regional-context:${host}`] },
  })

  if (!response.ok) {
    throw new Error(`Regional context unavailable (${response.status})`)
  }
  return response.json() as Promise<T>
}

export async function getSiteContext(): Promise<RegionalContext> {
  const context = await requestApi<RegionalContext>('/context')
  if (!context.site.is_active || context.locale !== context.site.locale) {
    throw new Error('Regional context is inconsistent or inactive')
  }
  return context
}

export async function getActiveSites(): Promise<RegionalSite[]> {
  const response = await requestApi<ActiveSitesResponse>('/sites')
  return getSelectableSites(response.sites)
}
