import { NextRequest, NextResponse } from 'next/server'
import { countryPrefix, defaultCountry } from './lib/regional-routes'
import { internalApiOrigin, normalizeRequestHost, trustedRegionalHeaders } from './lib/regional-transport'

export async function proxy(request: NextRequest) {
  const h = new Headers(request.headers)
  for (const name of [...h.keys()]) {
    if (/^(?:x-regional-|x-next-regional-)/i.test(name)) h.delete(name)
  }
  const country = request.nextUrl.pathname.split('/')[1] || ''
  const globals = new Set(['', 'robots.txt', 'sitemap.xml', '_next', 'assets', 'uploads', 'brand', 'admin', 'icon.png', 'og-image.png', 'og-image.svg', 'favicon.ico'])
  if (!globals.has(country) && !/^[a-z]{2}$/.test(country)) return new NextResponse('Not found', { status: 404, headers: { 'X-Robots-Tag': 'noindex' } })
  if (/^[a-z]{2}$/.test(country)) {
    const prefix = countryPrefix(country)
    let host: string
    try { host = normalizeRequestHost(h.get('host') || request.nextUrl.host) } catch {
      return new NextResponse('Not found', { status: 404 })
    }
    // Resolution is always live: inactive/unknown countries fail before pages,
    // APIs and BFFs. Backend validates the active mapping, not a BR allowlist.
    try {
      const response = await fetch(`${internalApiOrigin()}/api/context`, { headers: trustedRegionalHeaders(host, prefix), cache: 'no-store' })
      if ([400, 404].includes(response.status)) return new NextResponse('Not found', { status: 404, headers: { 'X-Robots-Tag': 'noindex' } })
      if (!response.ok) return new NextResponse('Regional service unavailable', { status: 503 })
      const context = await response.json()
      if (!context?.site?.is_active || context.site.url_prefix !== prefix || context.site.country_code?.toLowerCase() !== country || context.locale !== context.site.locale) return new NextResponse('Not found', { status: 404 })
      h.set('x-next-regional-country', country)
      h.set('x-next-regional-prefix', prefix)
      h.set('x-next-regional-path', request.nextUrl.pathname)
      // Next rewrite /:country/api -> stable private /api keeps these headers.
      if (request.nextUrl.pathname.startsWith(`${prefix}/api/`)) {
        h.set('X-Regional-Host', host)
        h.set('X-Regional-Prefix', prefix)
      }
    } catch { return new NextResponse('Regional service unavailable', { status: 503 }) }
  }
  // Global entry never infers a country from cookies/headers/geolocation.
  if (request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone(); url.pathname = countryPrefix(defaultCountry())
    return NextResponse.redirect(url, 307)
  }
  return NextResponse.next({ request: { headers: h } })
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|og-image.png|brand/|assets/|uploads/).*)'] }
