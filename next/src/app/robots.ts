import type { MetadataRoute } from 'next'
import { globalCanonicalOrigin } from '@/lib/global-site'
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/*/api/', '/*/bff/'] }],
    sitemap: `${globalCanonicalOrigin()}/sitemap.xml`,
  }
}
