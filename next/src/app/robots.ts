import { MetadataRoute } from 'next'

import { getSiteContext } from '@/lib/site-resolver.server'
import { requireCanonicalOrigin } from '@/lib/site'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { site } = await getSiteContext()
  const origin = requireCanonicalOrigin(site)

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/candidato/', '/empresa/', '/admin/'],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  }
}
