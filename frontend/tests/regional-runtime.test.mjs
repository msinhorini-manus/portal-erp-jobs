import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { appApiUrl, appFetch, configuredApiBase, getRegionalRuntime, readCandidateCsrf, regionalHref, setRegionalRuntime, validatePrefix } from '../src/lib/regional-runtime.js'
import { resolveRegionalContext } from '../src/lib/regional-context.js'

const origin = 'https://jobs.portalerp.com'
const location = (pathname = '/admin', hostname = 'jobs.portalerp.com') => ({ origin, hostname, pathname })
const site = (code = 'BR', active = true) => ({ code, country_code: code, is_active: active, url_prefix: `/${code.toLowerCase()}`, locale: 'pt-BR' })
const storage = (type = 'admin', code = 'BR') => {
  const state = new Map([['userType', type], ['authToken', `stub.${Buffer.from(JSON.stringify({ site_code: code })).toString('base64url')}.stub`], ['refreshToken', 'stub-refresh'], ['userId', '1'], ['adminData', '{}'], ['candidateData', '{}'], ['companyData', '{}'], ['unrelated', 'keep']])
  return { getItem: key => state.get(key) || null, removeItem: key => state.delete(key), state }
}
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  globalThis.location = location()
  setRegionalRuntime({ prefix: '/br', basename: '', site: site(), admin: true })
})

test('direct APIs/BFF are regional, query/body/headers are unchanged', async () => {
  assert.equal(appApiUrl('/api/admin/jobs?status=pending'), '/br/api/admin/jobs?status=pending')
  assert.equal(appApiUrl('/bff/candidate/resume'), '/br/bff/candidate/resume')
  assert.equal(appApiUrl(`${origin}/api/admin/tags`), `${origin}/br/api/admin/tags`)
  const options = { method: 'POST', headers: { Authorization: 'Bearer stub' }, body: '{"reason":"test"}' }
  let captured
  const response = await appFetch('/api/admin/companies/1/approve', options, { fetch: async (...args) => { captured = args; return reply({}) } })
  assert.equal(response.status, 200)
  assert.deepEqual(captured, ['/br/api/admin/companies/1/approve', options])
  assert.equal('X-Regional-Prefix' in options.headers, false)
  assert.equal(options.body.includes('site_id'), false)
})

test('already regional URLs, external URLs, assets and non-API paths remain untouched', () => {
  for (const path of ['/br/api/admin/jobs', '/zz/api/jobs', '/uploads/photo.png', '/assets/index.js', '/_next/image', '/admin', '/apiculture', '#section', 'mailto:jobs@example.test', '//external.test/api/jobs', 'https://external.test/api/admin/jobs', `${origin}/br/api/jobs`]) {
    assert.equal(appApiUrl(path), path)
  }
  const request = new Request(`${origin}/api/jobs`)
  assert.equal(appApiUrl(request), request)
})

test('legacy API mode stays unprefixed; configured API override accepts origin or base', () => {
  assert.equal(appApiUrl('/api/jobs', { prefix: '' }), '/api/jobs')
  assert.equal(configuredApiBase(), '/api')
  assert.equal(configuredApiBase('https://internal.example.test'), 'https://internal.example.test/api')
  assert.equal(configuredApiBase('/br/api/'), '/br/api')
})

test('regional links leave Admin, uploads, external URLs and anchors intact', () => {
  assert.equal(regionalHref('/candidato/login'), '/br/candidato/login')
  assert.equal(regionalHref('/br/candidato/curriculo'), '/br/candidato/curriculo')
  assert.equal(regionalHref('/'), '/br')
  for (const value of ['/admin/login', '/uploads/cv.pdf', '/assets/logo.svg', '/favicon.png', 'https://external.test', '#anchor']) assert.equal(regionalHref(value), value)
})

test('prefix validator accepts syntax, not a baked country whitelist', () => {
  assert.equal(validatePrefix('/zz'), '/zz')
  assert.equal(validatePrefix(''), '')
  for (const value of ['/BR', '/br/../admin', '//br', '/br/', '/br?x=1', '/api', undefined]) assert.throws(() => validatePrefix(value))
})

