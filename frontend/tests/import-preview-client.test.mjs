import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { File } from 'node:buffer'
import {
  buildImportReportCsv, canAdminPreview, createImportPreviewClient, createImportRequestGate,
  filterImportItems, importCsvCell, importDisplayText, IMPORT_MAX_FILE_BYTES,
  paginateImportItems, validateImportCapabilities, validateImportFile, validateImportPreview, validatePastedImportJson,
} from '../src/lib/import-preview-client.js'
import { appFetch, setRegionalRuntime } from '../src/lib/regional-runtime.js'
import { capabilitiesFixture, previewFixture } from './import-preview.fixtures.mjs'

const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
const syntheticToken = 'synthetic-admin-session'
const clientWith = fetcher => createImportPreviewClient({ fetcher, getAdminToken: () => syntheticToken })

beforeEach(() => {
  setRegionalRuntime({ prefix: '/br', basename: '', admin: true, site: { code: 'BR' } })
})

test('capabilities and actor platform permission are validated without trusting localStorage role claims', () => {
  assert.deepEqual(validateImportCapabilities(capabilitiesFixture), capabilitiesFixture)
  assert.equal(canAdminPreview(capabilitiesFixture), true)
  assert.equal(canAdminPreview({ ...capabilitiesFixture, actor: 'agent' }), false)
  assert.equal(canAdminPreview({ ...capabilitiesFixture, preview_enabled: false }), false)
  assert.equal(canAdminPreview(null), false)
  for (const patch of [{ country_code: 'MX' }, { country_code: 'CO' }, { execution_enabled: true }, { preview_enabled: 'true' }, { actor: 'regional_admin' }, { max_file_bytes: IMPORT_MAX_FILE_BYTES + 1 }, { max_rows: 10001 }, { formats: ['exe'] }, { formats: [] }]) {
    assert.throws(() => validateImportCapabilities({ ...capabilitiesFixture, ...patch }), { code: 'invalid_response' })
  }
})

test('only capabilities GET is automatic-capable; exact regional endpoint and no-store are preserved', async () => {
  const calls = []
  const client = clientWith((input, options) => appFetch(input, options, { fetch: async (url, config) => { calls.push({ url, config }); return reply(capabilitiesFixture) } }))
  assert.equal(calls.length, 0)
  await client.capabilities()
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, '/br/api/admin/importacoes/capabilities')
  assert.equal(calls[0].config.method, 'GET')
  assert.equal(calls[0].config.headers.Authorization, `Bearer ${syntheticToken}`)
  assert.equal(calls[0].config.cache, 'no-store')
  assert.equal(calls[0].config.credentials, 'omit')
  assert.equal(calls[0].config.body, undefined)
})

test('file preview is multipart file field with no manual Content-Type or execution endpoint', async () => {
  const file = new File(['synthetic'], 'synthetic.zip', { type: 'application/zip' })
  let captured
  const client = clientWith(async (...args) => { captured = args; return reply(previewFixture()) })
  const result = await client.preview({ file, capabilities: capabilitiesFixture })
  assert.equal(captured[0], '/api/admin/importacoes/preview')
  assert.equal(captured[1].method, 'POST')
  assert.equal(captured[1].headers['Content-Type'], undefined)
  assert.equal(captured[1].body instanceof FormData, true)
  assert.equal(captured[1].body.get('file').name, 'synthetic.zip')
  assert.equal(result.execution_enabled, false)
  assert.deepEqual(Object.keys(client).sort(), ['capabilities', 'preview'])
})

test('pasted JSON is submitted only by preview call, intact, with application/json', async () => {
  const jsonText = '{"empresas": []}'
  let captured
  const client = clientWith(async (...args) => { captured = args; return reply(previewFixture(0)) })
  assert.equal(captured, undefined)
  await client.preview({ jsonText, capabilities: capabilitiesFixture })
  assert.equal(captured[1].body, jsonText)
  assert.equal(captured[1].headers['Content-Type'], 'application/json')
})

test('file precheck accepts supported case-insensitive extensions and at most 50MiB; smaller API limit enforced', () => {
  for (const name of ['synthetic.JSON', 'synthetic.csv', 'synthetic.zip']) assert.equal(validateImportFile({ name, size: 1 }, capabilitiesFixture).name, name)
  assert.equal(validateImportFile({ name: 'limit.zip', size: IMPORT_MAX_FILE_BYTES }).size, IMPORT_MAX_FILE_BYTES)
  for (const file of [null, { name: 'empty.json', size: 0 }, { name: 'synthetic.exe', size: 1 }, { name: 'large.zip', size: IMPORT_MAX_FILE_BYTES + 1 }]) assert.throws(() => validateImportFile(file))
  assert.throws(() => validateImportFile({ name: 'small.json', size: 11 }, { ...capabilitiesFixture, max_file_bytes: 10 }), { code: 'file_too_large' })
})

