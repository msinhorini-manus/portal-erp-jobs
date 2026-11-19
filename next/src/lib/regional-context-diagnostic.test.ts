import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runInNewContext } from 'node:vm'
import { NextRequest, NextResponse } from 'next/server'
import { proxy } from '../proxy'
import { countryPrefix, defaultCountry } from './regional-routes'
import { internalApiOrigin, normalizeRequestHost, trustedRegionalHeaders } from './regional-transport'
import { canonicalJobProxy } from './job-proxy'
import { canonicalCompanyProxy } from './company-proxy'
import { internalReadFetch, type InternalReadInit } from './internal-read-fetch'
import { regionalObservationFor } from './regional-diagnostic.server'

const br = { site: { country_code: 'BR', locale: 'pt-BR', url_prefix: '/br', is_active: true }, locale: 'pt-BR' }
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status })
const close = () => new TypeError('fetch failed', { cause: Object.assign(new Error('other side closed'), { name: 'SocketError', code: 'UND_ERR_SOCKET' }) })
const fetcher = vi.fn<typeof fetch>()
const logger = vi.fn()
beforeEach(() => { fetcher.mockReset(); logger.mockReset(); vi.stubGlobal('fetch', fetcher); vi.spyOn(console, 'log').mockImplementation(logger) })
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })
const records = () => logger.mock.calls.map(([line]) => JSON.parse(String(line).slice('JOBS_REGIONAL_DIAG '.length)))
const request = (path = '/br/vagas', method = 'GET') => new NextRequest(`https://fixture.invalid${path}`, { method, headers: { host: 'fixture.invalid', cookie: 'cookie-secret', authorization: 'auth-secret', 'x-request-id': 'attacker-id', 'x-regional-prefix': '/mx', 'x-next-regional-country': 'mx' } })

