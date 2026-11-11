/** Pure shared company URL contract. Regional persisted snapshots are authoritative.
 * Missing snapshots alone permit deterministic transitional fallbacks. Construction
 * is not authorization: public detail callers must validate the live regional DTO.
 */
export function companyCollection(locale) {
  const language = typeof locale === 'string' ? locale.split('-')[0].toLowerCase() : ''
  const collection = { pt: 'empresas', es: 'empresas', en: 'companies' }[language]
  if (!collection) throw new Error('Unsupported company collection locale')
  return collection
}
export function canonicalCompanyId(value) {
  const text = String(value ?? '')
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(Number(text))) throw new Error('Invalid public company ID')
  return text
}
export function validPublicCompanySlug(value) {
  return typeof value === 'string' && value.length <= 140 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}
export function fallbackCompanySlug(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 140).replace(/-+$/g, '') || 'empresa'
}
export function publicCompanyRelativePath(company, locale) {
  const id = canonicalCompanyId(company.id)
  const slug = company.public_profile_slug == null
    ? fallbackCompanySlug(company.company_name || company.trade_name || company.name)
    : company.public_profile_slug
  if (!validPublicCompanySlug(slug)) throw new Error('Invalid public company slug snapshot')
  return `/${companyCollection(locale)}/${slug}/${id}`
}
export function publicCompanyPath(company, site) {
  if (!site || !/^\/[a-z]{2}$/.test(site.url_prefix) || site.is_active === false) throw new Error('Invalid public company site')
  return `${site.url_prefix}${publicCompanyRelativePath(company, site.locale)}`
}
export function assertPublicRegionalCompany(company, site, id) {
  if (!company || !site?.is_active || company.is_active === false || company.status !== 'approved' ||
      canonicalCompanyId(company.id) !== canonicalCompanyId(id) ||
      (site.id != null && company.site_id !== site.id) ||
      (company.site_code != null && company.site_code !== site.code) ||
      (site.id == null && company.site_code !== site.code)) throw new Error('Public regional company unavailable')
  publicCompanyRelativePath(company, site.locale)
}
/** Never use a job's public_company_slug: it is the job snapshot, not a profile slug.
 * Confidentiality overrides even an accidentally unsanitized nested DTO.
 */
export function publicJobCompany(job) {
  if (!job || job.is_company_hidden) return null
  const company = job.company && typeof job.company === 'object' ? job.company : {}
  const id = job.company_id ?? company.id
  if (id == null) return null
  return {
    id,
    company_name: job.company_name || company.company_name || company.name,
    public_profile_slug: job.company_profile_slug ?? company.public_profile_slug,
  }
}
export function publicJobCompanyPath(job, site) {
  const company = publicJobCompany(job)
  return company ? publicCompanyPath(company, site) : null
}
