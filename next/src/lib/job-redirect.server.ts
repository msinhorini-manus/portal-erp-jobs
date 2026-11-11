export type NumericJobParams = { country: string; id: string; collection?: string }
// Historical export names are retained for the route handlers. Numeric public
// job URLs were never launched and must not redirect or resolve a job identity.
export async function numericJobRedirect(request: Request, _options: { params: Promise<NumericJobParams> }) {
  const safeHeaders = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { ...safeHeaders, Allow: 'GET, HEAD' } })
  return new Response(null, { status: 404, headers: safeHeaders })
}
export const numericJobHead = numericJobRedirect

// Next requires the same segment name at this depth for short and long URLs.
// In the rejected short URL, [companySlug] contains the old numeric ID.
export type NumericJobTokenParams = Omit<NumericJobParams, 'id'> & { companySlug: string }
export function numericJobTokenRedirect(request: Request, { params }: { params: Promise<NumericJobTokenParams> }) {
  return numericJobRedirect(request, {
    params: params.then(({ companySlug, ...rest }) => ({ ...rest, id: companySlug })),
  })
}
