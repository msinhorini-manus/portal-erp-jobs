import { MetadataRoute } from 'next'

import { getCompanies, getJobs } from '@/lib/api'
import { getSiteContext } from '@/lib/site-resolver.server'
import { requireCanonicalOrigin } from '@/lib/site'

type ApiPage<T> = { total?: number; pages?: number; jobs?: T[]; companies?: T[] }

async function collectAll<T>(fetchPage: (page: number) => Promise<ApiPage<T>>, key: 'jobs' | 'companies'): Promise<T[]> {
  const collected: T[] = []
  let page = 1
  let pages = 1
  do {
    const response = await fetchPage(page)
    const items = response[key] as T[] | undefined
    collected.push(...(items || []))
    pages = Math.max(1, Math.min(Number(response.pages || 1), 1000))
    page += 1
  } while (page <= pages)
  return collected
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { site } = await getSiteContext()
  const baseUrl = requireCanonicalOrigin(site)
  const now = new Date()
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/vagas`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/empresas`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/areas`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/tecnologias`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/salarios`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/conteudo`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/sobre`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/contato`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/privacidade`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/termos`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  let jobPages: MetadataRoute.Sitemap = []
  let companyPages: MetadataRoute.Sitemap = []
  try {
    const jobs = await collectAll<any>(page => getJobs({ page: String(page), per_page: '100' }), 'jobs')
    jobPages = jobs.map(job => ({
      url: `${baseUrl}/vagas/${job.id}`,
      lastModified: new Date(job.updated_at || job.created_at || now),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }))
  } catch (error) {
    console.error(`Sitemap: failed to fetch jobs for site ${site.code}`, error)
  }

  try {
    const companies = await collectAll<any>(page => getCompanies({ page: String(page), per_page: '100' }), 'companies')
    companyPages = companies.map(company => ({
      url: `${baseUrl}/empresas/${company.id}`,
      lastModified: new Date(company.updated_at || company.created_at || now),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  } catch (error) {
    console.error(`Sitemap: failed to fetch companies for site ${site.code}`, error)
  }

  return [...staticPages, ...jobPages, ...companyPages]
}
