import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/candidato/', '/empresa/', '/admin/'],
      },
    ],
    sitemap: 'https://jobs.portalerp.com.br/sitemap.xml',
  }
}
