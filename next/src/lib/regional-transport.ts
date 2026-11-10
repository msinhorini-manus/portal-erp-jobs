import { countryPrefix, prefixFromPath } from './regional-routes'

export function normalizeRequestHost(host: string | null): string {
  const value = (host || '').trim().toLowerCase()
  if (!value || !/^(?:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?|\[[a-f0-9:]+\])(?::\d{1,5})?$/.test(value)) throw new Error('Invalid request Host')
  return value
}
export function internalApiOrigin(): string {
  // Never fall back to a production/public origin or recurse into Next.
  const value = process.env.NEXT_INTERNAL_API_ORIGIN || 'http://127.0.0.1:5000'
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.username || url.password || url.search || url.hash) throw new Error('Invalid NEXT_INTERNAL_API_ORIGIN')
  return url.origin
}
export function trustedRegionalHeaders(host: string, prefix: string, initial?: HeadersInit): Headers {
  countryPrefix(prefix.slice(1))
  const result = new Headers(initial)
  for (const name of [...result.keys()]) {
    if (/^(?:x-regional-|x-next-regional-|x-forwarded-)/i.test(name) || name === 'host') result.delete(name)
  }
  result.set('X-Regional-Host', normalizeRequestHost(host))
  result.set('X-Regional-Prefix', prefix)
  return result
}
export function requestRegion(request: { nextUrl: { pathname: string; host: string }; headers: Headers }) {
  return { host: normalizeRequestHost(request.headers.get('host') || request.nextUrl.host), prefix: prefixFromPath(request.nextUrl.pathname) }
}
export function contextCacheTag(host: string, prefix: string, site?: { id?: number; code: string; locale: string }) {
  return `regional:${host}:${prefix}${site ? `:${site.id ?? site.code}:${site.locale}` : ''}`
}
