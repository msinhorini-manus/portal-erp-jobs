export * from './public-company-url-core.js'
import { publicCompanyPath, type PublicCompanyUrlData } from './public-company-url-core.js'
import { requireCanonicalOrigin, type RegionalSite } from './site'
export function publicCompanyCanonical(company: PublicCompanyUrlData, site: RegionalSite) {
  return `${requireCanonicalOrigin(site)}${publicCompanyPath(company, site)}`
}
