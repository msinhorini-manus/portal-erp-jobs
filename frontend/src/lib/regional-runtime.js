/** Browser routing hints only. Flask remains the authority for site and permissions. */
export const ADMIN_SESSION_EXPIRED = 'jobs:admin-session-expired'
export const ADMIN_EXPIRED_MESSAGE = 'Sua sessão administrativa expirou. Faça login novamente.'
let runtime = { prefix: '', basename: '', site: null, admin: false }
let adminExpiredNotified = false

export function validatePrefix(value) {
  if (value === '') return ''
  if (typeof value !== 'string' || !/^\/[a-z]{2}$/.test(value)) {
    throw new Error('Prefixo regional inválido.')
  }
  return value
}

export function setRegionalRuntime(context) {
  runtime = { ...context, prefix: validatePrefix(context.prefix), basename: validatePrefix(context.basename) }
  adminExpiredNotified = false
}

export function getRegionalRuntime() { return runtime }

/** Never rewrite external URLs, assets, already regional paths, or arbitrary endpoints. */
export function appApiUrl(input, { prefix = runtime.prefix, origin = globalThis.location?.origin } = {}) {
  validatePrefix(prefix)
  if (typeof input !== 'string') return input
  let pathname = input
  let absolute = false
  if (/^https?:\/\//i.test(input)) {
    const url = new URL(input)
    if (url.origin !== origin || url.username || url.password) return input
    pathname = `${url.pathname}${url.search}${url.hash}`
    absolute = true
  }
  if (!/^\/(api|bff)(\/|\?|#|$)/.test(pathname)) return input
  const scoped = `${prefix}${pathname}`
  return absolute ? `${origin}${scoped}` : scoped
}

export function regionalHref(path, context = runtime) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return path
  if (/^\/(admin|api|bff|assets|uploads|_next)(\/|\?|#|$)/.test(path) || /^\/[^/]+\.[^/]+/.test(path)) return path
  if (path === context.prefix || path.startsWith(`${context.prefix}/`) && context.prefix) return path
  return `${context.prefix}${path === '/' ? '' : path}` || '/'
}

/** Use with explicitly configured API overrides; default remains same-origin. */
export function configuredApiBase(value) {
  const base = (value || '/api').replace(/\/$/, '')
  return /\/api$/.test(base) ? base : `${base}/api`
}

export function clearAdminAuth(storage = globalThis.localStorage) {
  if (!storage) return false
  // Shared legacy keys belong to the current user type; never clear another session.
  if (storage.getItem('userType') !== 'admin') return false
  for (const key of ['authToken', 'refreshToken', 'userType', 'userId', 'adminData']) storage.removeItem(key)
  return true
}

function isAdminRequest(input, storage) {
  if (typeof input !== 'string') return false
  const url = new URL(input, globalThis.location?.origin || 'http://localhost')
  if (globalThis.location?.origin && url.origin !== globalThis.location.origin) return false
  const path = url.pathname.replace(/^\/[a-z]{2}(?=\/api(?:\/|$))/, '')
  if (!/^\/api(?:\/|$)/.test(path)) return false
  // Invalid credentials/recovery requests must show their own error, not expire a session.
  if (/^\/api\/auth\/(login(?:\/|$)|register(?:\/|$)|forgot-password$|reset-password$)/.test(path)) return false
  return /^\/api\/admin(?:\/|$)/.test(path) || storage?.getItem('userType') === 'admin'
}

/** Opt-in fetch for Jobs API/BFF consumers only, never a global fetch monkeypatch. */
export async function appFetch(input, options = {}, dependencies = {}) {
  const transport = dependencies.fetch || globalThis.fetch
  const storage = dependencies.storage || globalThis.localStorage
  const url = appApiUrl(input)
  // AbortError and all transport errors propagate unchanged. No logout on 403.
  const response = await transport(url, options)
  if (!options.signal?.aborted && response.status === 401 && isAdminRequest(url, storage)) {
    const cleared = clearAdminAuth(storage)
    if (!adminExpiredNotified && (cleared || runtime.admin && !globalThis.location?.pathname.endsWith('/admin/login'))) {
      // Parallel list/capability requests can fail together. Notify once so
      // multiple location.replace calls do not abort the login navigation.
      adminExpiredNotified = true
      const notify = dependencies.onAdminExpired || (() => {
        globalThis.window?.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED))
      })
      notify()
    }
  }
  return response
}

export function readCandidateCsrf(cookie = globalThis.document?.cookie || '') {
  // Cookie name can be supplied by the regional context; old Next bridge remains compatible.
  const code = runtime.site?.code?.toLowerCase()
  const names = [runtime.site?.csrf_cookie_name, code && `pej_${code}_csrf`, code && `pej_csrf_${code}`, 'pej_csrf'].filter(Boolean)
  for (const name of names) {
    const value = cookie.split('; ').find(part => part.startsWith(`${encodeURIComponent(name)}=`))?.split('=').slice(1).join('=')
    if (value) return decodeURIComponent(value)
  }
  return ''
}
