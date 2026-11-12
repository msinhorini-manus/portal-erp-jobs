/** Pure shared public company URL contract. Persisted country-unique slugs are
 * authoritative; numeric IDs remain internal identity, never public URL segments.
 * Construction is not authorization: public callers must validate the live DTO.
 */
export function companyCollection(locale) {
  const language = typeof locale === 'string' ? locale.split('-')[0].toLowerCase() : ''
  const collection = { pt: 'empresas', es: 'empresas', en: 'companies' }[language]
  if (!collection) throw new Error('Unsupported company collection locale')
  return collection
}
export function canonicalCompanyId(value) {
  const text = String(value ?? '')
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(Number(text))) throw new Error('Invalid internal company ID')
  return text
}
export const RESERVED_COMPANY_SLUGS = Object.freeze([
  'admin', 'api', 'by-slug', 'search', 'new', 'edit', 'delete', 'create',
  'login', 'logout', 'register', 'registration', 'auth', 'account', 'me',
  'profile', 'settings', 'dashboard', 'empresas', 'companies', 'jobs', 'vagas',
  'static', 'assets', 'uploads', 'favicon', 'robots', 'sitemap', 'feed',
  'empresa-confidencial',
])
export function validPublicCompanySlug(value) {
  return typeof value === 'string' && value.length <= 140 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
    && /[a-z]/.test(value) && !RESERVED_COMPANY_SLUGS.includes(value)
}
export function publicCompanyRelativePath(company, locale) {
  const slug = company?.public_profile_slug
  if (!validPublicCompanySlug(slug)) throw new Error('Invalid public company slug snapshot')
  return `/${companyCollection(locale)}/${slug}`
}
export function publicCompanyPath(company, site) {
  if (!site || !/^\/[a-z]{2}$/.test(site.url_prefix) || site.is_active === false) throw new Error('Invalid public company site')
  return `${site.url_prefix}${publicCompanyRelativePath(company, site.locale)}`
}
export function assertPublicRegionalCompany(company, site, id) {
  if (!company || !site?.is_active || company.is_active === false || company.status !== 'approved' ||
      canonicalCompanyId(company.id) !== canonicalCompanyId(id) ||
      !Number.isSafeInteger(company.site_id) || company.site_id < 1 ||
      (site.id != null && company.site_id !== site.id) ||
      typeof site.code !== 'string' || company.site_code !== site.code) throw new Error('Public regional company unavailable')
  publicCompanyRelativePath(company, site.locale)
}
/** Job brand snapshots are not profile slugs. Hidden or missing identity means no link. */
export function publicJobCompany(job) {
  if (!job || job.is_company_hidden) return null
  const company = job.company && typeof job.company === 'object' ? job.company : {}
  const id = job.company_id ?? company.id
  const slug = Object.hasOwn(job, 'company_profile_slug') ? job.company_profile_slug : company.public_profile_slug
  try { canonicalCompanyId(id) } catch { return null }
  if (!validPublicCompanySlug(slug)) return null
  return { id, company_name: job.company_name || company.company_name || company.name, public_profile_slug: slug }
}
export function publicJobCompanyPath(job, site) {
  const company = publicJobCompany(job)
  return company ? publicCompanyPath(company, site) : null
}