// Original proxy from c2d462fac23edaec268b4c7b99aa2ff8c3aa6d6a, with only its name
// changed. Use the unchanged default/unobserved transport for differential checks.
async function baseProxy(request: NextRequest) {
  const h = new Headers(request.headers)
  for (const name of [...h.keys()]) {
    if (/^(?:x-regional-|x-next-regional-)/i.test(name)) h.delete(name)
  }
  const country = request.nextUrl.pathname.split('/')[1] || ''
  const globals = new Set(['', 'robots.txt', 'sitemap.xml', '_next', 'assets', 'uploads', 'brand', 'admin', 'icon.png', 'og-image.png', 'og-image.svg', 'favicon.ico'])
  if (!globals.has(country) && !/^[a-z]{2}$/.test(country)) return new NextResponse('Not found', { status: 404, headers: { 'X-Robots-Tag': 'noindex' } })
  if (/^[a-z]{2}$/.test(country)) {
    const prefix = countryPrefix(country)
    let host: string
    try { host = normalizeRequestHost(h.get('host') || request.nextUrl.host) } catch {
      return new NextResponse('Not found', { status: 404 })
    }
    // Resolution is always live: inactive/unknown countries fail before pages,
    // APIs and BFFs. Backend validates the active mapping, not a BR allowlist.
    try {
      const response = await internalReadFetch(`${internalApiOrigin()}/api/context`, { headers: trustedRegionalHeaders(host, prefix), cache: 'no-store' })
      if ([400, 404].includes(response.status)) return new NextResponse('Not found', { status: 404, headers: { 'X-Robots-Tag': 'noindex' } })
      if (!response.ok) return new NextResponse('Regional service unavailable', { status: 503 })
      const context = await response.json()
      if (!context?.site?.is_active || context.site.url_prefix !== prefix || context.site.country_code?.toLowerCase() !== country || context.locale !== context.site.locale) return new NextResponse('Not found', { status: 404 })
      const jobResponse = await canonicalJobProxy(request.nextUrl.pathname, request.nextUrl.search, request.method, host, context)
      if (jobResponse) return jobResponse
      const companyResponse = await canonicalCompanyProxy(request.nextUrl.pathname, request.method, host, context)
      if (companyResponse) return companyResponse
      h.set('x-next-regional-country', country)
      h.set('x-next-regional-prefix', prefix)
      h.set('x-next-regional-path', request.nextUrl.pathname)
      // Next rewrite /:country/api -> stable private /api keeps these headers.
      if (request.nextUrl.pathname.startsWith(`${prefix}/api/`)) {
        h.set('X-Regional-Host', host)
        h.set('X-Regional-Prefix', prefix)
      }
    } catch { return new NextResponse('Regional service unavailable', { status: 503 }) }
  }
  // Global entry never infers a country from cookies/headers/geolocation.
  if (request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone(); url.pathname = countryPrefix(defaultCountry())
    return NextResponse.redirect(url, 307)
  }
  return NextResponse.next({ request: { headers: h } })
}
const snapshot = async (response: Response) => ({ status: response.status, statusText: response.statusText, headers: [...response.headers.entries()], body: await response.text() })
const calls = () => fetcher.mock.calls.map(([url, init]) => ({ url, ...init, headers: [...new Headers(init?.headers).entries()] }))
type Scenario = { name: string; replies: () => Array<Response | Error>; expected: number; phase?: string }
const scenarios: Scenario[] = [
  { name: 'valid', replies: () => [json(br)], expected: 200 },
  ...[301, 400, 401, 403, 404, 429, 500, 503, 504].map(status => ({ name: `HTTP ${status}`, replies: () => [json({}, status)], expected: [400, 404].includes(status) ? 404 : 503, phase: 'http' })),
  { name: 'malformed JSON', replies: () => [new Response('{')], expected: 503, phase: 'json' },
  { name: 'interrupted body', replies: () => [{ status: 200, ok: true, json: vi.fn().mockRejectedValue(close()) } as unknown as Response], expected: 503, phase: 'json' },
  ...[{}, null, { site: { ...br.site, is_active: false }, locale: br.locale }, { ...br, site: { ...br.site, url_prefix: '/mx' } }, { ...br, site: { ...br.site, country_code: 'MX' } }, { ...br, locale: 'other' }].map((value, index) => ({ name: `invalid context ${index}`, replies: () => [json(value)], expected: 404, phase: 'validation' })),
  { name: 'validation throws', replies: () => [json({ ...br, site: { ...br.site, country_code: 42 } })], expected: 503, phase: 'validation' },
  { name: 'unknown fetch error', replies: () => [new Error('private-upstream-secret')], expected: 503, phase: 'fetch' },
  { name: 'close recovered', replies: () => [close(), json(br)], expected: 200 },
  { name: 'close twice', replies: () => [close(), close()], expected: 503, phase: 'fetch' },
  { name: 'close then HTTP error', replies: () => [close(), json({}, 500)], expected: 503, phase: 'http' },
]
function queue(replies: Array<Response | Error>) {
  fetcher.mockReset()
  for (const reply of replies) if (reply instanceof Error) fetcher.mockRejectedValueOnce(reply); else fetcher.mockResolvedValueOnce(reply)
}

