import { NextRequest, NextResponse } from 'next/server'
import { countryPrefix } from './regional-routes'
import { requestRegion } from './regional-transport'
export type RegionalRouteContext = { params: Promise<{ country: string; [key: string]: string | string[] }> }
export function withRegionalRoute<C extends RegionalRouteContext>(handler: (request: NextRequest, context: C) => Promise<Response>) {
  return async (request: NextRequest, context: C): Promise<Response> => {
    try {
      const { country } = await context.params
      if (requestRegion(request).prefix !== countryPrefix(country)) return NextResponse.json({ error: 'Região inválida.' }, { status: 404 })
    } catch { return NextResponse.json({ error: 'Região inválida.' }, { status: 404 }) }
    try { return await handler(request, context) } catch {
      // Never expose upstream URL, credentials, token or body in an error.
      return NextResponse.json({ error: 'Serviço regional indisponível.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
    }
  }
}
