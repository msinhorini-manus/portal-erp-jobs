import { ApiError, getJobById } from './api'
import { getSiteContext, RegionalApiError } from './site-resolver.server'
import { assertPublicRegionalJob, canonicalJobId, jobCollection, publicJobCanonical } from './public-job-url'
export type NumericJobParams = { country: string; id: string; collection?: string }
export async function numericJobRedirect(request: Request, { params }: { params: Promise<NumericJobParams> }) {
  const { country, id, collection = 'vagas' } = await params
  const safeHeaders = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
  try {
    const jobId = canonicalJobId(id)
    const context = await getSiteContext(country)
    if (collection !== jobCollection(context.site.locale)) return new Response(null, { status: 404, headers: safeHeaders })
    // Route handlers do not infer identity/site from requestStore: country is explicit.
    const job = await getJobById(jobId, { country, context, cache: 'no-store' })
    assertPublicRegionalJob(job, context.site, jobId)
    // Use the trusted site's canonical origin, never request.url or forwarded Host.
    const location = `${publicJobCanonical(job, context.site)}${new URL(request.url).search}`
    return new Response(null, { status: 301, headers: { ...safeHeaders, Location: location } })
  } catch (error) {
    const status = error instanceof ApiError || error instanceof RegionalApiError ? error.status : undefined
    const notFound = !status || [400, 401, 403, 404].includes(status)
    return new Response(null, { status: notFound ? 404 : 503, headers: safeHeaders })
  }
}
export const numericJobHead = numericJobRedirect

// Next requires the same segment name at this depth for short and long URLs.
// In the short legacy URL, [companySlug] contains only the old numeric ID.
export type NumericJobTokenParams = Omit<NumericJobParams, 'id'> & { companySlug: string }
export function numericJobTokenRedirect(request: Request, { params }: { params: Promise<NumericJobTokenParams> }) {
  return numericJobRedirect(request, {
    params: params.then(({ companySlug, ...rest }) => ({ ...rest, id: companySlug })),
  })
}
