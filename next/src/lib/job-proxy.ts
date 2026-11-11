import { internalApiOrigin, trustedRegionalHeaders } from './regional-transport'
import { assertPublicRegionalJob, canonicalJobId, jobCollection, publicJobPath } from './public-job-url'
import type { RegionalContext } from './site'
import { internalReadFetch } from './internal-read-fetch'
/** Runs only AFTER the proxy sanitized incoming regional headers and resolved context.
 * No browser Cookie/Authorization/X-Regional-* enters this anonymous detail fetch.
 */
export async function canonicalJobProxy(pathname: string, search: string, method: string, host: string, context: RegionalContext): Promise<Response | null> {
  const match = pathname.match(/^\/[a-z]{2}\/(vagas|vacantes|jobs)\/([^/]+)\/([^/]+)\/([^/]+)\/?$/)
  if (!match) return null
  const safeHeaders = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
  if (!['GET', 'HEAD'].includes(method)) return new Response(null, { status: 405, headers: { ...safeHeaders, Allow: 'GET, HEAD' } })
  if (match[1] !== jobCollection(context.site.locale)) return new Response(null, { status: 404, headers: safeHeaders })
  let id: string
  try { id = canonicalJobId(match[4]) } catch { return new Response(null, { status: 404, headers: safeHeaders }) }
  try {
    const response = await internalReadFetch(`${internalApiOrigin()}/api/jobs/${id}`, {
      headers: trustedRegionalHeaders(host, context.site.url_prefix), cache: 'no-store', redirect: 'error',
    })
    if (!response.ok) return new Response(null, { status: [400, 401, 403, 404].includes(response.status) ? 404 : 503, headers: safeHeaders })
    const job = await response.json()
    try { assertPublicRegionalJob(job, context.site, id) } catch { return new Response(null, { status: 404, headers: safeHeaders }) }
    const target = publicJobPath(job, context.site)
    if (pathname !== target) return new Response(null, { status: 404, headers: safeHeaders })
    return null
  } catch { return new Response(null, { status: 503, headers: safeHeaders }) }
}
