export function validPublicCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

export function countLanguage(locale = 'pt-BR'): 'pt' | 'en' | 'es' {
  const language = locale.toLowerCase().split(/[-_]/)[0]
  return language === 'en' || language === 'es' ? language : 'pt'
}

export function countLabels(locale = 'pt-BR') {
  const language = countLanguage(locale)
  return {
    pt: { unavailable: 'Quantidade indisponível', heading: 'Oportunidades e talentos', scope: 'Números deste país', jobs: 'Vagas ativas', companies: 'Empresas cadastradas', candidates: 'Candidatos cadastrados', companiesNote: 'Empresas aprovadas com perfil público', candidatesNote: 'Contas ativas · somente total agregado', jobsNote: 'Vagas disponíveis para candidatura' },
    en: { unavailable: 'Count unavailable', heading: 'Opportunities and talent', scope: 'Figures for this country', jobs: 'Active jobs', companies: 'Registered companies', candidates: 'Registered candidates', companiesNote: 'Approved companies with a public profile', candidatesNote: 'Active accounts · aggregate count only', jobsNote: 'Jobs open for applications' },
    es: { unavailable: 'Cantidad no disponible', heading: 'Oportunidades y talento', scope: 'Cifras de este país', jobs: 'Vacantes activas', companies: 'Empresas registradas', candidates: 'Candidatos registrados', companiesNote: 'Empresas aprobadas con perfil público', candidatesNote: 'Cuentas activas · solo cifra agregada', jobsNote: 'Vacantes abiertas para postulaciones' },
  }[language]
}

export function formattedPublicCount(value: unknown, locale = 'pt-BR'): string {
  if (!validPublicCount(value)) return '—'
  const safeLocale = countLanguage(locale) === 'pt' ? 'pt-BR' : countLanguage(locale) === 'es' ? 'es' : 'en'
  return new Intl.NumberFormat(safeLocale, { maximumFractionDigits: 0 }).format(value)
}

/** A missing count is not zero. Categories follow their public search links. */
export function jobCountLabel(value: unknown, locale = 'pt-BR'): string {
  if (!validPublicCount(value)) return countLabels(locale).unavailable
  const n = formattedPublicCount(value, locale)
  const language = countLanguage(locale)
  if (language === 'en') return `${n} active ${value === 1 ? 'job' : 'jobs'}`
  if (language === 'es') return `${n} ${value === 1 ? 'vacante activa' : 'vacantes activas'}`
  return `${n} ${value === 1 ? 'vaga ativa' : 'vagas ativas'}`
}
