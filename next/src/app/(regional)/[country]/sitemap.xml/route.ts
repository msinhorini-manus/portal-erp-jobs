import { ApiError, getCompanies, getJobs, getJobById, getCompanyBySlug } from '@/lib/api'
import { getSiteContext } from '@/lib/site-resolver.server'
import { collectAll, regionalSitemapXml, type SitemapEntity } from '@/lib/regional-sitemap'
import { assertPublicRegionalCompany, canonicalCompanyId, validPublicCompanySlug } from '@/lib/public-company-url'
export const dynamic = 'force-dynamic'
export async function GET(_request: Request, { params }: { params: Promise<{ country: string }> }) {
  const { country } = await params
  const context = await getSiteContext(country)
  try {
    const options = { country, context, cache: 'no-store' as const }
    const [jobs, companies] = await Promise.all([
      collectAll<SitemapEntity>(page => getJobs({ page: String(page), per_page: '100' }, options), 'jobs'),
      collectAll<SitemapEntity>(page => getCompanies({ page: String(page), per_page: '100' }, options), 'companies'),
    ])
    // List DTOs omit expiry. Check every detail, bounded to eight concurrent
    // requests, and fail the inventory on any non-404 critical upstream error.
    const publicJobs: SitemapEntity[] = []
    for (let offset = 0; offset < jobs.length; offset += 8) {
      const batch = await Promise.all(jobs.slice(offset, offset + 8).map(async job => {
        try { return await getJobById(String(job.id), options) as SitemapEntity } catch (error) {
          if (error instanceof ApiError && error.status === 404) return null
          throw error
        }
      }))
      publicJobs.push(...batch.filter((job): job is SitemapEntity => job !== null))
    }
    const publicCompanies: SitemapEntity[] = []
    for (let offset = 0; offset < companies.length; offset += 8) {
      const batch = await Promise.all(companies.slice(offset, offset + 8).map(async company => {
        const id = canonicalCompanyId(company.id)
        const slug = company.public_profile_slug
        if (!validPublicCompanySlug(slug)) throw new Error('Invalid public company slug snapshot')
        try {
          const detail = await getCompanyBySlug(slug!, options) as SitemapEntity
          assertPublicRegionalCompany(detail, context.site, id)
          if (detail.public_profile_slug !== slug) throw new Error('Company inventory slug mismatch')
          return detail
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) return null
          throw error
        }
      }))
      publicCompanies.push(...batch.filter((company): company is SitemapEntity => company !== null))
    }
    return new Response(regionalSitemapXml(context.site, publicJobs, publicCompanies), { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-store' } })
  } catch {
    return new Response('Sitemap inventory unavailable', { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } })
  }
}
