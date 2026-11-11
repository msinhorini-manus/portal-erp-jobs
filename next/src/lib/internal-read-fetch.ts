import { internalApiOrigin } from './regional-transport'

export type InternalReadInit = RequestInit & { next?: { revalidate?: number; tags?: string[] } }

/** Only the observed pre-response undici close qualifies; never classify by message alone. */
function isPreResponseSocketClose(error: unknown): boolean {
  if (!(error instanceof TypeError) || error.message !== 'fetch failed') return false
  const seen = new Set<Error>()
  let current: unknown = error
  for (let depth = 0; depth < 8; depth++) {
    if (!(current instanceof Error) || seen.has(current)) return false
    seen.add(current)
    const node = current as Error & { code?: unknown; cause?: unknown }
    if (node.code === 'UND_ERR_SOCKET') {
      return node.name === 'SocketError' && node.message === 'other side closed' && node.cause === undefined
    }
    // Aborts, timeouts and other coded/typed failures must not hide behind a socket cause.
    if (node.code !== undefined || !['Error', 'TypeError'].includes(node.name)) return false
    current = node.cause
  }
  return false
}

/**
 * Anonymous trusted internal GET only. No browser headers, fallback, cache changes,
 * logging or response-body consumption. Callers retain their existing HTTP/JSON handling.
 */
export async function internalReadFetch(url: string, init: InternalReadInit = {}): Promise<Response> {
  let target: URL
  try {
    target = new URL(url)
    if (target.origin !== internalApiOrigin() || !/^\/api(?:\/|$)/.test(target.pathname) || target.username || target.password || url.includes('#')) throw new Error()
  } catch {
    // Do not echo URLs/configuration: they may include credentials or query values.
    throw new Error('Invalid internal read URL')
  }
  if ((init.method || 'GET').toUpperCase() !== 'GET' || init.body != null) throw new Error('Internal read requires a bodyless GET')
  const headers = new Headers(init.headers)
  if (['authorization', 'proxy-authorization', 'cookie', 'cookie2'].some(name => headers.has(name))) throw new Error('Internal read requires anonymous headers')

  try {
    return await fetch(url, init)
  } catch (error) {
    if (init.signal?.aborted || !isPreResponseSocketClose(error)) throw error
  }
  // Disable connection reuse on the retry only. Clone headers; preserve every other
  // option (including no-store, regional headers, tags, signal and redirect: error).
  headers.set('Connection', 'close')
  return fetch(url, { ...init, headers })
}