test('invalid files, missing input, invalid JSON, oversized UTF-8 and dual inputs never dispatch HTTP', () => {
  let calls = 0
  const client = clientWith(async () => { calls++; return reply(previewFixture()) })
  assert.throws(() => client.preview({ file: new File(['x'], 'invalid.exe'), capabilities: capabilitiesFixture }))
  assert.throws(() => client.preview({ jsonText: '{invalid}', capabilities: capabilitiesFixture }), { code: 'invalid_json' })
  assert.throws(() => client.preview({ jsonText: 'null', capabilities: capabilitiesFixture }), { code: 'invalid_json' })
  assert.throws(() => client.preview({ capabilities: capabilitiesFixture }), { code: 'json_required' })
  assert.throws(() => client.preview({ file: new File(['{}'], 'a.json'), jsonText: '{}', capabilities: capabilitiesFixture }), { code: 'ambiguous_input' })
  assert.throws(() => validatePastedImportJson('{"é":"é"}', { ...capabilitiesFixture, max_file_bytes: 10 }), { code: 'file_too_large' })
  assert.equal(calls, 0)
})

test('agent, disabled preview and absent Admin token fail closed without network', async () => {
  let calls = 0
  const client = clientWith(async () => { calls++; return reply(previewFixture()) })
  assert.throws(() => client.preview({ jsonText: '{}', capabilities: { ...capabilitiesFixture, actor: 'agent' } }), { status: 403 })
  assert.throws(() => client.preview({ jsonText: '{}', capabilities: { ...capabilitiesFixture, preview_enabled: false } }), { status: 403 })
  const noTokenClient = createImportPreviewClient({ fetcher: async () => { calls++ }, getAdminToken: () => null })
  await assert.rejects(noTokenClient.capabilities(), { status: 401 })
  assert.equal(calls, 0)
})

test('server authorization is rechecked by POST; safe status errors never echo private server details', async () => {
  for (const status of [400, 401, 403, 404, 413, 422, 429, 500]) {
    const client = clientWith(async () => reply({ error: 'PRIVATE /secret/path token=password', code: 'anything' }, status))
    await assert.rejects(client.preview({ jsonText: '{}', capabilities: capabilitiesFixture }), error => {
      assert.equal(error.status, status)
      assert.equal(error.code, `http_${status}`)
      assert.doesNotMatch(error.message, /PRIVATE|secret|password|anything/)
      return true
    })
  }
})

test('malformed DTO, incompatible runtime execution flags and unsafe enum/type values are rejected', () => {
  // One item keeps unrelated entity/action totals consistent in item mutations.
  const original = previewFixture(1)
  for (const patch of [{ execution_enabled: true }, { dry_run: false }, { status: 'done' }, { country_code: 'MX' }, { preview_id: '' }, { items: null }, { limitations: [42] }, { totals: { ...original.totals, create: -1 } }, { items: [{ ...original.items[0], action: '__proto__' }] }, { items: [{ ...original.items[0], entity: '__proto__' }] }, { items: [{ ...original.items[0], line: -1 }] }, { items: [{ ...original.items[0], messages: [{ code: 'x', field: 'x', severity: 'info', message: 'x' }] }] }]) {
    assert.throws(() => validateImportPreview({ ...original, ...patch }), { code: 'invalid_response' })
  }
})

test('all totals must be nonnegative safe integers, not just below a numeric ceiling', () => {
  const original = previewFixture()
  for (const key of Object.keys(original.totals)) {
    for (const value of [undefined, null, '0', true, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER]) {
      assert.throws(() => validateImportPreview({ ...original, totals: { ...original.totals, [key]: value } }), { code: 'invalid_response' }, `${key}=${String(value)}`)
    }
  }
})

test('entity totals match each validated entity exactly, including same-sum substitutions', () => {
  const original = previewFixture()
  for (const key of ['companies', 'jobs', 'logos']) {
    for (const value of [0, original.totals[key] - 1, original.totals[key] + 1, original.items.length + 1]) {
      assert.throws(() => validateImportPreview({ ...original, totals: { ...original.totals, [key]: value } }), { code: 'invalid_response' })
    }
  }
  assert.throws(() => validateImportPreview({ ...original, totals: { ...original.totals, companies: original.totals.companies - 1, jobs: original.totals.jobs + 1 } }), { code: 'invalid_response' })
})

