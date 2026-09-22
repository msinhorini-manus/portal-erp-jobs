export type CandidateSession = {
  id: number
  email: string
  user_type: 'candidate'
  site_code: string
  candidate?: {
    id: number
    full_name: string
    is_discoverable: boolean
  }
}

export function clearLegacyCandidateSession() {
  if (typeof window === 'undefined') return
  if (window.localStorage.getItem('userType') === 'candidate') {
    for (const key of ['authToken', 'refreshToken', 'userType', 'userId']) {
      window.localStorage.removeItem(key)
    }
  }
}

export function safeReturnPath(value: string | null, fallback = '/candidato/dashboard') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}

function readCookie(name: string) {
  if (typeof document === 'undefined') return ''
  const prefix = `${encodeURIComponent(name)}=`
  return document.cookie
    .split('; ')
    .find(value => value.startsWith(prefix))
    ?.slice(prefix.length) || ''
}

export async function candidateFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers.set('X-CSRF-Token', decodeURIComponent(readCookie('pej_csrf')))
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => ({})) as T & { error?: string; message?: string }
  if (!response.ok) {
    const error = new Error(payload.error || payload.message || 'Não foi possível concluir a operação.')
    Object.assign(error, { status: response.status, payload })
    throw error
  }
  return payload
}

export function authPath(path: string) {
  return `/bff/auth/${path}`
}

export function candidatePath(path: string) {
  return `/bff/candidate/${path}`
}
