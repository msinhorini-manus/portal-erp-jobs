import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { setRegionalRuntime } from '../src/lib/regional-runtime.js'
import { publicCompanyLink, publicJobCompanyLink } from '../src/lib/public-company-link.js'
import { canonicalCompanyId, publicCompanyPath, RESERVED_COMPANY_SLUGS } from '../src/lib/public-company-url.js'
const site = { id: 1, code: 'BR', is_active: true, locale: 'pt-BR', url_prefix: '/br' }
const company = { id: 4, company_name: 'Renamed', public_profile_slug: 'megasoft' }
beforeEach(() => setRegionalRuntime({ prefix: '/br', basename: '/br', site, admin: false }))
test('SPA basename and unbased shell share authoritative company URL core', () => {
  assert.equal(publicCompanyLink(company), '/empresas/megasoft')
  assert.equal(publicCompanyPath(company, site), '/br/empresas/megasoft')
  setRegionalRuntime({ prefix: '/br', basename: '', site, admin: false })
  assert.equal(publicCompanyLink(company), '/br/empresas/megasoft')
})
test('locale mapping prepares ES/EN but inactive context is unavailable', () => {
  for (const [country, locale, collection] of [['mx', 'es-MX', 'empresas'], ['us', 'en-US', 'companies']]) {
    setRegionalRuntime({ prefix: `/${country}`, basename: `/${country}`, site: { ...site, locale, url_prefix: `/${country}` }, admin: false })
    assert.equal(publicCompanyLink(company), `/${collection}/megasoft`)
  }
  setRegionalRuntime({ prefix: '/br', basename: '/br', site: { ...site, is_active: false }, admin: false })
  assert.throws(() => publicCompanyLink(company))
})
test('no name fallback and internal ID bounds fail closed', () => {
  for (const slug of [undefined, null, ...RESERVED_COMPANY_SLUGS, '123', '123-456']) assert.throws(() => publicCompanyLink({ id: 4, company_name: 'MegaSoft', public_profile_slug: slug }))
  assert.equal(publicCompanyLink({ public_profile_slug: 'megasoft' }), '/empresas/megasoft')
  assert.equal(canonicalCompanyId('9007199254740991'), '9007199254740991')
  for (const id of ['04', '0', '-1', '1e3', '9007199254740992', '../4']) assert.throws(() => canonicalCompanyId(id))
  for (const slug of ['', 'BAD', 'evil/slug', 'a%2Fb']) assert.throws(() => publicCompanyLink({ ...company, public_profile_slug: slug }))
})
test('visible employer links use profile snapshot; hidden DTO cannot leak nested company', () => {
  const job = { company_id: 4, company_name: 'Changed', company_profile_slug: 'megasoft', public_company_slug: 'unrelated-job-slug', company: { id: 4, public_profile_slug: 'nested-company' } }
  assert.equal(publicJobCompanyLink(job), '/empresas/megasoft')
  assert.equal(publicJobCompanyLink({ ...job, is_company_hidden: true }), null)
  assert.equal(publicJobCompanyLink({}), null)
  assert.equal(publicJobCompanyLink({ ...job, company_profile_slug: null }), null)
  assert.equal(publicJobCompanyLink({ company_id: 4, company_name: 'Changed' }), null)
})
test('public SPA route/detail does not redirect wrong slug or use fictitious company fallback', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const detail = await readFile(new URL('../src/pages/CompanyDetailPage.jsx', import.meta.url), 'utf8')
  assert.match(app, /path="\/empresas\/:companySlug"/)
  assert.match(app, /path="\/companies\/:companySlug"/)
  assert.doesNotMatch(app, /path="\/empresas\/:id"/)
  assert.match(detail, /current !== target/)
  assert.match(detail, /credentials: 'omit'/)
  assert.match(detail, /companies\/by-slug\/\$\{companySlug\}/)
  assert.doesNotMatch(app, /(?:empresas|companies)\/:companySlug\/:id/)
  assert.doesNotMatch(detail, /useParams\(\).*id|fallbackCompanySlug/)
  assert.doesNotMatch(detail, /navigate\(|companies\['1'\]/)
  const next = await readFile(new URL('../../next/src/components/JobDetailPage.server.tsx', import.meta.url), 'utf8')
  assert.match(next, /publicJobCompanyPath/)
})
