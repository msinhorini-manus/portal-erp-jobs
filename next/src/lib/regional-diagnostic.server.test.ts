import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runInNewContext } from 'node:vm'
import { NextRequest } from 'next/server'
import { contextReadObservation, regionalAttempt, regionalDiagnostic, regionalErrorChain, regionalObservationFor, type RegionalObservation } from './regional-diagnostic.server'

const logger = vi.fn()
beforeEach(() => { logger.mockReset(); vi.spyOn(console, 'log').mockImplementation(logger) })
afterEach(() => { vi.restoreAllMocks() })
const observe = (path = '/br/vagas/private-company/private-title/123?token=query-secret') => regionalObservationFor(new NextRequest(`https://fixture.invalid${path}`, { headers: { 'x-request-id': 'attacker-id', cookie: 'cookie-secret', authorization: 'auth-secret', host: 'host-secret.invalid', referer: 'referrer-secret', rsc: '1', 'next-router-prefetch': 'secret-prefetch-value' } }))!
const records = () => logger.mock.calls.map(([line]) => JSON.parse(String(line).slice('JOBS_REGIONAL_DIAG '.length)))

describe('closed regional diagnostic v1', () => {
  it('emits exactly the schema with only allowlisted scalars and generated ID', () => {
    const observation = observe()
    const error = new TypeError('message-secret', { cause: Object.assign(new Error('inner-message-secret'), { name: 'SocketError', code: 'UND_ERR_SOCKET', stack: 'stack-secret', socket: { host: 'body-secret' }, toJSON: () => { throw new Error('never call') } }) })
    regionalDiagnostic(observation, 'internal-read-fetch', 'fetch', 'failure', undefined, error)
    const [record] = records()
    expect(Object.keys(record)).toEqual(['v', 'op', 'request_id', 'emitter', 'phase', 'event', 'path_class', 'country_class', 'rsc', 'prefetch', 'attempt', 'status', 'duration_ms', 'error_chain'])
    expect(record).toMatchObject({ v: 1, op: 'regional-context', emitter: 'internal-read-fetch', phase: 'fetch', event: 'failure', path_class: 'regional-jobs', country_class: 'BR', rsc: true, prefetch: true, attempt: 1, status: null, error_chain: [{ name: 'TypeError', code: null }, { name: 'SocketError', code: 'UND_ERR_SOCKET' }] })
    expect(record.request_id).toMatch(/^[a-f0-9]{12}-[a-z0-9]{1,6}$/)
    expect(logger.mock.calls[0]).toHaveLength(1)
    expect(logger.mock.calls[0][0]).toMatch(/^JOBS_REGIONAL_DIAG \{/)
    expect(logger.mock.calls[0][0]).not.toMatch(/secret|private|123|attacker-id|fixture.invalid|pathname|query|cookie|authorization|message|stack|env|body|host|referrer/)
  })
  it('distinguishes an undefined thrown value from an HTTP failure without an exception', () => {
    const observation = observe()
    regionalDiagnostic(observation, 'internal-read-fetch', 'fetch', 'failure', undefined, undefined)
    regionalDiagnostic(observation, 'regional-proxy', 'http', 'failure', 503)
    expect(records().map(record => record.error_chain)).toEqual([[{ name: 'Other', code: null }], []])
  })
  it.each([['/br', 'regional-home', 'BR'], ['/br/', 'regional-home', 'BR'], ['/br/vagas', 'regional-jobs', 'BR'], ['/br/vagas/a/b/1', 'regional-jobs', 'BR'], ['/br/vagas-secret', 'regional-other', 'BR'], ['/br/empresas/private', 'regional-other', 'BR'], ['/mx', 'regional-home', 'inactive'], ['/co/vagas', 'regional-jobs', 'inactive']])('classifies %s without retaining its variable path', (path, path_class, country_class) => {
    regionalDiagnostic(observe(path), 'regional-proxy', 'http', 'failure', 404)
    expect(records()[0]).toMatchObject({ path_class, country_class })
  })
  it.each(['/', '/us', '/zz/vagas', '/robots.txt', '/BR/vagas'])('does not observe non-context root/global/other-country %s', path => {
    expect(regionalObservationFor(new NextRequest(`https://fixture.invalid${path}`))).toBeUndefined()
  })
  it('makes unique server IDs and ignores request ID headers', () => {
    for (let i = 0; i < 100; i++) regionalDiagnostic(observe(), 'regional-proxy', 'http', 'failure', 503)
    expect(new Set(records().map(record => record.request_id)).size).toBe(100)
    expect(records().some(record => record.request_id === 'attacker-id')).toBe(false)
  })
  it.each([{ rsc: '1' }, { 'next-router-prefetch': 'anything' }, { purpose: 'prefetch' }, { 'sec-purpose': 'prefetch;prerender' }, { purpose: 'navigate', rsc: '0' }, { 'next-router-prefetch': '', rsc: '1' }, {}])('records only RSC/prefetch booleans %#', headers => {
    const request = new NextRequest('https://fixture.invalid/br', { headers: headers as HeadersInit })
    const observation = regionalObservationFor(request)
    regionalDiagnostic(observation, 'regional-proxy', 'http', 'failure', 500)
    expect(records()[0]).toMatchObject({ rsc: headers.rsc === '1', prefetch: 'next-router-prefetch' in headers || headers.purpose === 'prefetch' || headers['sec-purpose']?.includes('prefetch') === true })
  })
  it('bounds clock failures and elapsed time with constant work', () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(10)
    const observation = observe()
    for (const [value, expected] of [[-100, 0], [900_000, 600_000], [NaN, 0], [Infinity, 0]] as const) {
      clock.mockReturnValue(value)
      regionalDiagnostic(observation, 'regional-proxy', 'http', 'failure', 500)
      expect(records().at(-1).duration_ms).toBe(expected)
    }
    clock.mockImplementation(() => { throw new Error('clock-secret') })
    expect(() => regionalDiagnostic(observation, 'regional-proxy', 'http', 'failure', 500)).not.toThrow()
  })
  it.each([100, 200, 599, 99, 600, 200.5, NaN, Infinity, '200', { toJSON: () => 'secret' }])('bounds status without coercion %#', status => {
    regionalDiagnostic(observe(), 'regional-proxy', 'http', 'failure', status as number)
    expect(records()[0].status).toBe(typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599 ? status : null)
  })
  it('requires a registered opaque observation; never serializes caller fields', () => {
    const forged = { id: 'secret', path_class: 'secret' } as unknown as RegionalObservation
    const trap = new Proxy({}, { get: () => { throw new Error('secret') } }) as RegionalObservation
    for (const value of [undefined, forged, trap]) regionalDiagnostic(value, 'regional-proxy', 'http', 'failure', 500)
    expect(logger).not.toHaveBeenCalled()
    const observation = observe()
    for (const [path, search, cache] of [['/api/jobs/1', '', 'no-store'], ['/api/context/', '', 'no-store'], ['/api/context', '?token=secret', 'no-store'], ['/api/context', '', 'force-cache']] as const) expect(contextReadObservation(observation, path, search, cache)).toBeUndefined()
    expect(contextReadObservation(observation, '/api/context', '', 'no-store')).toBe(observation)
  })
  it('permits recovery only from fetch attempt 2 and rejects invalid enums', () => {
    const observation = observe()
    regionalDiagnostic(observation, 'internal-read-fetch', 'fetch', 'recovered', 200)
    regionalAttempt(observation, 9 as 1)
    regionalDiagnostic(observation, 'regional-proxy', 'http', 'recovered', 200)
    regionalDiagnostic(observation, 'evil' as 'regional-proxy', 'http', 'failure', 200)
    regionalDiagnostic(observation, 'regional-proxy', 'evil' as 'http', 'failure', 200)
    regionalDiagnostic(observation, 'regional-proxy', 'http', 'evil' as 'failure', 200)
    expect(logger).not.toHaveBeenCalled()
    regionalAttempt(observation, 2)
    regionalDiagnostic(observation, 'internal-read-fetch', 'fetch', 'recovered', 200)
    expect(records()[0]).toMatchObject({ attempt: 2, event: 'recovered' })
  })
  it('does not throw when stdout or JSON serialization throws', () => {
    const observation = observe()
    logger.mockImplementation(() => { throw new Error('stdout-secret') })
    expect(() => regionalDiagnostic(observation, 'regional-proxy', 'http', 'failure', 500)).not.toThrow()
    vi.spyOn(JSON, 'stringify').mockImplementation(() => { throw new Error('serialize-secret') })
    expect(() => regionalDiagnostic(observation, 'regional-proxy', 'http', 'failure', 500)).not.toThrow()
  })
  it('does not throw when request inspection fails', () => {
    expect(regionalObservationFor(new Proxy({}, { get: () => { throw new Error('request-secret') } }) as NextRequest)).toBeUndefined()
  })
})