test('401 clears only Admin storage and explicitly signals login; candidate/company data survive', async () => {
  const store = storage()
  let events = 0
  await appFetch('/api/admin/companies', {}, { storage: store, fetch: async () => reply({}, 401), onAdminExpired: () => events++ })
  for (const key of ['authToken', 'refreshToken', 'userType', 'userId', 'adminData']) assert.equal(store.getItem(key), null)
  for (const key of ['candidateData', 'companyData', 'unrelated']) assert.notEqual(store.getItem(key), null)
  assert.equal(events, 1)
})

test('parallel Admin 401 responses notify session expiration only once', async () => {
  const store = storage()
  let events = 0
  const dependencies = { storage: store, fetch: async () => reply({}, 401), onAdminExpired: () => events++ }
  await Promise.all([appFetch('/api/admin/companies', {}, dependencies), appFetch('/api/admin/access-capabilities', {}, dependencies)])
  assert.equal(events, 1)
  assert.equal(store.getItem('authToken'), null)
})

test('403, 500, login/recovery 401 and external 401 never clear auth', async () => {
  for (const [url, status] of [['/api/admin/access-users', 403], ['/api/admin/jobs', 500], ['/api/auth/login/admin', 401], ['/api/auth/reset-password', 401], ['https://external.test/api/admin/jobs', 401], ['/bff/candidate/resume', 401]]) {
    const store = storage()
    let events = 0
    await appFetch(url, {}, { storage: store, fetch: async () => reply({}, status), onAdminExpired: () => events++ })
    assert.notEqual(store.getItem('authToken'), null)
    assert.equal(events, 0)
  }
})

test('candidate/company sessions are not cleared by Admin 401', async () => {
  for (const type of ['company', 'candidate']) {
    const store = storage(type)
    await appFetch('/api/admin/jobs', {}, { storage: store, fetch: async () => reply({}, 401), onAdminExpired: () => {} })
    assert.equal(store.getItem('userType'), type)
    assert.notEqual(store.getItem('authToken'), null)
  }
})

test('AbortError identity and canceled responses remain untouched', async () => {
  const store = storage()
  const error = new DOMException('canceled', 'AbortError')
  let events = 0
  await assert.rejects(appFetch('/api/admin/jobs', {}, { storage: store, fetch: async () => { throw error }, onAdminExpired: () => events++ }), thrown => thrown === error)
  const controller = new AbortController()
  controller.abort()
  await appFetch('/api/admin/jobs', { signal: controller.signal }, { storage: store, fetch: async () => reply({}, 401), onAdminExpired: () => events++ })
  assert.equal(events, 0)
  assert.notEqual(store.getItem('authToken'), null)
})

test('CSRF bridge reads existing Next cookie and an optional region-specific name', () => {
  assert.equal(readCandidateCsrf('other=x; pej_csrf=test%2Bcsrf'), 'test+csrf')
  assert.equal(readCandidateCsrf('pej_br_csrf=regional; pej_csrf=old'), 'regional')
  setRegionalRuntime({ ...getRegionalRuntime(), site: { ...site(), csrf_cookie_name: 'custom_csrf' } })
  assert.equal(readCandidateCsrf('custom_csrf=context; pej_csrf=old'), 'context')
})

test('Admin root bootstraps active BR; regional curriculum has basename /br', async () => {
  const calls = []
  const fetch = async url => { calls.push(url); return reply({ site: site(), locale: 'pt-BR' }) }
  assert.deepEqual(await resolveRegionalContext({ location: location('/admin'), storage: storage(), fetch }), { prefix: '/br', basename: '', site: site(), admin: true })
  assert.equal((await resolveRegionalContext({ location: location('/br/candidato/curriculo'), storage: storage('candidate'), fetch })).basename, '/br')
  assert.deepEqual(calls, ['/br/api/context', '/br/api/context'])
})

