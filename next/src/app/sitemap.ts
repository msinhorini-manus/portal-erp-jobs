import { MetadataRoute } from 'next'

const BASE_URL = 'https://jobs.portalerp.com.br'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/vagas`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/empresas`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/areas`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/tecnologias`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/salarios`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/conteudo`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ]

  // Dynamic job pages
  let jobPages: MetadataRoute.Sitemap = []
  try {
    const res = await fetch(`${BASE_URL}/api/jobs/`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      const jobs = Array.isArray(data) ? data : data?.jobs || []
      jobPages = jobs.map((job: any) => ({
        url: `${BASE_URL}/vagas/${job.id}`,
        lastModified: new Date(job.updated_at || job.created_at || new Date()),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      }))
    }
  } catch (e) {
    console.error('Sitemap: Failed to fetch jobs', e)
  }

  return [...staticPages, ...jobPages]
}
