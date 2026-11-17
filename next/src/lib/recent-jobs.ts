import { publicJobCompanyPath, type PublicJobCompanyData } from './public-company-url'
import { publicJobPath, type PublicJobUrlData } from './public-job-url'
import { publicJob } from './regional-sitemap'
import { formatDate, requireRegionalBaseUrl, type RegionalSite } from './site'

export const RECENT_JOBS_LIMIT = 20

export type RecentJob = PublicJobUrlData & PublicJobCompanyData & {
  company_logo_url?: string | null
  location?: string | null
  city?: string | null
  state?: string | null
  work_modality?: string | null
  contract_type?: string | null
  created_at?: string | null
  is_active?: boolean
  status?: string
  expires_at?: string
  site_id?: number
  site_code?: string
}

function publicationTimestamp(value: RecentJob['created_at']): number | null {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

/** Builders validate IDs/snapshots; visibility and regional scope must also hold. */
export function selectRecentJobs(jobs: readonly RecentJob[], site: RegionalSite): RecentJob[] {
  try { requireRegionalBaseUrl(site) } catch { return [] }

  return jobs.filter(job => {
    if (!job || !publicJob({ id: job.id, is_active: job.is_active, status: job.status, expires_at: job.expires_at }) ||
        (job.site_id != null && site.id != null && job.site_id !== site.id) ||
        (job.site_code != null && job.site_code !== site.code)) return false
    try { publicJobPath(job, site); return true } catch { return false }
  }).sort((a, b) => {
    const aDate = publicationTimestamp(a.created_at)
    const bDate = publicationTimestamp(b.created_at)
    if (aDate === null && bDate !== null) return 1
    if (bDate === null && aDate !== null) return -1
    if (aDate !== null && bDate !== null && aDate !== bDate) return bDate - aDate
    return Number(b.id) - Number(a.id)
  }).slice(0, RECENT_JOBS_LIMIT)
}

export function recentJobPublication(job: RecentJob, site: RegionalSite): { dateTime: string; label: string } | null {
  const timestamp = publicationTimestamp(job.created_at)
  if (timestamp === null) return null
  try {
    const date = new Date(timestamp)
    return { dateTime: date.toISOString(), label: formatDate(date, site) }
  } catch { return null }
}

export function recentJobCompanyPath(job: RecentJob, site: RegionalSite): string | null {
  try { return publicJobCompanyPath(job, site) } catch { return null }
}
