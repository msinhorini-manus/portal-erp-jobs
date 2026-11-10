import { headers } from 'next/headers'
import { activeSitesFor, resolveSiteFor } from '@/lib/site-resolver.server'
import { countryPrefix, defaultCountry } from '@/lib/regional-routes'
import { normalizeRequestHost } from '@/lib/regional-transport'
import { requireCanonicalOrigin, requireRegionalBaseUrl } from '@/lib/site'
import { xmlEscape } from '@/lib/regional-sitemap'
import { globalCanonicalOrigin } from '@/lib/global-site'
export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    const host = normalizeRequestHost((await headers()).get('host'))
    const prefix = countryPrefix(defaultCountry())
    // The global default must actually be active; no silent empty index.
    await resolveSiteFor(host, prefix)
    const sites = (await activeSitesFor(host, prefix)).filter(site => requireCanonicalOrigin(site) === globalCanonicalOrigin())
    if (!sites.length) throw new Error('No live global site mappings')
    const routable = await Promise.all(sites.map(async site => {
      const resolved = await resolveSiteFor(host, site.url_prefix)
      if (resolved.site.code !== site.code) throw new Error('Ambiguous global sitemap site')
      return `<sitemap><loc>${xmlEscape(`${requireRegionalBaseUrl(site)}/sitemap.xml`)}</loc></sitemap>`
    }))
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routable.join('')}</sitemapindex>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-store' } })
  } catch {
    return new Response('Sitemap index unavailable', { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } })
  }
}