test('old .com.br and local development preserve unprefixed /api/context', async () => {
  for (const hostname of ['jobs.portalerp.com.br', 'localhost']) {
    const calls = []
    const result = await resolveRegionalContext({ location: location('/admin', hostname), developmentMode: hostname === 'localhost', storage: storage(), fetch: async url => { calls.push(url); return reply({ site: { ...site(), url_prefix: '' }, locale: 'pt-BR' }) } })
    assert.equal(result.prefix, '')
    assert.deepEqual(calls, ['/api/context'])
  }
})

test('production-built SPA on loopback uses the same regional bootstrap as production', async () => {
  const calls = []
  const result = await resolveRegionalContext({ location: location('/admin/login', 'localhost'), developmentMode: false, storage: storage(), fetch: async url => { calls.push(url); return reply({ site: site(), locale: 'pt-BR' }) } })
  assert.equal(result.prefix, '/br')
  assert.equal(result.basename, '')
  assert.deepEqual(calls, ['/br/api/context'])
})

test('future Admin site claims resolve via active catalog + context, not body site_id', async () => {
  const calls = []
  const result = await resolveRegionalContext({ location: location('/admin'), storage: storage('admin', 'ZZ'), fetch: async url => {
    calls.push(url)
    return reply(url.endsWith('/sites') ? { sites: [site(), site('ZZ')] } : { site: site(url.startsWith('/zz') ? 'ZZ' : 'BR'), locale: 'pt-BR' })
  } })
  assert.equal(result.prefix, '/zz')
  assert.equal(result.basename, '')
  assert.deepEqual(calls, ['/br/api/context', '/br/api/sites', '/zz/api/context'])
})

test('invalid/inactive/unknown context fails closed without silently falling back', async () => {
  for (const current of [site('ZZ', false), site('BR'), { ...site('ZZ'), url_prefix: '/admin' }]) {
    await assert.rejects(resolveRegionalContext({ location: location('/zz/candidato/curriculo'), storage: storage('candidate'), fetch: async () => reply({ site: current, locale: 'pt-BR' }) }))
  }
  const calls = []
  await assert.rejects(resolveRegionalContext({ location: location('/zz/candidato/curriculo'), fetch: async url => { calls.push(url); return reply({}, 404) } }))
  assert.deepEqual(calls, ['/zz/api/context'])
  await assert.rejects(resolveRegionalContext({ location: location(), storage: storage('admin', 'ZZ'), fetch: async url => reply(url.endsWith('/sites') ? { sites: [site()] } : { site: site() }) }))
})

test('explicit Admin login can recover from old/inactive claims', async () => {
  const result = await resolveRegionalContext({ location: location('/admin/login'), storage: storage('admin', 'ZZ'), fetch: async () => reply({ site: site(), locale: 'pt-BR' }) })
  assert.equal(result.prefix, '/br')
})

test('integration sources preserve approval, recovery, BFF bridge and explicit expiry message', async () => {
  const read = path => readFile(new URL(`../src/${path}`, import.meta.url), 'utf8')
  const app = await read('App.jsx')
  assert.match(app, /basename=\{regional.basename/)
  const approval = await read('pages/admin/AdminCompaniesContent.jsx')
  assert.match(approval, /can_approve_companies/)
  assert.match(approval, /Aprovação administrativa obrigatória/)
  assert.match(approval, /kind === 'suspend' \? 'toggle-active' : kind/)
  const access = await read('pages/admin/AdminAccessContent.jsx')
  assert.match(access, /admin_password: adminPassword/)
  assert.match(access, /kind === 'password-reset'/)
  assert.match(access, /recovery.reset_url/)
  const auth = await read('contexts/AuthContext.jsx')
  assert.match(auth, /\/admin\/login\?reason=session-expired/)
  assert.match(auth, /regionalHref\('\/candidato\/login'\)/)
  assert.match(auth, /appFetch\('\/bff\/auth\/logout'/)
  const api = await read('services/api.js')
  assert.match(api, /appFetch\(`\/bff\/candidate/)
  assert.doesNotMatch(api, /console\.error/)
})
