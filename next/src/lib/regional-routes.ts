import type { RegionalSite } from './site'
import { publicJobPath } from './public-job-url-core.js'
import { publicCompanyPath } from './public-company-url-core.js'

// Only homologated Portuguese slugs ship in wave 1. Future locales must add a
// validated registry/route mapping, not duplicated country page trees.
export const ROUTES = {
  'home': '/', 'jobs.index': '/vagas', 'jobs.detail': '/vagas/:companySlug/:titleSlug/:id',
  'companies.index': '/empresas', 'companies.detail': '/empresas/:companySlug/:id',
  'areas': '/areas', 'technologies': '/tecnologias', 'salaries': '/salarios',
  'content': '/conteudo', 'about': '/sobre', 'contact': '/contato',
  'terms': '/termos', 'privacy': '/privacidade',
  'candidate.login': '/candidato/login', 'candidate.register': '/candidato/cadastro',
  'candidate.dashboard': '/candidato/dashboard', 'candidate.resume': '/candidato/curriculo',
  'company.login': '/empresa/login', 'company.register': '/empresa/cadastro',
  'company.dashboard': '/empresa/dashboard', 'company.invitation': '/empresa/convite/:token',
  'password.forgot': '/recuperar-senha', 'password.reset': '/redefinir-senha',
} as const
export type RouteKey = keyof typeof ROUTES
export function countryPrefix(country: string): string {
  if (!/^[a-z]{2}$/.test(country)) throw new Error('Invalid regional country segment')
  return `/${country}`
}
export function prefixFromPath(pathname: string): string {
  return countryPrefix(pathname.split('/')[1] || '')
}
export function defaultCountry(): string {
  const country = process.env.NEXT_DEFAULT_COUNTRY || 'br'
  countryPrefix(country)
  return country
}
const GLOBAL_PATH = /^\/(?:_next|assets|uploads|brand|admin)(?:\/|$)|^\/(?:og-image\.(?:png|svg)|icon\.png|favicon\.ico|robots\.txt|sitemap\.xml)(?:[?#]|$)/
export function regionalizePath(prefix: string, path: string): string {
  countryPrefix(prefix.slice(1))
  if (!path.startsWith('/') || path.startsWith('//') || GLOBAL_PATH.test(path)) return path
  if (path.includes('\\') || /[\u0000-\u001f]/.test(path)) throw new Error('Unsafe regional path')
  if (path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`) || path.startsWith(`${prefix}#`)) return path
  // Never silently move another explicit region into the current one.
  if (/^\/[a-z]{2}(?:\/|[?#]|$)/.test(path)) throw new Error('Cross-region path requires an explicit site switch')
  return `${prefix}${path === '/' ? '' : path}`
}
export function regionalHref(site: Pick<RegionalSite, 'url_prefix' | 'locale'>, key: RouteKey, params: Record<string, string | number> = {}): string {
  if (key === 'jobs.detail') return publicJobPath({ id: params.id, public_company_slug: String(params.companySlug ?? 'empresa'), public_title_slug: String(params.titleSlug ?? 'vaga') }, site)
  if (key === 'companies.detail') {
    if (params.companySlug == null) throw new Error('Missing route parameter companySlug')
    return publicCompanyPath({ id: params.id, public_profile_slug: String(params.companySlug) }, site)
  }
  if (site.locale !== 'pt-BR') throw new Error('Localized routes are not homologated for this locale')
  const slug = ROUTES[key].replace(/:([a-z]+)/g, (_match, name: string) => {
    if (params[name] === undefined) throw new Error(`Missing route parameter ${name}`)
    return encodeURIComponent(String(params[name]))
  })
  return regionalizePath(site.url_prefix, slug)
}
export function safeRegionalReturn(value: string | null, prefix: string, fallback: string, companyOnly = false): string {
  const safeFallback = regionalizePath(prefix, fallback)
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return safeFallback
  try {
    // URL normalization closes encoded traversal/open redirect variants.
    const decoded = decodeURIComponent(value)
    if (decoded.includes('\\') || decoded.startsWith('//') || /[\u0000-\u001f]/.test(decoded)) return safeFallback
    const target = regionalizePath(prefix, value)
    const url = new URL(target, 'https://regional.invalid')
    if (url.origin !== 'https://regional.invalid' || !url.pathname.startsWith(`${prefix}/`)) return safeFallback
    if (companyOnly && !url.pathname.startsWith(`${prefix}/empresa/`)) return safeFallback
    if (/\/(?:bff|api)(?:\/|$)/.test(url.pathname)) return safeFallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch { return safeFallback }
}
export function browserPrefix(): string {
  if (typeof window === 'undefined') throw new Error('Regional browser context is unavailable')
  return prefixFromPath(window.location.pathname)
}
export function browserRegionalPath(path: string): string {
  return regionalizePath(browserPrefix(), path)
}
