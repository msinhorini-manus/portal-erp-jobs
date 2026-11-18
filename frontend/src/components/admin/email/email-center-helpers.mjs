export const EMAIL_TEMPLATE_KEY = 'application.created.company'
export const EMAIL_EVENT = 'application.created'
export const EMAIL_AUDIENCE = 'company'

export const EMAIL_LOCALES = [
  { value: 'pt-BR', label: 'Português', shortLabel: 'PT-BR' },
  { value: 'en', label: 'English', shortLabel: 'EN' },
  { value: 'es', label: 'Español', shortLabel: 'ES' },
]

export const ALLOWED_VARIABLES = [
  { key: 'responsavel_nome', label: 'Responsável', description: 'Nome fictício do responsável empresarial', example: 'Marina Souza' },
  { key: 'empresa_nome', label: 'Empresa', description: 'Empresa fictícia associada ao aviso', example: 'Acme Tecnologia' },
  { key: 'vaga_titulo', label: 'Vaga', description: 'Título fictício da vaga', example: 'Analista de ERP' },
  { key: 'data_candidatura', label: 'Data', description: 'Data fictícia da candidatura', example: '18/11/2026' },
  { key: 'painel_url', label: 'Link do painel', description: 'URL interna fictícia para o painel regional', example: 'https://jobs.portalerp.com.br/empresa/candidaturas' },
]

export const EDITOR_FIELDS = ['name', 'subject', 'html', 'text']

export const STATUS_LABELS = {
  draft: 'Rascunho',
  published: 'Publicado',
  inactive: 'Inativo',
  published_with_draft: 'Publicado com rascunho',
}

export const STATUS_TONES = {
  draft: 'border-amber-200 bg-amber-50 text-amber-900',
  published: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  inactive: 'border-slate-200 bg-slate-100 text-slate-700',
  published_with_draft: 'border-blue-200 bg-blue-50 text-blue-900',
}

export function localeLabel(locale) {
  return EMAIL_LOCALES.find(item => item.value === locale)?.label || locale || 'Idioma não informado'
}

export function localeShortLabel(locale) {
  return EMAIL_LOCALES.find(item => item.value === locale)?.shortLabel || locale || '—'
}

export function templateContent(template) {
  const source = template?.draft || template?.published || {}
  return EDITOR_FIELDS.reduce((content, field) => {
    content[field] = typeof source[field] === 'string' ? source[field] : ''
    return content
  }, {})
}

export function draftFromTemplate(template) {
  return templateContent(template)
}

export function serializeEditorContent(content) {
  return JSON.stringify(EDITOR_FIELDS.map(field => [field, typeof content?.[field] === 'string' ? content[field] : '']))
}

export function previewSnapshotMatches({ requestId, latestRequestId, locale, currentLocale, snapshot, currentContent }) {
  return requestId === latestRequestId && locale === currentLocale && snapshot === serializeEditorContent(currentContent)
}

export function getEmptyEditorFields(content) {
  return EDITOR_FIELDS.filter(field => !String(content?.[field] || '').trim())
}

export function canPublishDraft({ template, draft, capabilities, saving = false, mutating = false }) {
  return Boolean(
    capabilities?.publish &&
      template?.draft &&
      Number(template.revision) > 0 &&
      !saving &&
      !mutating &&
      !hasContentChanges(templateContent(template), draft),
  )
}

export function logicalRouteFromHref(href, basename = '') {
  const url = new URL(href, 'http://localhost')
  const normalizedBasename = String(basename || '').replace(/\/$/, '')
  const pathname = normalizedBasename && (url.pathname === normalizedBasename || url.pathname.startsWith(`${normalizedBasename}/`))
    ? url.pathname.slice(normalizedBasename.length) || '/'
    : url.pathname
  return `${pathname}${url.search}${url.hash}`
}

export function isAuthorizedTemplate(template) {
  return Boolean(
    template &&
      template.key === EMAIL_TEMPLATE_KEY &&
      template.event === EMAIL_EVENT &&
      template.audience === EMAIL_AUDIENCE &&
      EMAIL_LOCALES.some(locale => locale.value === template.locale),
  )
}

export function filterTemplates(templates, filters = {}) {
  const search = String(filters.search || '').trim().toLocaleLowerCase()
  return (templates || []).filter(template => {
    if (!isAuthorizedTemplate(template)) return false
    if (filters.locale && filters.locale !== 'all' && template.locale !== filters.locale) return false
    if (filters.status && filters.status !== 'all' && template.status !== filters.status) return false
    if (filters.audience && filters.audience !== 'all' && template.audience !== filters.audience) return false
    if (filters.country && filters.country !== 'all') {
      const country = template.country_code ? String(template.country_code).toLowerCase() : 'base'
      if (country !== filters.country) return false
    }
    if (!search) return true
    const haystack = [
      template.name,
      template.key,
      template.event,
      template.locale,
      template.country_code,
      template.author,
    ].filter(Boolean).join(' ').toLocaleLowerCase()
    return haystack.includes(search)
  }).sort((left, right) => {
    const leftTime = Date.parse(left.updated_at || '') || 0
    const rightTime = Date.parse(right.updated_at || '') || 0
    return rightTime - leftTime
  })
}

export function contentDiff(previous, next) {
  return EDITOR_FIELDS.reduce((diff, field) => {
    const before = previous?.[field] || ''
    const after = next?.[field] || ''
    diff[field] = { changed: before !== after, before, after }
    return diff
  }, {})
}

export function hasContentChanges(previous, next) {
  return EDITOR_FIELDS.some(field => (previous?.[field] || '') !== (next?.[field] || ''))
}

export function formatDate(value, locale = 'pt-BR') {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export function buildPreviewSrcDoc(html) {
  const safeMarkup = String(html || '')
    .replace(/<\/?script\b[^>]*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/<\/?(form|iframe|object|embed|base|meta)\b[^>]*>/gi, '')
    .replace(/\s+(src|srcset)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';"><style>body{font-family:Arial,sans-serif;color:#1f2937;background:#fff;line-height:1.5;margin:24px}a{color:#1f5b70}table{max-width:100%}</style></head><body>${safeMarkup}</body></html>`
}

export function compareFields(previous, next) {
  return EDITOR_FIELDS.filter(field => (previous?.[field] || '') !== (next?.[field] || ''))
}

export function errorFields(payload) {
  return payload && typeof payload.fields === 'object' && payload.fields !== null ? payload.fields : {}
}

export function normalizeCapabilities(payload) {
  const source = payload?.capabilities || {}
  return {
    view: Boolean(source.view ?? source['email.view']),
    edit: Boolean(source.edit ?? source['email.edit']),
    publish: Boolean(source.publish ?? source['email.publish']),
    rules: Boolean(source.rules ?? source['email.rules']),
    history: Boolean(source.history ?? source['email.history']),
    test: false,
  }
}
