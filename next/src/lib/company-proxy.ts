import { internalApiOrigin, trustedRegionalHeaders } from './regional-transport'
import { assertPublicRegionalCompany, canonicalCompanyId, companyCollection, publicCompanyPath, validPublicCompanySlug } from './public-company-url'
import type { RegionalContext } from './site'
import { internalReadFetch } from './internal-read-fetch'
/** Called after live region resolution and sanitization; never forwards browser auth. */
export async function canonicalCompanyProxy(pathname: string, method: string, host: string, context: RegionalContext): Promise<Response | null> {
  // Catch all detail/duplicate shapes; only one exact persisted slug can render.
  const match = pathname.match(/^\/([a-z]{2})\/(empresas|companies)\/(.+)$/i)
  if (!match) return null
  const safeHeaders = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
  const missing = () => new Response(null, { status: 404, headers: safeHeaders })
  if (!['GET', 'HEAD'].includes(method)) return new Response(null, { status: 405, headers: { ...safeHeaders, Allow: 'GET, HEAD' } })
  const slug = match[3]
  if (!context.site.is_active || context.site.url_prefix !== `/${match[1]}` ||
      match[2] !== companyCollection(context.site.locale) || !validPublicCompanySlug(slug)) return missing()
  try {
    const response = await internalReadFetch(`${internalApiOrigin()}/api/companies/by-slug/${slug}`, {
      headers: trustedRegionalHeaders(host, context.site.url_prefix), cache: 'no-store', redirect: 'error',
    })
    if (!response.ok) return new Response(null, { status: [400, 401, 403, 404].includes(response.status) ? 404 : 503, headers: safeHeaders })
    const company = await response.json()
    try {
      assertPublicRegionalCompany(company, context.site, canonicalCompanyId(company?.id))
      if (company.public_profile_slug !== slug || pathname !== publicCompanyPath(company, context.site)) return missing()
    } catch { return missing() }
    return null
  } catch { return new Response(null, { status: 503, headers: safeHeaders }) }
}
