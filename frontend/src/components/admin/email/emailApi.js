import { appFetch } from '@/lib/regional-runtime.js'

const EMAIL_API_BASE = '/api/admin/emails'

function authHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
    'Content-Type': 'application/json',
  }
}

async function request(path, options = {}) {
  const response = await appFetch(`${EMAIL_API_BASE}${path}`, {
    cache: 'no-store',
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  })
  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }
  if (!response.ok) {
    const error = new Error(payload?.error || `Não foi possível concluir a operação (${response.status}).`)
    error.status = response.status
    error.payload = payload
    throw error
  }
  return payload || {}
}

export const emailApi = {
  getCapabilities(signal) {
    return request('/capabilities', { signal })
  },
  getTemplates(signal) {
    return request('/templates', { signal })
  },
  saveDraft(locale, body, signal) {
    return request(`/templates/${encodeURIComponent(locale)}/draft`, {
      method: 'PUT',
      body: JSON.stringify(body),
      signal,
    })
  },
  preview(locale, body, signal) {
    return request(`/templates/${encodeURIComponent(locale)}/preview`, {
      method: 'POST',
      body: JSON.stringify(body),
      signal,
    })
  },
  publish(locale, revision, signal) {
    return request(`/templates/${encodeURIComponent(locale)}/publish`, {
      method: 'POST',
      body: JSON.stringify({ revision }),
      signal,
    })
  },
  inactivate(locale, revision, signal) {
    return request(`/templates/${encodeURIComponent(locale)}/inactivate`, {
      method: 'POST',
      body: JSON.stringify({ revision }),
      signal,
    })
  },
  restore(locale, revision, version, signal) {
    return request(`/templates/${encodeURIComponent(locale)}/restore`, {
      method: 'POST',
      body: JSON.stringify({ revision, version }),
      signal,
    })
  },
  getVersions(locale, signal) {
    return request(`/templates/${encodeURIComponent(locale)}/versions`, { signal })
  },
  getRules(signal) {
    return request('/rules', { signal })
  },
  getHistory(signal) {
    return request('/history', { signal })
  },
}

export function isPermissionError(error) {
  return error?.status === 401 || error?.status === 403
}

export function isConflictError(error) {
  return error?.status === 409
}
