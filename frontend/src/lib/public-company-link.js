import { getRegionalRuntime } from './regional-runtime.js'
import { publicCompanyRelativePath, publicJobCompany } from './public-company-url.js'
export function publicCompanyLink(company) {
  const runtime = getRegionalRuntime()
  if (!runtime.site?.is_active) throw new Error('Public company context unavailable')
  return `${runtime.basename ? '' : runtime.prefix}${publicCompanyRelativePath(company, runtime.site.locale)}`
}
export function publicJobCompanyLink(job) {
  const company = publicJobCompany(job)
  return company ? publicCompanyLink(company) : null
}
