import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { internalReadFetch, type InternalReadInit } from './internal-read-fetch'

const url = 'http://127.0.0.1:5000/api/companies/4'
function socketClose() {
  const cause = Object.assign(new Error('other side closed'), { name: 'SocketError', code: 'UND_ERR_SOCKET', socket: { bytesRead: 1909, bytesWritten: 522 } })
  return new TypeError('fetch failed', { cause })
}
const fetcher = vi.fn<typeof fetch>()
beforeEach(() => { fetcher.mockReset(); vi.stubGlobal('fetch', fetcher) })
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('bounded anonymous internal GET transport', () => {
  it('returns the original response with exactly the original first-attempt options', async () => {
    const response = new Response('{}')
    const init: InternalReadInit = { cache: 'no-store', redirect: 'error', headers: { 'X-Regional-Host': 'jobs.portalerp.com', 'X-Regional-Prefix': '/br' } }
    fetcher.mockResolvedValueOnce(response)
    expect(await internalReadFetch(url, init)).toBe(response)
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(url, init)
    expect(fetcher.mock.calls[0][1]).toBe(init)
    expect(new Headers(fetcher.mock.calls[0][1]?.headers).has('Connection')).toBe(false)
  })
  it.each(['object', 'tuples', 'Headers'])('retries only once, preserving all options and cloning %s headers', async kind => {
    const entries: [string, string][] = [['X-Regional-Host', 'jobs.portalerp.com'], ['X-Regional-Prefix', '/br'], ['Accept', 'application/json'], ['Connection', 'keep-alive']]
    const headers: HeadersInit = kind === 'object' ? Object.fromEntries(entries) : kind === 'tuples' ? entries : new Headers(entries)
    const controller = new AbortController()
    const init: InternalReadInit = { method: 'GET', headers, cache: 'no-store', redirect: 'error', next: { revalidate: 60, tags: ['regional:jobs.portalerp.com:/br:1:pt-BR'] }, signal: controller.signal, credentials: 'omit', mode: 'cors', referrerPolicy: 'no-referrer', integrity: '', keepalive: false }
    const response = new Response('{}')
    fetcher.mockRejectedValueOnce(socketClose()).mockResolvedValueOnce(response)
    expect(await internalReadFetch(url, init)).toBe(response)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls[0]).toEqual([url, init])
    const [retryUrl, retry] = fetcher.mock.calls[1]
    expect(retryUrl).toBe(url)
    expect({ ...retry, headers: undefined }).toEqual({ ...init, headers: undefined })
    expect((retry as InternalReadInit).next).toBe(init.next)
    expect(retry?.signal).toBe(controller.signal)
    expect(retry?.headers).not.toBe(headers)
    const sent = new Headers(retry?.headers)
    expect(sent.get('Connection')).toBe('close')
    for (const [name, value] of entries.filter(([name]) => name !== 'Connection')) expect(sent.get(name)).toBe(value)
    expect(new Headers(headers).get('Connection')).toBe('keep-alive')
  })
  it('preserves the default empty init while putting Connection close only on retry', async () => {
    fetcher.mockRejectedValueOnce(socketClose()).mockResolvedValueOnce(new Response('{}'))
    await internalReadFetch(url)
    expect(fetcher.mock.calls[0][1]).toEqual({})
    expect(new Headers(fetcher.mock.calls[1][1]?.headers).get('Connection')).toBe('close')
  })
  it('recognizes a bounded Error cause chain rather than requiring a direct cause', async () => {
    const error = socketClose()
    const inner = error.cause
    const wrapped = new TypeError('fetch failed', { cause: new Error('transport wrapper', { cause: inner }) })
    fetcher.mockRejectedValueOnce(wrapped).mockResolvedValueOnce(new Response('{}'))
    await internalReadFetch(url)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it.each([socketClose(), new Error('second failure'), new DOMException('aborted', 'AbortError')])('does not swallow or retry a second failure %#', async second => {
    fetcher.mockRejectedValueOnce(socketClose()).mockRejectedValueOnce(second)
    await expect(internalReadFetch(url)).rejects.toBe(second)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it.each([200, 301, 400, 401, 403, 404, 429, 500, 502, 503, 504])('never retries any received HTTP %s', async status => {
    const response = new Response('{}', { status })
    fetcher.mockResolvedValueOnce(response)
    expect(await internalReadFetch(url)).toBe(response)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it.each([401, 403, 404, 429, 500, 503])('returns a retry HTTP %s without a third attempt', async status => {
    const response = new Response('{}', { status })
    fetcher.mockRejectedValueOnce(socketClose()).mockResolvedValueOnce(response)
    expect(await internalReadFetch(url)).toBe(response)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  const timeout = Object.assign(new Error('timeout'), { name: 'ConnectTimeoutError', code: 'UND_ERR_CONNECT_TIMEOUT', cause: socketClose().cause })
  const unknownErrors: unknown[] = [
    new Error('offline'), new TypeError('fetch failed'), new TypeError('unknown', { cause: socketClose().cause }),
    new Error('fetch failed', { cause: socketClose().cause }), socketClose().cause,
    { message: 'fetch failed', cause: socketClose().cause },
    new TypeError('fetch failed', { cause: Object.assign(new Error('other side closed'), { code: 'UND_ERR_SOCKET' }) }),
    new TypeError('fetch failed', { cause: Object.assign(new Error('socket closed'), { name: 'SocketError', code: 'UND_ERR_SOCKET' }) }),
    new TypeError('fetch failed', { cause: Object.assign(new Error('other side closed'), { name: 'SocketError', code: 'ECONNRESET' }) }),
    new DOMException('aborted', 'AbortError'), new DOMException('deadline', 'TimeoutError'), timeout,
    new TypeError('fetch failed', { cause: timeout }),
    new TypeError('fetch failed', { cause: Object.assign(new Error('cancelled'), { name: 'AbortError', cause: socketClose().cause }) }),
    new TypeError('fetch failed', { cause: Object.assign(new Error('unexpected coded wrapper'), { code: 'UNKNOWN', cause: socketClose().cause }) }),
    new TypeError('fetch failed', { cause: Object.assign(socketClose().cause as Error, { cause: new Error('unknown inner failure') }) }),
    null, undefined, 'UND_ERR_SOCKET other side closed',
  ]
  it.each(unknownErrors.map((error, index) => ({ error, index })))('does not retry unknown, abort, timeout or non-matching failure $index', async ({ error }) => {
    fetcher.mockRejectedValueOnce(error)
    await expect(internalReadFetch(url)).rejects.toBe(error)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('bounds cyclic and over-depth cause chains without retry', async () => {
    const cycle = new TypeError('fetch failed') as TypeError & { cause?: unknown }
    cycle.cause = cycle
    let deep: unknown = socketClose().cause
    for (let n = 0; n < 10; n++) deep = new Error('wrapper', { cause: deep })
    for (const error of [cycle, new TypeError('fetch failed', { cause: deep })]) {
      fetcher.mockReset().mockRejectedValueOnce(error)
      await expect(internalReadFetch(url)).rejects.toBe(error)
      expect(fetcher).toHaveBeenCalledTimes(1)
    }
  })
  it.each([false, true])('does not retry when a supplied signal is aborted (initially: %s)', async initially => {
    const controller = new AbortController()
    if (initially) controller.abort()
    const error = socketClose()
    fetcher.mockImplementationOnce(async () => { controller.abort(); throw error })
    await expect(internalReadFetch(url, { signal: controller.signal })).rejects.toBe(error)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('never catches malformed JSON after an HTTP response', async () => {
    fetcher.mockResolvedValueOnce(new Response('{'))
    const response = await internalReadFetch(url)
    await expect(response.json()).rejects.toBeInstanceOf(SyntaxError)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('never consumes or retries a response-body socket failure', async () => {
    const error = socketClose()
    const json = vi.fn().mockRejectedValueOnce(error)
    const response = { ok: true, status: 200, json } as unknown as Response
    fetcher.mockResolvedValueOnce(response)
    expect(await internalReadFetch(url)).toBe(response)
    expect(json).not.toHaveBeenCalled()
    await expect(response.json()).rejects.toBe(error)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])('rejects %s before any fetch', async method => {
    await expect(internalReadFetch(url, { method })).rejects.toThrow('bodyless GET')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it.each(['', 'mutation', new URLSearchParams('key=value')])('rejects GET with a body %#', async body => {
    await expect(internalReadFetch(url, { body })).rejects.toThrow('bodyless GET')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it.each(['Cookie', 'cookie2', 'Authorization', 'Proxy-Authorization'])('rejects browser/auth %s rather than forwarding it', async name => {
    await expect(internalReadFetch(url, { headers: { [name]: 'private-secret' } })).rejects.toThrow('anonymous headers')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it.each([
    'https://public.invalid/api/companies/4', 'http://127.0.0.1:5001/api/context',
    'https://127.0.0.1:5000/api/context', 'http://127.0.0.1:5000/apiary',
    'http://127.0.0.1:5000/api/../../admin', 'http://127.0.0.1:5000/api/%2e%2e/admin',
    'http://user:private-secret@127.0.0.1:5000/api/context', '/api/context',
    'http://127.0.0.1:5000/api/context#secret', 'http://127.0.0.1:5000/api/context#',
    'not-a-url?private-secret', 'file:///api/context',
  ])('rejects untrusted/path/credential/fragment URL without I/O: %s', async invalid => {
    await expect(internalReadFetch(invalid)).rejects.toThrow('Invalid internal read URL')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('validates configured trusted origin, not a hardcoded or public fallback', async () => {
    vi.stubEnv('NEXT_INTERNAL_API_ORIGIN', 'http://localhost:5100')
    const response = new Response('{}')
    fetcher.mockResolvedValueOnce(response)
    expect(await internalReadFetch('http://localhost:5100/api?query=%23value')).toBe(response)
    await expect(internalReadFetch(url)).rejects.toThrow('Invalid internal read URL')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('never logs failures or echoes invalid URL/configuration secrets', async () => {
    const logs = ['log', 'error', 'warn', 'info', 'debug'].map(name => vi.spyOn(console, name as 'log').mockImplementation(() => {}))
    const invalid = 'http://user:private-secret@127.0.0.1:5000/api?token=query-secret'
    await expect(internalReadFetch(invalid)).rejects.toThrow(/^Invalid internal read URL$/)
    vi.stubEnv('NEXT_INTERNAL_API_ORIGIN', invalid)
    await expect(internalReadFetch(url)).rejects.toThrow(/^Invalid internal read URL$/)
    vi.unstubAllEnvs()
    const error = new Error('original upstream failure containing private-secret')
    fetcher.mockRejectedValueOnce(socketClose()).mockRejectedValueOnce(error)
    await expect(internalReadFetch(url)).rejects.toBe(error)
    for (const log of logs) expect(log).not.toHaveBeenCalled()
  })
})

describe('real Node/undici loopback transport', () => {
  it('recovers one server-side socket close before any response using a close-only retry', async () => {
    const { createServer } = await import('node:http')
    vi.unstubAllGlobals()
    const nativeFetch = globalThis.fetch
    const connections: (string | undefined)[] = []
    const failures: unknown[] = []
    const server = createServer((request, response) => {
      connections.push(request.headers.connection)
      if (connections.length === 1) { request.socket.destroy(); return }
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end('{"recovered":true}')
    })
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
    try {
      const address = server.address() as { port: number }
      vi.stubEnv('NEXT_INTERNAL_API_ORIGIN', `http://127.0.0.1:${address.port}`)
      fetcher.mockImplementation(async (input, init) => {
        try { return await nativeFetch(input, init) } catch (error) { failures.push(error); throw error }
      })
      vi.stubGlobal('fetch', fetcher)
      const response = await internalReadFetch(`http://127.0.0.1:${address.port}/api/context`, { cache: 'no-store', redirect: 'error' })
      expect(await response.json()).toEqual({ recovered: true })
      expect(fetcher).toHaveBeenCalledTimes(2)
      expect(failures).toHaveLength(1)
      expect(failures[0]).toBeInstanceOf(TypeError)
      expect(failures[0]).toMatchObject({ message: 'fetch failed', cause: { name: 'SocketError', message: 'other side closed', code: 'UND_ERR_SOCKET' } })
      expect(connections).toEqual(['keep-alive', 'close'])
    } finally {
      server.closeAllConnections()
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    }
  }, 10_000)
})
