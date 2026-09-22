import { MetadataRoute } from 'next'

import { getJobs } from '@/lib/api'
import { getSiteContext } from '@/lib/site-resolver.server'
import { requireCanonicalOrigin } from '@/lib/site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { site } = await getSiteContext()
  const baseUrl = requireCanonicalOrigin(site)
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/vagas`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/empresas`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/areas`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/tecnologias`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/salarios`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/conteudo`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
  ]

  let jobPages: MetadataRoute.Sitemap = []
  try {
    const data = await getJobs()
    const jobs = Array.isArray(data) ? data : data?.jobs || []
    jobPages = jobs.map((job: any) => ({
      url: `${baseUrl}/vagas/${job.id}`,
      lastModified: new Date(job.updated_at || job.created_at || new Date()),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }))
  } catch (error) {
    console.error(`Sitemap: failed to fetch jobs for site ${site.code}`, error)
  }

  return [...staticPages, ...jobPages]
}