test('action totals match their individual subsets and never require review to be counted', () => {
  const original = previewFixture(5)
  assert.deepEqual(validateImportPreview(original).totals, original.totals)
  assert.equal(original.items.filter(item => item.action === 'review').length, 1)
  assert.equal(original.totals.create + original.totals.update + original.totals.ignore + original.totals.error, 4)
  for (const key of ['create', 'update', 'ignore', 'error']) {
    for (const value of [0, 2, original.items.length + 1]) {
      assert.throws(() => validateImportPreview({ ...original, totals: { ...original.totals, [key]: value } }), { code: 'invalid_response' })
    }
  }
  assert.throws(() => validateImportPreview({ ...original, totals: { ...original.totals, create: 0, update: 2 } }), { code: 'invalid_response' })
  const reviewOnly = { ...original, items: [original.items[4]], totals: { companies: 0, jobs: 1, logos: 0, create: 0, update: 0, ignore: 0, error: 0, warnings: 1 } }
  assert.deepEqual(validateImportPreview(reviewOnly).totals, reviewOnly.totals)
})

test('warning totals count warning messages, not warned items, all messages or error actions', () => {
  const original = previewFixture(5)
  const warning = original.items[4].messages[0]
  const error = original.items[3].messages[0]
  original.items[4].messages.push({ ...warning, code: 'another_warning' })
  original.items[3].messages.push({ ...error, code: 'another_error' }, { ...warning })
  original.totals.warnings = 3
  const result = validateImportPreview(original)
  assert.equal(result.totals.warnings, 3)
  assert.equal(result.totals.error, 1)
  assert.equal(result.items.filter(item => item.messages.some(message => message.severity === 'warning')).length, 2)
  for (const warnings of [0, 2, 4, 5, 100000, 119991]) {
    assert.throws(() => validateImportPreview({ ...original, totals: { ...original.totals, warnings } }), { code: 'invalid_response' })
  }
  const invalidMessage = structuredClone(original)
  invalidMessage.items[4].messages[0].code = 42
  assert.throws(() => validateImportPreview(invalidMessage), { code: 'invalid_response' })
})

test('each item accepts at most 100 validated messages even when its totals are consistent', () => {
  const original = previewFixture(1)
  const warning = { code: 'synthetic_warning', field: 'synthetic', severity: 'warning', message: 'Aviso sintético.' }
  original.items[0].messages = Array.from({ length: 100 }, () => ({ ...warning }))
  original.totals.warnings = 100
  assert.equal(validateImportPreview(original).items[0].messages.length, 100)
  original.items[0].messages.push({ ...warning })
  original.totals.warnings = 101
  assert.throws(() => validateImportPreview(original), { code: 'invalid_response' })
})

test('10000 items with 119991 warning messages are accepted without an arbitrary warning ceiling', () => {
  const original = previewFixture(0)
  const warning = { code: 'synthetic_warning', field: 'synthetic', severity: 'warning', message: 'Aviso sintético.' }
  original.items = Array.from({ length: 10000 }, (_, index) => ({
    line: index + 1, entity: index === 0 ? 'company' : 'job', key: `synthetic-${index}`, label: 'Item sintético', action: 'review',
    messages: Array.from({ length: index === 0 ? 3 : 12 }, () => ({ ...warning })),
  }))
  original.totals = { companies: 1, jobs: 9999, logos: 0, create: 0, update: 0, ignore: 0, error: 0, warnings: 119991 }
  const result = validateImportPreview(original)
  assert.equal(result.items.length, 10000)
  assert.equal(result.totals.warnings, 119991)
  assert.deepEqual(result.totals, original.totals)
})

test('more than the backend 10000-item limit is rejected even with exact totals', () => {
  assert.throws(() => validateImportPreview(previewFixture(10001)), { code: 'invalid_response' })
})

test('empty previews have zero semantic totals and reject any nonzero count', () => {
  const original = previewFixture(0)
  assert.deepEqual(validateImportPreview(original).totals, original.totals)
  for (const key of Object.keys(original.totals)) {
    assert.throws(() => validateImportPreview({ ...original, totals: { ...original.totals, [key]: 1 } }), { code: 'invalid_response' })
  }
})

