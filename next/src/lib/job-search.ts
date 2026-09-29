export type SearchParamValue = string | string[] | undefined
export type JobSearchParams = Record<string, SearchParamValue>

function first(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] || '' : value || ''
}

export function readJobSearchParam(params: JobSearchParams, key: string) {
  return first(params[key]).trim()
}

export function buildJobApiParams(params: JobSearchParams) {
  const api: Record<string, string> = {}
  const direct = ['q', 'area', 'tech', 'location', 'level', 'work_mode', 'employment_type', 'company_id', 'page', 'per_page']
  for (const key of direct) {
    const value = readJobSearchParam(params, key)
    if (value) api[key] = value
  }

  const salary = readJobSearchParam(params, 'salary')
  const match = salary.match(/^(\d+)-(\d+)$/)
  if (match) {
    api.salary_min_exact = match[1]
    api.salary_max_exact = match[2]
  }

  const minSalary = readJobSearchParam(params, 'min_salary')
  const maxSalary = readJobSearchParam(params, 'max_salary')
  if (minSalary) api.min_salary = minSalary
  if (maxSalary) api.max_salary = maxSalary
  return api
}

export function jobSearchUrl(params: JobSearchParams, overrides: Record<string, string | number | undefined> = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    const normalized = first(value).trim()
    if (normalized) query.set(key, normalized)
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === '') query.delete(key)
    else query.set(key, String(value))
  }
  const encoded = query.toString()
  return encoded ? `/vagas?${encoded}` : '/vagas'
}