describe('bounded error sanitization', () => {
  it.each([null, undefined, 'message-secret', 42, Symbol('secret'), () => 'secret'])('maps non-object unknown %# to Other without coercion', error => {
    expect(regionalErrorChain(error)).toEqual([{ name: 'Other', code: null }])
  })
  it('handles a new-realm Error by descriptors and unknown classes/codes as Other', () => {
    const error = runInNewContext("new TypeError('realm-secret', {cause: Object.assign(new Error('secret'), {name: 'UnknownSecret', code: 'CODE_SECRET'})})")
    expect(error instanceof TypeError).toBe(false)
    expect(regionalErrorChain(error)).toEqual([{ name: 'TypeError', code: null }, { name: 'Other', code: 'Other' }])
  })
  it('does not execute evil getters, toJSON, message, stack or coercion hooks', () => {
    const evil = vi.fn(() => { throw new Error('getter-secret') })
    const error = Object.defineProperties({}, Object.fromEntries(['name', 'code', 'cause', 'message', 'stack', 'toJSON'].map(key => [key, { get: evil }])))
    expect(regionalErrorChain(error)).toEqual([{ name: 'Other', code: null }])
    regionalDiagnostic(observe(), 'regional-proxy', 'json', 'failure', 200, error)
    expect(evil).not.toHaveBeenCalled()
    const proxy = new Proxy({}, { getOwnPropertyDescriptor: evil, getPrototypeOf: evil, get: evil })
    expect(regionalErrorChain(proxy)).toEqual([{ name: 'Other', code: null }])
    expect(() => regionalDiagnostic(observe(), 'regional-proxy', 'fetch', 'failure', undefined, proxy)).not.toThrow()
  })
  it('caps depth at three and terminates cycles without serializing any input object', () => {
    const cycle = new Error('secret', { cause: undefined }); cycle.cause = cycle
    expect(regionalErrorChain(cycle)).toEqual([{ name: 'Error', code: null }])
    let deep: unknown = new Error('secret')
    for (let i = 0; i < 20; i++) deep = new Error('secret', { cause: deep })
    expect(regionalErrorChain(deep)).toEqual(Array(3).fill({ name: 'Error', code: null }))
  })
  it('does not enumerate giant objects or invoke unrelated property getters', () => {
    const ownKeys = vi.fn(() => { throw new Error('enumeration-secret') })
    const error = new Proxy({ name: 'SyntaxError', code: 'ECONNRESET' }, { ownKeys })
    expect(regionalErrorChain(error)).toEqual([{ name: 'SyntaxError', code: 'ECONNRESET' }])
    expect(ownKeys).not.toHaveBeenCalled()
  })
})
