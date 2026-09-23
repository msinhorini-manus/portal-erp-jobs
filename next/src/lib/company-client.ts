export type CompanySession = {
  id: number
  email: string
  user_type: 'company'
  company_id?: number
  company_name?: string
  site_code: string
  site_status?: CompanyStatus
}

export type CompanyStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type CompanyRole = 'owner' | 'admin' | 'hr' | 'viewer'

export type CompanyProfile = {
  id: number
  user_id?: number
  company_name: string
  cnpj?: string
  description?: string
  website?: string
  logo_url?: string
  company_size?: string
  sector?: string
  phone?: string
  street_address?: string
  city?: string
  state?: string
  country?: string
  zip_code?: string
  status: CompanyStatus
  max_active_jobs: number
  site_code: string
}

export type CompanyMembership = {
  company_id: number
  site_code: string
  status: CompanyStatus
  is_member: boolean
  max_active_jobs: number
  approval_reason?: string
}

export type CompanyUserIdentity = {
  id: number
  user_id: number
  role: CompanyRole
  name: string
  position?: string
  is_active: boolean
  invitation_accepted: boolean
}

export type CompanyProfileResponse = {
  company: CompanyProfile
  membership?: CompanyMembership
  companyUser?: CompanyUserIdentity
  message?: string
}

const LEGACY_COMPANY_KEYS = ['authToken', 'refreshToken', 'userType', 'userId', 'companyData', 'companyId', 'companyName', 'companyUsers']

export function clearLegacyCompanySession() {
  if (typeof window === 'undefined') return
  const storage = window.localStorage
  const isCompany = storage.getItem('userType') === 'company'
  if (!isCompany) {
    storage.removeItem('companyData')
    storage.removeItem('companyId')
    storage.removeItem('companyName')
    storage.removeItem('companyUsers')
    return
  }
  for (const key of LEGACY_COMPANY_KEYS) storage.removeItem(key)
}

export function safeCompanyReturnPath(value: string | null, fallback = '/empresa/dashboard') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || !value.startsWith('/empresa/')) return fallback
  return value
}

function readCookie(name: string) {
  if (typeof document === 'undefined') return ''
  const prefix = `${encodeURIComponent(name)}=`
  return document.cookie.split('; ').find(value => value.startsWith(prefix))?.slice(prefix.length) || ''
}

export async function companyFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers.set('X-CSRF-Token', decodeURIComponent(readCookie('pej_company_csrf')))
  }
  const response = await fetch(path, { ...init, headers, credentials: 'same-origin', cache: 'no-store' })
  const payload = await response.json().catch(() => ({})) as T & { error?: string; message?: string }
  if (!response.ok) {
    const error = new Error(payload.error || payload.message || 'Não foi possível concluir a operação.')
    Object.assign(error, { status: response.status, payload })
    throw error
  }
  return payload
}

export function companyAuthPath(path: string) {
  return `/bff/company/auth/${path}`
}

export function companyPath(path: string, query?: URLSearchParams) {
  const suffix = query?.toString()
  return `/bff/company/${path}${suffix ? `?${suffix}` : ''}`
}

export function normalizeCompanyProfile(payload: Record<string, unknown>): CompanyProfileResponse {
  const nested = payload.company && typeof payload.company === 'object' ? payload.company as Record<string, unknown> : payload
  const membership = (payload.membership || nested.membership) as CompanyMembership | undefined
  const companyUser = (payload.companyUser || payload.company_user || nested.company_user) as CompanyUserIdentity | undefined
  return {
    company: nested as CompanyProfile,
    membership,
    companyUser,
    message: typeof payload.message === 'string' ? payload.message : undefined,
  }
}

export function statusLabel(status?: CompanyStatus) {
  return ({ approved: 'Aprovada', pending: 'Em análise', rejected: 'Rejeitada', suspended: 'Suspensa' } as Record<string, string>)[status || ''] || 'Não informado'
}
