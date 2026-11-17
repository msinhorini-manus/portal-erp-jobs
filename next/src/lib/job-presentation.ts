import { regionalizePath } from './regional-routes'

export type JobCompanyFields = {
  is_company_hidden?: boolean | null
  company_name?: string | null
  company_id?: number | null
  company_profile_slug?: string | null
  public_company_slug?: string | null
  company_logo_url?: string | null
  company_description?: string | null
  company_website?: string | null
  company?: {
    company_name?: string | null
    name?: string | null
    logo_url?: string | null
    description?: string | null
    website?: string | null
  } | null
}

/** Enforce confidentiality before metadata, schema or client component props. */
export function sanitizeJobCompany<T extends JobCompanyFields>(job: T): T {
  if (!job.is_company_hidden) return job
  return {
    ...job,
    company_name: 'Empresa Confidencial',
    company: null,
    company_id: null,
    company_profile_slug: null,
    public_company_slug: 'empresa-confidencial',
    company_logo_url: null,
    company_description: null,
    company_website: null,
  }
}

/** A small public projection: never pass a raw organization to a client logo. */
export function jobEmployer(job: JobCompanyFields) {
  if (job.is_company_hidden) {
    return { name: 'Empresa Confidencial', logo: null, description: null, hidden: true }
  }
  return {
    name: job.company_name || job.company?.company_name || job.company?.name || null,
    logo: job.company?.logo_url ?? job.company_logo_url ?? null,
    description: job.company?.description ?? job.company_description ?? null,
    hidden: false,
  }
}

export function hasJobText(text?: string | null): text is string {
  return typeof text === 'string' && text.trim().length > 0
}

/** Only explicit, complete bullet lists become lists; prose stays verbatim.
 * Mixed prose, numbered steps and continuation lines conservatively remain text.
 * There is deliberately no item limit, summarization or semantic splitting.
 */
export function jobBulletItems(text?: string | null): string[] | null {
  if (!hasJobText(text)) return null
  const lines = text.split(/\r\n|\n|\r/).filter(line => line.trim().length > 0)
  const items: string[] = []
  for (const line of lines) {
    const match = line.match(/^\s*[-*+•●▪‣]\s+(.+)$/)
    if (!match || !match[1].trim()) return null
    items.push(match[1])
  }
  return items.length ? items : null
}

/** Same-region paths only. Login and registration already accept this return URL. */
export function jobCandidateLinks(prefix: string, jobPath: string) {
  const returnPath = regionalizePath(prefix, jobPath)
  if (!returnPath.startsWith(`${prefix}/`) || returnPath.includes('?') || returnPath.includes('#')) {
    throw new Error('Invalid job return path')
  }
  const query = `?redirect=${encodeURIComponent(returnPath)}`
  return {
    login: `${regionalizePath(prefix, '/candidato/login')}${query}`,
    register: `${regionalizePath(prefix, '/candidato/cadastro')}${query}`,
  }
}

/** Hide standalone external-application instructions only in the presentation.
 * The original job record and all role requirements remain untouched.
 */
export function jobDisplayDescription(text?: string | null): string {
  if (typeof text !== 'string') return ''
  const lines = text.split(/(?<=\n)/)
  return lines.filter(line => {
    const match = line.trim().match(/^(?:candidatura|candidate-se|inscri[çc][ãa]o|apply)\s*:\s*(https?:\/\/\S+)\s*$/i)
    if (!match) return true
    try {
      const host = new URL(match[1]).hostname.toLowerCase()
      return host === 'jobs.portalerp.com' || host === 'jobs.portalerp.com.br'
    } catch {
      return true
    }
  }).join('')
}
