import { cookies } from 'next/headers'
import { regionalRedirect } from './regional-redirect.server'
import { getSiteContext } from './site-resolver.server'
import { regionalizePath } from './regional-routes'

import { COMPANY_ACCESS_COOKIE, COMPANY_REFRESH_COOKIE } from './company-bff'

export async function requireCompanySession(returnPath: string) {
  const store = await cookies()
  if (!store.has(COMPANY_ACCESS_COOKIE) && !store.has(COMPANY_REFRESH_COOKIE)) {
    const { site } = await getSiteContext()
    await regionalRedirect(`/empresa/login?redirect=${encodeURIComponent(regionalizePath(site.url_prefix, returnPath))}`)
  }
}
