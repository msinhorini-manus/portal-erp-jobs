import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { COMPANY_ACCESS_COOKIE, COMPANY_REFRESH_COOKIE } from './company-bff'

export async function requireCompanySession(returnPath: string) {
  const store = await cookies()
  if (!store.has(COMPANY_ACCESS_COOKIE) && !store.has(COMPANY_REFRESH_COOKIE)) {
    redirect(`/empresa/login?redirect=${encodeURIComponent(returnPath)}`)
  }
}
