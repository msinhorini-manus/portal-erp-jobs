import 'next/dist/compiled/server-only'
import { randomUUID } from 'node:crypto'
import type { NextRequest } from 'next/server'

export type RegionalObservation = Readonly<{ readonly regionalObservation: unique symbol }>
type Phase = 'fetch' | 'http' | 'json' | 'validation'
type Emitter = 'internal-read-fetch' | 'regional-proxy'
type Event = 'failure' | 'recovered'
type PathClass = 'root' | 'regional-jobs' | 'regional-home' | 'regional-other'
type ErrorShape = { name: string; code: string | null }
type State = {
  id: string; path_class: PathClass; country_class: 'BR' | 'inactive'; rsc: boolean; prefetch: boolean
  started: number; attemptStarted: number; attempt: 1 | 2
}
const observations = new WeakMap<RegionalObservation, State>()
const names = new Set(['Error', 'TypeError', 'SyntaxError', 'SocketError', 'ResponseContentLengthMismatchError', 'AbortError', 'TimeoutError', 'ConnectTimeoutError', 'HeadersTimeoutError', 'BodyTimeoutError'])
const codes = new Set(['UND_ERR_SOCKET', 'UND_ERR_RES_CONTENT_LENGTH_MISMATCH', 'ECONNRESET', 'ECONNREFUSED', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'UND_ERR_ABORTED', 'ABORT_ERR'])
const MAX_MS = 600_000
let sequence = 0

function now(): number {
  try { const value = performance.now(); return Number.isFinite(value) ? value : 0 } catch { return 0 }
}

/** Data descriptors only: never execute an error getter, toJSON or coercion hook. */
function dataValue(value: object, key: string, inherited = false): unknown {
  try {
    let current: object | null = value
    for (let depth = 0; current && depth < (inherited ? 4 : 1); depth++) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key)
      if (descriptor) return Object.prototype.hasOwnProperty.call(descriptor, 'value') ? descriptor.value : undefined
      current = inherited ? Object.getPrototypeOf(current) : null
    }
  } catch { /* Proxies and exotic objects cannot escape observation. */ }
  return undefined
}

export function regionalErrorChain(error: unknown): ErrorShape[] {
  const chain: ErrorShape[] = []
  try {
    const seen = new Set<object>()
    let current: unknown = error
    for (let depth = 0; depth < 3; depth++) {
      if (!current || typeof current !== 'object') {
        if (depth === 0) chain.push({ name: 'Other', code: null })
        break
      }
      if (seen.has(current)) break
      seen.add(current)
      const name = dataValue(current, 'name', true)
      const code = dataValue(current, 'code')
      chain.push({ name: typeof name === 'string' && names.has(name) ? name : 'Other', code: code === undefined ? null : typeof code === 'string' && codes.has(code) ? code : 'Other' })
      current = dataValue(current, 'cause')
    }
  } catch { /* No arbitrary object is ever serialized. */ }
  return chain
}

/** BR context requests plus the MX/CO inactive controls; never infer identity from an ID header. */
export function regionalObservationFor(request: NextRequest): RegionalObservation | undefined {
  try {
    const pathname = request.nextUrl.pathname
    const country = pathname.split('/')[1]
    if (!['br', 'mx', 'co'].includes(country)) return undefined
    const path_class: PathClass = pathname === '/' ? 'root' : pathname === `/${country}` || pathname === `/${country}/` ? 'regional-home' : pathname === `/${country}/vagas` || pathname.startsWith(`/${country}/vagas/`) ? 'regional-jobs' : 'regional-other'
    const rsc = request.headers.get('rsc') === '1'
    const prefetch = request.headers.has('next-router-prefetch') || request.headers.get('purpose') === 'prefetch' || request.headers.get('sec-purpose')?.includes('prefetch') === true
    const started = now()
    sequence = sequence >= 2_176_782_335 ? 1 : sequence + 1
    const observation = Object.freeze({}) as RegionalObservation
    observations.set(observation, { id: `${randomUUID().replaceAll('-', '').slice(0, 12)}-${sequence.toString(36)}`, path_class, country_class: country === 'br' ? 'BR' : 'inactive', rsc, prefetch, started, attemptStarted: started, attempt: 1 })
    return observation
  } catch { return undefined }
}

/** Opt-in is confined to the already-validated bodyless anonymous GET /api/context, no-store. */
export function contextReadObservation(observation: RegionalObservation | undefined, pathname: string, search: string, cache: RequestCache | undefined): RegionalObservation | undefined {
  try { return pathname === '/api/context' && search === '' && cache === 'no-store' && observation && observations.has(observation) ? observation : undefined } catch { return undefined }
}

export function regionalAttempt(observation: RegionalObservation | undefined, attempt: 1 | 2): void {
  try {
    const state = observation && observations.get(observation)
    if (state && (attempt === 1 || attempt === 2)) { state.attempt = attempt; state.attemptStarted = now() }
  } catch { /* Diagnostics must never alter transport. */ }
}

/** Closed v1 schema, failures only; recovered means fetch headers after the existing first-close retry. */
export function regionalDiagnostic(observation: RegionalObservation | undefined, emitter: Emitter, phase: Phase, event: Event, status?: number, error?: unknown): void {
  try {
    const state = observation && observations.get(observation)
    if (!state || !['internal-read-fetch', 'regional-proxy'].includes(emitter) || !['fetch', 'http', 'json', 'validation'].includes(phase) || !['failure', 'recovered'].includes(event)) return
    if (event === 'recovered' && (emitter !== 'internal-read-fetch' || phase !== 'fetch' || state.attempt !== 2)) return
    const elapsed = now() - (emitter === 'internal-read-fetch' ? state.attemptStarted : state.started)
    const record = {
      v: 1, op: 'regional-context', request_id: state.id, emitter, phase, event,
      path_class: state.path_class, country_class: state.country_class, rsc: state.rsc, prefetch: state.prefetch,
      attempt: state.attempt, status: typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599 ? status : null,
      duration_ms: Number.isFinite(elapsed) ? Math.min(MAX_MS, Math.max(0, Math.round(elapsed))) : 0,
      error_chain: arguments.length < 6 ? [] : regionalErrorChain(error),
    }
    console.log(`JOBS_REGIONAL_DIAG ${JSON.stringify(record)}`)
  } catch { /* Includes serialization and stdout failures; do not report the logger's error. */ }
}
