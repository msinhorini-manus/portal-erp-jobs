import { assertPublicRegionalCompany, canonicalCompanyId, publicCompanyPath, type PublicCompanyUrlData } from './public-company-url-core.js'
import { requireCanonicalOrigin, requireRegionalBaseUrl, type RegionalSite } from './site'
import { canonicalJobId, publicJobPath, type PublicJobUrlData } from './public-job-url-core.js'
export type SitemapEntity = PublicJobUrlData & PublicCompanyUrlData & { updated_at?: string; created_at?: string; is_active?: boolean; status?: string; expires_at?: string }
export type ApiPage<T> = { total?: number; pages?: number; current_page?: number; jobs?: T[]; companies?: T[] }
export function publicJob(job: SitemapEntity): boolean {
  return job.is_active !== false && (!job.status || ['active', 'approved'].includes(job.status)) && (!job.expires_at || new Date(job.expires_at).getTime() > Date.now())
}
export function publicCompany(company: SitemapEntity): boolean {
  return company.is_active !== false && (!company.status || company.status === 'approved')
}
export async function collectAll<T>(fetchPage: (page: number) => Promise<ApiPage<T>>, key: 'jobs' | 'companies'): Promise<T[]> {
  const result: T[] = []
  let pages = 1
  for (let page = 1; page <= pages; page += 1) {
    const response = await fetchPage(page)
    if (!Array.isArray(response[key])) throw new Error(`Invalid sitemap ${key} inventory`)
    const count = Number(response.pages ?? 1)
    if (!Number.isInteger(count) || count < 0 || count > 1000) throw new Error('Invalid sitemap pagination')
    if (response.total && count === 0 || response.total && page <= count && !response[key]?.length) throw new Error('Incomplete sitemap inventory')
    pages = Math.max(count, 1)
    result.push(...response[key] as T[])
  }
  return result
}
export const xmlEscape = (value: string) => value.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char]!))
export function regionalSitemapXml(site: RegionalSite, jobs: SitemapEntity[], companies: SitemapEntity[]) {
  const base = requireRegionalBaseUrl(site)
  // Detail collections alone do not homologate future ES/EN static/index routes.
  if (site.locale !== 'pt-BR') throw new Error('Localized sitemap routes are not homologated')
  const routes = ['', '/vagas', '/empresas', '/areas', '/tecnologias', '/salarios', '/conteudo', '/sobre', '/contato', '/privacidade', '/termos']
  const urls = routes.map(route => ({ url: `${base}${route}`, date: undefined as string | undefined }))
  for (const [entities, slug, filter] of [[jobs, '/vagas', publicJob], [companies, '/empresas', publicCompany]] as const) {
    for (const entity of entities.filter(filter)) {
      try { slug === '/vagas' ? canonicalJobId(entity.id) : canonicalCompanyId(entity.id) } catch { throw new Error('Invalid sitemap entity ID') }
      if (slug === '/empresas') assertPublicRegionalCompany(entity, site, String(entity.id))
      const date = entity.updated_at || entity.created_at
      if (date && Number.isNaN(new Date(date).getTime())) throw new Error('Invalid sitemap lastmod')
      const url = slug === '/vagas' ? `${requireCanonicalOrigin(site)}${publicJobPath(entity, site)}` : `${requireCanonicalOrigin(site)}${publicCompanyPath(entity, site)}`
      urls.push({ url, date: date ? new Date(date).toISOString() : undefined })
    }
  }
  const unique = [...new Map(urls.map(entry => [entry.url, entry])).values()]
  if (unique.length > 50000) throw new Error('Regional sitemap needs partitioning before release')
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${unique.map(({ url, date }) => `<url><loc>${xmlEscape(url)}</loc>${date ? `<lastmod>${xmlEscape(date)}</lastmod>` : ''}</url>`).join('')}</urlset>`
}
