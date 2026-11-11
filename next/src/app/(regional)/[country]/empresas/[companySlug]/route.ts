// Numeric-only and incomplete public profiles never redirect or render canonical metadata.
const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
export async function GET() { return new Response(null, { status: 404, headers }) }
export const HEAD = GET
