import { validatePrefix } from './regional-runtime.js'

function tokenSiteCode(storage) {
  if (storage?.getItem('userType') !== 'admin') return null
  try {
    const payload = storage.getItem('authToken')?.split('.')[1]
    if (!payload) return null
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    // Routing hint only; never used for authorization or sent as client site authority.
    return typeof claims.site_code === 'string' ? claims.site_code : null
  } catch { return null }
}

function sitePrefix(site, legacy) {
  if (!site?.is_active) throw new Error('Região inexistente ou inativa.')
  if (legacy) return '' // old domain keeps its direct /api contract until the edge cutover
  return validatePrefix(site.url_prefix)
}

export async function resolveRegionalContext({ location = globalThis.location, storage = globalThis.localStorage, fetch = globalThis.fetch, developmentMode = import.meta.env?.DEV === true } = {}) {
  const admin = /^\/admin(?:\/|$)/.test(location.pathname)
  const segment = location.pathname.split('/')[1]
  const explicit = /^[a-z]{2}$/.test(segment) ? `/${segment}` : ''
  const legacy = location.hostname === 'jobs.portalerp.com.br' && !explicit
  const development = developmentMode && /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !explicit
  const bootstrap = explicit || (legacy || development ? '' : '/br')
  const read = async (prefix, endpoint) => {
    const response = await fetch(`${prefix}/api/${endpoint}`, { credentials: 'same-origin', cache: 'no-store' })
    if (!response.ok) throw new Error('Não foi possível validar a região. Atualize a página ou tente novamente mais tarde.')
    return response.json()
  }
  let context = await read(bootstrap, 'context')
  let prefix = sitePrefix(context.site, legacy || development)
  if (explicit && prefix !== explicit) throw new Error('Região inexistente ou inativa.')
  if (!legacy && !development && !prefix) throw new Error('Configuração regional indisponível.')

  const claimCode = admin && location.pathname !== '/admin/login' && tokenSiteCode(storage)
  if (claimCode && claimCode !== context.site.code) {
    const catalog = await read(bootstrap, 'sites')
    const claimed = catalog.sites?.find(site => site.code === claimCode && site.is_active)
    if (!claimed) throw new Error('A região da sessão administrativa não está disponível. Entre novamente com uma sessão autorizada.')
    prefix = sitePrefix(claimed, legacy || development)
    if (legacy || development) throw new Error('A sessão não corresponde à região deste domínio. Entre novamente.')
    context = await read(prefix, 'context')
    if (context.site.code !== claimCode || sitePrefix(context.site, false) !== prefix) throw new Error('Contexto regional inconsistente.')
  }
  return { prefix, basename: admin || !explicit ? '' : prefix, site: context.site, admin }
}
