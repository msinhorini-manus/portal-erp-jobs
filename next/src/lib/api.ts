const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://jobs.portalerp.com.br/api'

export async function fetchAPI(endpoint: string, options?: RequestInit) {
  const url = `${API_BASE}${endpoint}`
  const res = await fetch(url, {
    ...options,
    next: { revalidate: 60 }, // Cache por 60 segundos
  })
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

// Áreas de Atuação
export async function getAreas() {
  return fetchAPI('/config/areas')
}

// Tecnologias
export async function getTechnologies() {
  return fetchAPI('/config/technologies')
}

// Vagas
export async function getJobs(params?: Record<string, string>) {
  const searchParams = params ? '?' + new URLSearchParams(params).toString() : ''
  return fetchAPI(`/jobs/${searchParams}`)
}

export async function getJobById(id: string) {
  return fetchAPI(`/jobs/${id}`)
}

// Empresas
export async function getCompanies() {
  return fetchAPI('/companies/search')
}

export async function getCompanyById(id: string) {
  return fetchAPI(`/companies/${id}`)
}

// Config geral
export async function getLevels() {
  return fetchAPI('/config/levels')
}

export async function getModalities() {
  return fetchAPI('/config/modalities')
}
