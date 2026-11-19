// LOCAL TEST HARNESS ONLY. Serves the real Vite build/App/AdminLayout with synthetic API fixtures.
// Run: node tests/import-preview-harness.mjs (default port 4187; stops after 20 minutes).
// GET /__fixture/control?capabilityStatus=403 or ?previewStatus=422&delay=1000 etc.
// GET /__fixture/state provides counts (never bodies or credentials).
// Initial page query supports ?fixtureActor=agent or ?fixtureCapabilityStatus=403.
import http from 'node:http'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { capabilitiesFixture, previewFixture } from './import-preview.fixtures.mjs'

const dist = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)))
const port = Number(process.env.PORT || 4187)
const state = { capabilityStatus: 200, previewStatus: 200, delay: 0, actor: 'platform_admin', previewEnabled: true, invalidDto: false, capabilityCalls: 0, previewCalls: 0, otherWrites: 0 }
const site = { code: 'BR', country_code: 'BR', is_active: true, url_prefix: '/br', locale: 'pt-BR' }
const token = `synthetic.${Buffer.from(JSON.stringify({ site_code: 'BR' })).toString('base64url')}.not-a-real-signature`
const allowedStatus = new Set([200, 400, 401, 403, 404, 413, 422, 429, 500])
function applySettings(params) {
  for (const key of ['capabilityStatus', 'previewStatus']) if (params.has(key) && allowedStatus.has(Number(params.get(key)))) state[key] = Number(params.get(key))
  if (params.has('delay')) state.delay = Math.max(0, Math.min(30000, Number(params.get('delay')) || 0))
  if (['platform_admin', 'agent'].includes(params.get('actor'))) state.actor = params.get('actor')
  if (params.has('previewEnabled')) state.previewEnabled = params.get('previewEnabled') === 'true'
  if (params.has('invalidDto')) state.invalidDto = params.get('invalidDto') === 'true'
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`)
  res.setHeader('Cache-Control', 'no-store')
  const json = (data, status = 200) => { if (res.destroyed) return; res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
  if (req.method === 'GET' && url.pathname === '/__fixture/control') { applySettings(url.searchParams); return json(state) }
  if (req.method === 'GET' && url.pathname === '/__fixture/state') return json(state)
  if (req.method === 'GET' && /^\/(br\/)?api\/context$/.test(url.pathname)) return json({ site, locale: 'pt-BR' })
  if (req.method === 'GET' && /^\/(br\/)?api\/sites$/.test(url.pathname)) return json({ sites: [site] })
  if (req.method === 'GET' && url.pathname === '/br/api/admin/access-capabilities') {
    if (state.capabilityStatus !== 200) return json({ error: 'Synthetic access denied', code: 'fixture_denied' }, state.capabilityStatus)
    return json({ is_platform_admin: state.actor === 'platform_admin', can_approve_companies: state.actor === 'platform_admin' })
  }
  if (req.method === 'GET' && url.pathname === '/br/api/admin/importacoes/capabilities') {
    state.capabilityCalls++
    if (state.capabilityStatus !== 200) return json({ error: 'Synthetic access denied', code: 'fixture_denied' }, state.capabilityStatus)
    return json({ ...capabilitiesFixture, actor: state.actor, preview_enabled: state.previewEnabled })
  }
  if (req.method === 'POST' && url.pathname === '/br/api/admin/importacoes/preview') {
    state.previewCalls++
    const settings = { ...state }
    let size = 0
    try { for await (const chunk of req) { size += chunk.length; if (size > 53 * 1024 * 1024) return json({ error: 'Synthetic size error', code: 'fixture_size' }, 413) } } catch { return }
    // Intentionally no real parsing/persistence. This fixture tests UI only.
    if (settings.delay) await new Promise(resolve => setTimeout(resolve, settings.delay))
    if (settings.previewStatus !== 200) return json({ error: 'Synthetic document error', code: 'fixture_error' }, settings.previewStatus)
    const result = previewFixture()
    if (settings.invalidDto) result.execution_enabled = true
    return json(result)
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { state.otherWrites++; return json({ error: 'No other write endpoint exists in the synthetic harness', code: 'fixture_unmapped' }, 404) }
  if (/\/(api|bff)(\/|$)/.test(url.pathname)) return json({ error: 'Unmapped synthetic endpoint', code: 'fixture_unmapped' }, 404)
  try {
    const isAsset = /^\/(assets|brand)\//.test(url.pathname) || /\.(ico|png)$/.test(url.pathname)
    const file = isAsset ? path.resolve(dist, `.${decodeURIComponent(url.pathname)}`) : path.join(dist, 'index.html')
    if (!file.startsWith(`${dist}${path.sep}`)) return json({}, 404)
    let content = await readFile(file)
    if (file.endsWith('index.html')) {
      if (url.searchParams.has('fixtureActor')) applySettings(new URLSearchParams({ actor: url.searchParams.get('fixtureActor') }))
      if (url.searchParams.has('fixtureCapabilityStatus')) applySettings(new URLSearchParams({ capabilityStatus: url.searchParams.get('fixtureCapabilityStatus') }))
      const session = { authToken: token, userType: 'admin', userId: '1', adminData: JSON.stringify({ id: 1, email: 'synthetic-admin@example.test' }) }
      const bootstrap = `<script>/* Synthetic local harness session, not production authentication. */for(const [k,v] of Object.entries(${JSON.stringify(session)}))localStorage.setItem(k,v);</script>`
      content = content.toString().replace('<head>', `<head>${bootstrap}`)
    }
    const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.ttf': 'font/ttf', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(content)
  } catch { json({}, 404) }
})
server.listen(port, '0.0.0.0', () => console.log(`Synthetic importer harness: http://127.0.0.1:${port}/admin/importacoes; real App/AdminLayout; no production endpoints; expires in 20 minutes.`))
const timer = setTimeout(() => server.close(() => console.log('Synthetic importer harness stopped.')), 20 * 60 * 1000)
process.on('SIGTERM', () => { clearTimeout(timer); server.close() })
process.on('SIGINT', () => { clearTimeout(timer); server.close() })
