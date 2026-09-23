export type CompanyJob = {
  id: number
  title: string
  description?: string
  requirements?: string
  responsibilities?: string
  benefits?: string
  area?: string
  area_id?: number | null
  seniority_level?: string
  work_modality?: string
  contract_type?: string
  min_salary?: number | null
  max_salary?: number | null
  salary?: string
  salary_currency?: string
  city?: string
  state?: string
  country?: string
  location?: string
  is_active: boolean
  status?: string
  is_featured?: boolean
  applications_count?: number
  created_at?: string
  updated_at?: string
  skills?: string[]
  skill_ids?: number[]
  skills_detailed?: Array<{ skill_id: number; skill_name?: string; is_required?: boolean; proficiency_level?: number }>
}

export type CompanyApplication = {
  id: number
  job_id: number
  candidate_id: number
  status: string
  applied_at?: string
  updated_at?: string
  candidate?: CompanyCandidate
  job?: { id: number; title: string; city?: string; state?: string; work_modality?: string }
}

export type CompanyCandidate = {
  id: number
  full_name?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  city?: string
  state?: string
  current_title?: string
  professional_summary?: string
  years_experience?: number
  photo_url?: string
  linkedin_url?: string
  github_url?: string
  portfolio_url?: string
  expected_salary?: number
  salary_currency?: string
  experiences?: unknown[]
  educations?: unknown[]
  skills?: Array<string | { name?: string; skill_name?: string }>
  certifications?: unknown[]
  projects?: unknown[]
  languages?: unknown[]
}

export type Paginated<T> = { total: number; pages: number; current_page: number; per_page: number } & T