describe('regional proxy exact differential response, headers, options and methods', () => {
  it.each(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].flatMap(method => scenarios.map(scenario => ({ method, ...scenario }))))('$method / $name', async ({ method, replies, expected, phase }) => {
    queue(replies())
    const baseline = await snapshot(await baseProxy(request('/br/api/context-check?token=query-secret', method)))
    const baselineCalls = calls()
    queue(replies())
    logger.mockClear()
    const observed = await snapshot(await proxy(request('/br/api/context-check?token=query-secret', method)))
    expect(observed).toEqual(baseline)
    expect(observed.status).toBe(expected)
    expect(calls()).toEqual(baselineCalls)
    expect(fetcher.mock.calls.every(([, init]) => init?.method === undefined && init?.cache === 'no-store')).toBe(true)
    expect(observed.headers.some(([name]) => /diagnostic|jobs-regional-diag/.test(name))).toBe(false)
    if (phase) expect(records().at(-1)).toMatchObject({ emitter: 'regional-proxy', phase, event: 'failure' })
    for (const record of records()) expect(record.op).toBe('regional-context')
    expect(logger.mock.calls.flat().join('')).not.toMatch(/private|secret|fixture.invalid|cookie|authorization|token|attacker-id/)
  })
  it.each(['/', '/robots.txt', '/invalid-route', '/us', '/zz/vagas'])('keeps global/other-country %s unobserved', async path => {
    queue([json({}, 404)])
    const baseline = await snapshot(await baseProxy(request(path)))
    const baselineCalls = calls()
    queue([json({}, 404)])
    expect(await snapshot(await proxy(request(path)))).toEqual(baseline)
    expect(calls()).toEqual(baselineCalls)
    expect(logger).not.toHaveBeenCalled()
  })
  it.each(['mx', 'co'].flatMap(country => ['', '/', '/vagas', '/api/context-check?token=query-secret'].flatMap(suffix => ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].map(method => ({ path: `/${country}${suffix}`, method })))))('keeps expected inactive $method $path 404 quiet with exact response and fetch', async ({ path, method }) => {
    queue([json({}, 404)])
    const baseline = await snapshot(await baseProxy(request(path, method)))
    const baselineCalls = calls()
    const upstream = json({}, 404)
    const parse = vi.spyOn(upstream, 'json')
    queue([upstream]); logger.mockClear()
    const incoming = request(path, method)
    incoming.headers.set('rsc', '1'); incoming.headers.set('next-router-prefetch', '1')
    expect(await snapshot(await proxy(incoming))).toEqual(baseline)
    expect(calls()).toEqual(baselineCalls)
    expect(baseline).toMatchObject({ status: 404, body: 'Not found' })
    expect(new Headers(baseline.headers).get('x-robots-tag')).toBe('noindex')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(parse).not.toHaveBeenCalled()
    expect(upstream.bodyUsed).toBe(false)
    expect(logger).not.toHaveBeenCalled()
  })
  it.each(['mx', 'co'].flatMap(country => scenarios.filter(scenario => ['HTTP 400', 'HTTP 401', 'HTTP 403', 'HTTP 429', 'HTTP 500', 'HTTP 503', 'HTTP 504', 'malformed JSON', 'interrupted body', 'invalid context 2', 'validation throws', 'unknown fetch error', 'close twice', 'close then HTTP error'].includes(scenario.name)).map(scenario => ({ country, name: scenario.name, expected: scenario.expected, phase: scenario.phase, replies: scenario.name === 'validation throws' ? () => [json({ ...br, site: { ...br.site, url_prefix: `/${country}`, country_code: 42 } })] : scenario.replies }))))('still captures inactive $country fault $name without changing response or fetch', async ({ country, replies, expected, phase }) => {
    const path = `/${country}/vagas`
    queue(replies())
    const baseline = await snapshot(await baseProxy(request(path)))
    const baselineCalls = calls()
    queue(replies()); logger.mockClear()
    expect(await snapshot(await proxy(request(path)))).toEqual(baseline)
    expect(baseline.status).toBe(expected)
    expect(calls()).toEqual(baselineCalls)
    expect(records().at(-1)).toMatchObject({ emitter: 'regional-proxy', country_class: 'inactive', phase, event: 'failure' })
    expect(logger.mock.calls.flat().join('')).not.toMatch(/private|secret|fixture.invalid|cookie|authorization|token|attacker-id/)
  })
  it.each([400, 404])('still records BR HTTP %s as unexpected failure with exact 404 response', async status => {
    queue([json({}, status)])
    const baseline = await snapshot(await baseProxy(request('/br/vagas')))
    const baselineCalls = calls()
    queue([json({}, status)]); logger.mockClear()
    expect(await snapshot(await proxy(request('/br/vagas')))).toEqual(baseline)
    expect(calls()).toEqual(baselineCalls)
    expect(records()).toHaveLength(1)
    expect(records()[0]).toMatchObject({ emitter: 'regional-proxy', country_class: 'BR', phase: 'http', event: 'failure', status, error_chain: [] })
  })
  it.each(['mx', 'co'])('keeps $country transport failure captured even if retry receives expected 404', async country => {
    const path = `/${country}/vagas`
    queue([close(), json({}, 404)])
    const baseline = await snapshot(await baseProxy(request(path)))
    const baselineCalls = calls()
    queue([close(), json({}, 404)]); logger.mockClear()
    expect(await snapshot(await proxy(request(path)))).toEqual(baseline)
    expect(calls()).toEqual(baselineCalls)
    expect(records().map(({ emitter, phase, event, attempt, status }) => ({ emitter, phase, event, attempt, status }))).toEqual([
      { emitter: 'internal-read-fetch', phase: 'fetch', event: 'failure', attempt: 1, status: null },
      { emitter: 'internal-read-fetch', phase: 'fetch', event: 'recovered', attempt: 2, status: 404 },
    ])
    expect(records()[0].error_chain).toEqual([{ name: 'TypeError', code: null }, { name: 'SocketError', code: 'UND_ERR_SOCKET' }])
    expect(records().every(record => record.country_class === 'inactive')).toBe(true)
    expect(new Set(records().map(record => record.request_id)).size).toBe(1)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it.each(['mx', 'co'])('does not hide $country exceptions while reading HTTP status', async country => {
    const reply = () => Object.defineProperty({}, 'status', { get: () => { throw new Error('status-secret') } }) as Response
    const path = `/${country}/vagas`
    queue([reply()])
    const baseline = await snapshot(await baseProxy(request(path)))
    const baselineCalls = calls()
    queue([reply()]); logger.mockClear()
    expect(await snapshot(await proxy(request(path)))).toEqual(baseline)
    expect(baseline.status).toBe(503)
    expect(calls()).toEqual(baselineCalls)
    expect(records()).toHaveLength(1)
    expect(records()[0]).toMatchObject({ emitter: 'regional-proxy', country_class: 'inactive', phase: 'http', event: 'failure', status: null, error_chain: [{ name: 'Error', code: null }] })
    expect(logger.mock.calls.flat().join('')).not.toContain('status-secret')
  })
  it.each(['/br', '/br/', '/br/vagas', '/br/empresas'])('never emits normal-success log for %s', async path => {
    queue([json(br)])
    expect((await proxy(request(path))).status).toBe(200)
    expect(logger).not.toHaveBeenCalled()
  })
  it.each(['/br/vagas/a/b/1', '/br/empresas/private-slug'])('does not misattribute downstream failure at %s to context', async path => {
    queue([json(br), new Error('downstream-secret')])
    const baseline = await snapshot(await baseProxy(request(path)))
    queue([json(br), new Error('downstream-secret')])
    expect(await snapshot(await proxy(request(path)))).toEqual(baseline)
    expect(logger).not.toHaveBeenCalled()
  })
  it.each(['stdout', 'serialization', 'clock'])('preserves 503 and retry sequence when %s diagnostic fails', async kind => {
    queue([close(), close()])
    if (kind === 'stdout') logger.mockImplementation(() => { throw new Error('logger-secret') })
    if (kind === 'serialization') vi.spyOn(JSON, 'stringify').mockImplementation(() => { throw new Error('json-log-secret') })
    if (kind === 'clock') vi.spyOn(performance, 'now').mockImplementation(() => { throw new Error('clock-secret') })
    const response = await proxy(request())
    expect(response.status).toBe(503)
    expect(await response.text()).toBe('Regional service unavailable')
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(new Headers(fetcher.mock.calls[1][1]?.headers).get('connection')).toBe('close')
  })
  it('identifies JSON and validation exception chains without consuming or logging bodies', async () => {
    for (const scenario of scenarios.filter(s => ['malformed JSON', 'interrupted body', 'validation throws'].includes(s.name))) {
      queue(scenario.replies()); logger.mockClear()
      expect((await proxy(request())).status).toBe(503)
      expect(fetcher).toHaveBeenCalledTimes(1)
      expect(records()[0]).toMatchObject({ phase: scenario.phase, attempt: 1, status: 200, event: 'failure' })
      expect(records()[0].error_chain.length).toBeGreaterThan(0)
    }
  })
})

