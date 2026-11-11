export type PublicCompanyUrlData = {
  id?: number | string
  company_name?: string | null
  trade_name?: string | null
  name?: string | null
  public_profile_slug?: string | null
  site_id?: number
  site_code?: string
  status?: string
  is_active?: boolean
}
export type PublicCompanyUrlSite = { id?: number; code?: string; url_prefix: string; locale: string; is_active?: boolean }
export type PublicJobCompanyData = {
  company_id?: number | string | null
  company_name?: string | null
  company_profile_slug?: string | null
  is_company_hidden?: boolean
  company?: Partial<PublicCompanyUrlData> | string | null
}
export function companyCollection(locale: string): 'empresas' | 'companies'
export function canonicalCompanyId(value: unknown): string
export function validPublicCompanySlug(value: unknown): boolean
export const RESERVED_COMPANY_SLUGS: readonly string[]
export function publicCompanyRelativePath(company: PublicCompanyUrlData, locale: string): string
export function publicCompanyPath(company: PublicCompanyUrlData, site: PublicCompanyUrlSite): string
export function assertPublicRegionalCompany(company: PublicCompanyUrlData, site: PublicCompanyUrlSite, id: string): void
export function publicJobCompany(job: PublicJobCompanyData): PublicCompanyUrlData | null
export function publicJobCompanyPath(job: PublicJobCompanyData, site: PublicCompanyUrlSite): string | null
