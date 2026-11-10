// Local-only smoke fixture. No database, production URLs or real credentials.
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const dist = fileURLToPath(new URL('../dist/', import.meta.url))
let adminStatus = 200
const site = { code: 'BR', country_code: 'BR', is_active: true, url_prefix: '/br', locale: 'pt-BR' }
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  res.setHeader('Cache-Control', 'no-store')
  const json = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
  if (url.pathname === '/__fixture/status') { adminStatus = Number(url.searchParams.get('status') || 200); return json({ status: adminStatus }) }
  if (url.pathname.endsWith('/api/context')) return json({ site, locale: 'pt-BR' })
  if (url.pathname.endsWith('/api/sites')) return json({ sites: [site] })
  if (url.pathname === '/br/bff/auth/me') return json({ email: 'fixture@example.test', user_type: 'candidate', first_name: 'Fixture' })
  if (url.pathname === '/br/bff/auth/logout') return json({ message: 'Sessão encerrada.' })
  if (url.pathname === '/br/bff/candidate/resume') return json({ candidate: { first_name: 'Fixture', last_name: 'Local' }, experiences: [], educations: [], skills: [], certifications: [], projects: [], languages: [] })
  if (url.pathname === '/br/bff/candidate/privacy') return json({ curriculo_publico: false })
  if (/^\/br\/api\/(admin|config)(\/|$)/.test(url.pathname)) {
    if (adminStatus !== 200) return json({ error: 'Fixture access denied' }, adminStatus)
    if (url.pathname.endsWith('/access-capabilities')) return json({ is_platform_admin: true, can_approve_companies: true })
    if (url.pathname.endsWith('/companies')) return json({ companies: [{ id: 1, name: 'Empresa Fixture', email: 'fixture@example.test', site_status: 'pending', global_active: true }], total: 1, pages: 1 })
    if (url.pathname.endsWith('/access-users')) return json({ users: [], total: 0, pages: 1 })
    if (url.pathname.includes('/config/')) return json([])
    return json({ total_jobs: 1, total_companies: 1, total_candidates: 1, active_jobs: 1 })
  }
  if (/\/(api|bff)(\/|$)/.test(url.pathname)) return json({ error: 'Unmocked fixture endpoint' }, 404)
  try {
    const file = url.pathname.startsWith('/assets/') ? path.join(dist, url.pathname) : path.join(dist, 'index.html')
    if (!file.startsWith(dist)) return json({}, 404)
    const content = await readFile(file)
    const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html'
    res.writeHead(200, { 'Content-Type': type }); res.end(content)
  } catch { json({}, 404) }
})
server.listen(4181, '0.0.0.0', () => console.log('Local SPA fixture ready on 4181; expires in 10 minutes.'))
const timer = setTimeout(() => server.close(() => console.log('Fixture stopped.')), 10 * 60 * 1000)
process.on('SIGTERM', () => { clearTimeout(timer); server.close() })