describe('opt-in fetch observations preserve exact retry semantics', () => {
  const url = 'http://127.0.0.1:5000/api/context'
  const observation = () => regionalObservationFor(request())!
  it('correlates failure, second failure and proxy catch using one request ID', async () => {
    queue([close(), close()])
    expect((await proxy(request())).status).toBe(503)
    expect(records().map(({ emitter, phase, event, attempt }) => ({ emitter, phase, event, attempt }))).toEqual([
      { emitter: 'internal-read-fetch', phase: 'fetch', event: 'failure', attempt: 1 },
      { emitter: 'internal-read-fetch', phase: 'fetch', event: 'failure', attempt: 2 },
      { emitter: 'regional-proxy', phase: 'fetch', event: 'failure', attempt: 2 },
    ])
    expect(new Set(records().map(record => record.request_id)).size).toBe(1)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it.each([200, 404, 503])('recovery means received headers after retry (HTTP %s), not a validated page', async status => {
    queue([close(), json(br, status)])
    const response = await proxy(request())
    expect(response.status).toBe(status === 200 ? 200 : status === 404 ? 404 : 503)
    expect(records().slice(0, 2).map(record => [record.event, record.attempt, record.status])).toEqual([['failure', 1, null], ['recovered', 2, status]])
    expect(new Set(records().map(record => record.request_id)).size).toBe(1)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it.each(['object', 'tuples', 'Headers'])('preserves first init identity, every option and cloned %s headers with observation', async kind => {
    const entries: [string, string][] = [['X-Regional-Prefix', '/br'], ['X-Regional-Host', 'fixture.invalid'], ['Connection', 'keep-alive']]
    const headers = kind === 'object' ? Object.fromEntries(entries) : kind === 'tuples' ? entries : new Headers(entries)
    const init: InternalReadInit = { method: 'GET', headers, cache: 'no-store', signal: new AbortController().signal, redirect: 'error', next: { tags: ['fixture'] }, credentials: 'omit', keepalive: false }
    const response = json(br)
    queue([close(), response])
    expect(await internalReadFetch(url, init, observation())).toBe(response)
    expect(fetcher.mock.calls[0][1]).toBe(init)
    expect({ ...fetcher.mock.calls[1][1], headers: undefined }).toEqual({ ...init, headers: undefined })
    expect(fetcher.mock.calls[1][1]?.signal).toBe(init.signal)
    expect(new Headers(fetcher.mock.calls[1][1]?.headers).get('connection')).toBe('close')
    expect(new Headers(headers).get('connection')).toBe('keep-alive')
    expect(response.bodyUsed).toBe(false)
  })
  it.each([
    { url: 'http://127.0.0.1:5000/api/jobs/123', init: { cache: 'no-store' } },
    { url: 'http://127.0.0.1:5000/api/context?token=secret', init: { cache: 'no-store' } },
    { url: 'http://127.0.0.1:5000/api/context', init: { cache: 'force-cache' } },
    { url: 'http://127.0.0.1:5000/api/context', init: {} },
    { url: 'http://127.0.0.1:5000/api/context/', init: { cache: 'no-store' } },
  ])('does not observe another endpoint/query/cache %#', async ({ url, init }) => {
    const error = new Error('secret'); fetcher.mockRejectedValueOnce(error)
    await expect(internalReadFetch(url, init as InternalReadInit, observation())).rejects.toBe(error)
    expect(logger).not.toHaveBeenCalled()
  })
  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])('rejects opt-in %s exactly as before without fetch or log', async method => {
    await expect(internalReadFetch(url, { method, cache: 'no-store' }, observation())).rejects.toThrow('Internal read requires a bodyless GET')
    expect(fetcher).not.toHaveBeenCalled(); expect(logger).not.toHaveBeenCalled()
  })
  it.each(['authorization', 'cookie'])('rejects opt-in %s exactly as before without fetch or log', async name => {
    await expect(internalReadFetch(url, { cache: 'no-store', headers: { [name]: 'secret' } }, observation())).rejects.toThrow('Internal read requires anonymous headers')
    expect(fetcher).not.toHaveBeenCalled(); expect(logger).not.toHaveBeenCalled()
  })
  it('leaves new-realm retry classification intact while logging its safe names', async () => {
    const error = runInNewContext("new TypeError('fetch failed', {cause: Object.assign(new Error('other side closed'), {name: 'SocketError', code: 'UND_ERR_SOCKET'})})")
    fetcher.mockRejectedValueOnce(error)
    await expect(internalReadFetch(url, { cache: 'no-store' }, observation())).rejects.toBe(error)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(records()[0].error_chain).toEqual([{ name: 'TypeError', code: null }, { name: 'SocketError', code: 'UND_ERR_SOCKET' }])
  })
  it('does not retry an observed aborted signal', async () => {
    const controller = new AbortController(); controller.abort()
    const error = close(); fetcher.mockRejectedValueOnce(error)
    await expect(internalReadFetch(url, { cache: 'no-store', signal: controller.signal }, observation())).rejects.toBe(error)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(records()[0]).toMatchObject({ event: 'failure', attempt: 1 })
  })
  it('does not consume or retry observed body errors', async () => {
    const error = close(); const parse = vi.fn().mockRejectedValue(error)
    const response = { status: 200, ok: true, json: parse } as unknown as Response
    fetcher.mockResolvedValueOnce(response)
    expect(await internalReadFetch(url, { cache: 'no-store' }, observation())).toBe(response)
    expect(parse).not.toHaveBeenCalled(); expect(logger).not.toHaveBeenCalled()
    await expect(response.json()).rejects.toBe(error)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('cannot change the returned response on a retry when its diagnostic status getter throws', async () => {
    const response = Object.defineProperty({}, 'status', { get: () => { throw new Error('getter-secret') } }) as Response
    queue([close(), response])
    expect(await internalReadFetch(url, { cache: 'no-store' }, observation())).toBe(response)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('does not read an unobserved cache getter or status getter', async () => {
    const getter = vi.fn(() => { throw new Error('must not read') })
    const init = Object.defineProperty({}, 'cache', { get: getter })
    const response = Object.defineProperty({}, 'status', { get: getter }) as Response
    fetcher.mockResolvedValueOnce(response)
    expect(await internalReadFetch(url, init)).toBe(response)
    expect(getter).not.toHaveBeenCalled()
  })
  it('preserves error identity despite hostile logging fields and stdout failure', async () => {
    const getter = vi.fn(() => { throw new Error('getter-secret') })
    const error = Object.defineProperties(new Error('secret'), { code: { get: getter }, cause: { get: getter }, toJSON: { get: getter } })
    logger.mockImplementation(() => { throw new Error('stdout-secret') })
    fetcher.mockRejectedValueOnce(error)
    await expect(internalReadFetch(url, { cache: 'no-store' }, observation())).rejects.toBe(error)
    expect(getter).not.toHaveBeenCalled()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})


describe('real Node/Undici observed context transport', () => {
  it.each([false, true])('correlates real pre-header closes (twice: %s) with original Connection options', async twice => {
    const { createServer } = await import('node:http')
    vi.unstubAllGlobals()
    const nativeFetch = globalThis.fetch
    const connections: Array<string | undefined> = []
    const failures: unknown[] = []
    const server = createServer((incoming, response) => {
      connections.push(incoming.headers.connection)
      if (connections.length === 1 || twice) { incoming.socket.destroy(); return }
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end('{"synthetic":true}')
    })
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
    try {
      const address = server.address() as { port: number }
      vi.stubEnv('NEXT_INTERNAL_API_ORIGIN', `http://127.0.0.1:${address.port}`)
      fetcher.mockImplementation(async (input, init) => {
        try { return await nativeFetch(input, init) } catch (error) { failures.push(error); throw error }
      })
      vi.stubGlobal('fetch', fetcher)
      const operation = internalReadFetch(`http://127.0.0.1:${address.port}/api/context`, { cache: 'no-store', redirect: 'error' }, regionalObservationFor(request()))
      if (twice) {
        await expect(operation).rejects.toBeInstanceOf(TypeError)
        expect(records().map(record => [record.event, record.attempt])).toEqual([['failure', 1], ['failure', 2]])
      } else {
        const response = await operation
        expect(response.bodyUsed).toBe(false)
        expect(await response.json()).toEqual({ synthetic: true })
        expect(records().map(record => [record.event, record.attempt])).toEqual([['failure', 1], ['recovered', 2]])
      }
      expect(fetcher).toHaveBeenCalledTimes(2)
      expect(connections).toEqual(['keep-alive', 'close'])
      expect(failures).toHaveLength(twice ? 2 : 1)
      expect(records()[0].error_chain).toEqual([{ name: 'TypeError', code: null }, { name: 'SocketError', code: 'UND_ERR_SOCKET' }])
      expect(new Set(records().map(record => record.request_id)).size).toBe(1)
    } finally {
      server.closeAllConnections()
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    }
  }, 10_000)
})
