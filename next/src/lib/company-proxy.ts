import { internalApiOrigin, trustedRegionalHeaders } from './regional-transport'
import { assertPublicRegionalCompany, canonicalCompanyId, companyCollection, publicCompanyPath } from './public-company-url'
import type { RegionalContext } from './site'
import { internalReadFetch } from './internal-read-fetch'
/** Called after live region resolution and sanitization; never forwards browser auth. */
export async function canonicalCompanyProxy(pathname: string, method: string, host: string, context: RegionalContext): Promise<Response | null> {
  const match = pathname.match(/^\/[a-z]{2}\/(empresas|companies)\/([^/]+)(?:\/([^/]+))?\/?$/)
  if (!match) return null
  const safeHeaders = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
  if (!['GET', 'HEAD'].includes(method)) return new Response(null, { status: 405, headers: { ...safeHeaders, Allow: 'GET, HEAD' } })
  // Numeric-only legacy details and wrong collections are never canonical/redirects.
  if (!match[3] || match[1] !== companyCollection(context.site.locale)) return new Response(null, { status: 404, headers: safeHeaders })
  let id: string
  try { id = canonicalCompanyId(match[3]) } catch { return new Response(null, { status: 404, headers: safeHeaders }) }
  try {
    const response = await internalReadFetch(`${internalApiOrigin()}/api/companies/${id}`, {
      headers: trustedRegionalHeaders(host, context.site.url_prefix), cache: 'no-store', redirect: 'error',
    })
    if (!response.ok) return new Response(null, { status: [400, 401, 403, 404].includes(response.status) ? 404 : 503, headers: safeHeaders })
    const company = await response.json()
    try { assertPublicRegionalCompany(company, context.site, id) } catch { return new Response(null, { status: 404, headers: safeHeaders }) }
    const target = publicCompanyPath(company, context.site)
    if (pathname !== target) return new Response(null, { status: 404, headers: safeHeaders })
    return null
  } catch { return new Response(null, { status: 503, headers: safeHeaders }) }
}
