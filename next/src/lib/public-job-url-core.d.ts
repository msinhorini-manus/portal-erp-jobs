export type PublicJobUrlData = {
  id: number | string
  title?: string | null
  name?: string | null
  company_name?: string | null
  company?: { name?: string | null; company_name?: string | null } | null
  public_company_slug?: string | null
  public_title_slug?: string | null
  is_company_hidden?: boolean
}
export type PublicJobUrlSite = { url_prefix: string; locale: string; is_active?: boolean }
export function jobCollection(locale: string): 'vagas' | 'vacantes' | 'jobs'
export function canonicalJobId(value: unknown): string
export function validPublicJobSlug(value: unknown): boolean
export function fallbackJobSlug(value: unknown, fallback: string): string
export function publicJobRelativePath(job: PublicJobUrlData, locale: string): string
export function publicJobPath(job: PublicJobUrlData, site: PublicJobUrlSite): string
