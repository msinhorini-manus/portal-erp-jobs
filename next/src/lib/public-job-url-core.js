/** Pure shared contract for the SPA and Next. Backend snapshots are authoritative.
 * Fallbacks are transitional ONLY for null/missing snapshots; never for corrupt DTOs.
 * This is URL construction, not authorization: callers must resolve a live regional
 * context and validate public visibility before rendering or redirecting.
 */
export function jobCollection(locale) {
  const language = typeof locale === 'string' ? locale.split('-')[0].toLowerCase() : ''
  const collection = { pt: 'vagas', es: 'vacantes', en: 'jobs' }[language]
  if (!collection) throw new Error('Unsupported job collection locale')
  return collection
}
export function canonicalJobId(value) {
  const text = String(value ?? '')
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(Number(text)) || Number(text) < 1) throw new Error('Invalid public job ID')
  return String(Number(text))
}
export function validPublicJobSlug(value) {
  return typeof value === 'string' && value.length <= 140 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}
export function fallbackJobSlug(value, fallback) {
  const slug = String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 140).replace(/-+$/g, '')
  return slug || fallback
}
function snapshotSlug(value, fallback) {
  if (value == null) return fallback()
  if (!validPublicJobSlug(value)) throw new Error('Invalid public job slug snapshot')
  return value
}
export function publicJobRelativePath(job, locale) {
  const id = canonicalJobId(job.id)
  // Confidentiality takes precedence even over an accidentally unsanitized DTO.
  const company = job.is_company_hidden ? 'empresa-confidencial' : snapshotSlug(job.public_company_slug,
    () => fallbackJobSlug(job.company_name ?? job.company?.company_name ?? job.company?.name, 'empresa'))
  const title = snapshotSlug(job.public_title_slug, () => fallbackJobSlug(job.title ?? job.name, 'vaga'))
  return `/${jobCollection(locale)}/${company}/${title}/${id}`
}
export function publicJobPath(job, site) {
  if (!site || !/^\/[a-z]{2}$/.test(site.url_prefix) || site.is_active === false) throw new Error('Invalid public job site')
  return `${site.url_prefix}${publicJobRelativePath(job, site.locale)}`
}