test('presentation uses a bounded allowlist of DTO fields; controls removed and HTML retained only as text', () => {
  const fixture = previewFixture()
  fixture.token = 'never-copy'
  fixture.items[0].description = 'never-copy'
  fixture.items[0].cnpj = 'never-copy'
  fixture.items[0].label = `\u0000\u202e${'x'.repeat(400)}`
  const result = validateImportPreview(fixture)
  assert.equal(result.items[0].label.length, 240)
  assert.equal(JSON.stringify(result).includes('never-copy'), false)
  assert.equal(result.items[1].label.startsWith('<img'), true)
  assert.equal(importDisplayText('a\u0000b\u202ec'), 'abc')
})

test('aborted calls before dispatch, after transport and during JSON decode are discarded', async () => {
  const controller = new AbortController()
  controller.abort()
  let calls = 0
  await assert.rejects(clientWith(async () => { calls++ }).capabilities({ signal: controller.signal }), { name: 'AbortError' })
  assert.equal(calls, 0)
  const afterTransport = new AbortController()
  await assert.rejects(clientWith(async () => { afterTransport.abort(); return reply(capabilitiesFixture) }).capabilities({ signal: afterTransport.signal }), { name: 'AbortError' })
  const afterDecode = new AbortController()
  const client = clientWith(async () => ({ ok: true, json: async () => { afterDecode.abort(); return capabilitiesFixture } }))
  await assert.rejects(client.capabilities({ signal: afterDecode.signal }), { name: 'AbortError' })
})

test('transport failures and malformed JSON produce safe errors', async () => {
  await assert.rejects(clientWith(async () => { throw new Error('private connection detail') }).capabilities(), { code: 'network_error' })
  await assert.rejects(clientWith(async () => new Response('not JSON')).capabilities(), { code: 'invalid_response' })
})

test('synchronous gate blocks double click and protects a newer request from stale finally and results', () => {
  const gate = createImportRequestGate()
  const first = gate.begin()
  assert.equal(gate.begin(), null)
  assert.equal(gate.isCurrent(first), true)
  gate.invalidate()
  assert.equal(first.controller.signal.aborted, true)
  const second = gate.begin()
  assert.notEqual(second, first)
  assert.equal(gate.isCurrent(first), false)
  gate.finish(first)
  assert.equal(gate.isCurrent(second), true)
  gate.finish(second)
  assert.equal(gate.isCurrent(second), false)
  assert.notEqual(gate.begin(), null)
  gate.invalidate()
})

test('filters compose by action, type, severity and plain text search without side effects', () => {
  const items = validateImportPreview(previewFixture()).items
  const filtered = filterImportItems(items, { action: 'review', severity: 'warning', entity: 'job', search: 'EXTERNAL_KEY_MISSING' })
  assert.ok(filtered.length > 0)
  assert.ok(filtered.every(item => item.action === 'review' && item.entity === 'job'))
  assert.equal(filterImportItems(items, { search: 'does-not-exist' }).length, 0)
  assert.equal(items.length, 67)
})

test('pagination clamps stale pages and renders only a bounded subset, including empty results', () => {
  const items = previewFixture().items
  assert.equal(paginateImportItems(items, 1, 25).items.length, 25)
  assert.equal(paginateImportItems(items, 3, 25).items.length, 17)
  assert.equal(paginateImportItems(items, 999, 25).page, 3)
  assert.deepEqual(paginateImportItems([], 4, 25), { items: [], page: 1, pages: 1, total: 0, first: 0, last: 0 })
  assert.equal(paginateImportItems(items, -5, 25).page, 1)
})

test('CSV neutralizes formulas including whitespace/control obfuscation and escapes separators/quotes', () => {
  for (const value of ['=1+1', '+SUM(A1)', '-1', '@SUM(A1)', ' =1', '\t=1', '\r=1', '\n=1', '\u0000=1', '\u202e=1']) assert.ok(importCsvCell(value).startsWith('"\''), JSON.stringify(value))
  assert.equal(importCsvCell('a;"b"\nc'), '"a;""b""\nc"')
  const preview = validateImportPreview(previewFixture())
  const csv = buildImportReportCsv(preview)
  assert.ok(csv.startsWith('\ufeff'))
  assert.ok(csv.includes('"preview_only";"nenhuma"'))
  assert.ok(csv.includes('"\'=HYPERLINK'))
  assert.ok(csv.includes('Proposta de criação'))
  assert.equal(buildImportReportCsv(preview, []).split('\r\n').length, 2)
})
