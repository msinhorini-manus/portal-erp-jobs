export { canonicalJobId, fallbackJobSlug, jobCollection, publicJobPath, publicJobRelativePath, validPublicJobSlug } from './public-job-url-core.js'
export type { PublicJobUrlData } from './public-job-url-core.js'
import { canonicalJobId, publicJobPath, type PublicJobUrlData } from './public-job-url-core.js'
import { requireCanonicalOrigin, type RegionalSite } from './site'
import { publicJob } from './regional-sitemap'
export function publicJobCanonical(job: PublicJobUrlData, site: RegionalSite) {
  return `${requireCanonicalOrigin(site)}${publicJobPath(job, site)}`
}
export function assertPublicRegionalJob(job: PublicJobUrlData & { is_active?: boolean; status?: string; expires_at?: string; site_id?: number; site_code?: string }, site: RegionalSite, id: string) {
  if (!site.is_active || !publicJob(job) || canonicalJobId(job.id) !== canonicalJobId(id) ||
      (job.site_id != null && site.id != null && job.site_id !== site.id) ||
      (job.site_code != null && job.site_code !== site.code)) throw new Error('Public regional job unavailable')
}
