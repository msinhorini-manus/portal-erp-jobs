import { publicJobCompanyPath } from '@/lib/public-company-url'
import { requireCanonicalOrigin } from '@/lib/site'
import { Metadata } from 'next'
import Link from '@/components/RegionalLink'
import { notFound } from 'next/navigation'
import { getJobById } from '@/lib/api'
import { MapPin, Building2, Briefcase, Users, ArrowLeft, ArrowRight, FileText, ListChecks, Gift, Send, Code2, ChartNoAxesColumnIncreasing, type LucideIcon } from 'lucide-react'
import { ApplyButton } from '@/components/ApplyButton'
import { EmployerLogo } from '@/components/EmployerLogo'
import { JobText } from '@/components/JobText'
import { hasJobText, jobCandidateLinks, jobDisplayDescription, jobEmployer, sanitizeJobCompany } from '@/lib/job-presentation'
import { regionalizePath } from '@/lib/regional-routes'
import { getSiteContext } from '@/lib/site-resolver.server'
import { openGraphLocale } from '@/lib/site'
import { assertPublicRegionalJob, canonicalJobId, jobCollection, publicJobCanonical, publicJobPath } from '@/lib/public-job-url'

type Props = {
  params: Promise<{ country: string; id: string; collection: string; companySlug: string; titleSlug: string }>
}

async function loadPublicJob(params: Props['params']) {
  const { country, id, collection, companySlug, titleSlug } = await params
  const jobId = canonicalJobId(id)
  const context = await getSiteContext(country)
  if (collection !== jobCollection(context.site.locale)) notFound()
  const raw = await getJobById(jobId, { country, context, cache: 'no-store' })
  assertPublicRegionalJob(raw, context.site, jobId)
  const requestedPath = `${context.site.url_prefix}/${collection}/${companySlug}/${titleSlug}/${id}`
  if (requestedPath !== publicJobPath(raw, context.site)) notFound()
  // This boundary is authoritative even if the backend returns an unsanitized DTO.
  const job = { ...sanitizeJobCompany(raw), description: jobDisplayDescription(raw.description) }
  return { job, site: context.site }
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { job, site } = await loadPublicJob(params)
    const canonical = publicJobCanonical(job, site)
    return {
      title: `${job.title} - ${job.company_name || 'Jobs by Portal ERP'}`,
      description: job.description?.substring(0, 160) || `Vaga de ${job.title} no Jobs by Portal ERP`,
      alternates: { canonical },
      openGraph: {
        title: `${job.title} - ${job.company_name || ''}`,
        description: job.description?.substring(0, 160),
        type: 'article', url: canonical, locale: openGraphLocale(site),
      },
    }
  } catch { return { title: 'Vaga não encontrada', robots: { index: false, follow: false } } }
}

function SectionHeading({ title, icon: Icon, id }: { title: string; icon: LucideIcon; id?: string }) {
  return (
    <div className="mb-4 flex items-center gap-4">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 id={id} className="font-display text-lg font-bold leading-snug text-portal-dark sm:text-xl">{title}</h2>
    </div>
  )
}

export default async function JobDetailPage({ params }: Props) {
  let data: Awaited<ReturnType<typeof loadPublicJob>>
  try { data = await loadPublicJob(params) } catch { notFound() }
  const { job, site } = data
  const canonical = publicJobCanonical(job, site)
  const jobPath = publicJobPath(job, site)
  const companyPath = publicJobCompanyPath(job, site)
  const companyCanonical = companyPath ? `${requireCanonicalOrigin(site)}${companyPath}` : null
  const employer = jobEmployer(job)
  const candidateLinks = jobCandidateLinks(site.url_prefix, jobPath)
  const jobsPath = `${site.url_prefix}/${jobCollection(site.locale)}`
  const modalityLabel: Record<string, string> = {
    remote: 'Remoto', hybrid: 'Híbrido', onsite: 'Presencial',
  }
  const levelLabel: Record<string, string> = {
    junior: 'Júnior', pleno: 'Pleno', senior: 'Sênior', tech_lead: 'Tech Lead', manager: 'Gerente',
  }
  const contractLabel: Record<string, string> = {
    clt: 'CLT', pj: 'PJ', contractor: 'Contrato', internship: 'Estágio', estágio: 'Estágio', part_time: 'Meio período', temporary: 'Temporário',
  }
  const formatSalary = (value?: number) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
    const currency = job.salary_currency || 'BRL'
    try { return new Intl.NumberFormat(site.locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value) }
    catch { return `${currency} ${value.toLocaleString(site.locale)}` }
  }
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  }
  const employmentType: Record<string, string> = {
    clt: 'FULL_TIME', pj: 'CONTRACTOR', contractor: 'CONTRACTOR', internship: 'INTERN', estágio: 'INTERN', part_time: 'PART_TIME', temporary: 'TEMPORARY',
  }
  const minSalary = job.min_salary ?? job.salary_min
  const maxSalary = job.max_salary ?? job.salary_max
  const salary = [formatSalary(minSalary), formatSalary(maxSalary)].filter(Boolean).join(' – ')
  const published = formatDate(job.created_at)
  const organization = job.company || {}
  const jobPosting: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: [job.description, job.requirements && `Requisitos: ${job.requirements}`, job.responsibilities && `Responsabilidades: ${job.responsibilities}`].filter(Boolean).join('\n\n'),
    identifier: { '@type': 'PropertyValue', name: 'Jobs by Portal ERP', value: String(job.id) },
    datePosted: job.created_at,
    ...(job.expires_at ? { validThrough: job.expires_at } : {}),
    employmentType: employmentType[String(job.contract_type || '').toLocaleLowerCase()] || job.contract_type,
    hiringOrganization: {
      '@type': 'Organization',
      ...(companyCanonical ? { '@id': `${companyCanonical}#organization`, url: companyCanonical } : {}),
      name: employer.name,
      ...(organization.website ? { sameAs: organization.website } : {}),
      ...(employer.logo ? { logo: employer.logo } : {}),
    },
    directApply: true,
    url: canonical,
    ...(job.work_modality === 'remote' ? {
      jobLocationType: 'TELECOMMUTE',
      applicantLocationRequirements: { '@type': 'Country', name: job.country || 'Brasil' },
    } : {
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: job.city,
          addressRegion: job.state,
          addressCountry: job.country || 'BR',
        },
      },
    }),
    ...((minSalary || maxSalary) ? {
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: job.salary_currency || 'BRL',
        value: { '@type': 'QuantitativeValue', minValue: minSalary || undefined, maxValue: maxSalary || undefined, unitText: 'MONTH' },
      },
    } : {}),
    ...(job.skills?.length ? { skills: job.skills.join(', ') } : {}),
    ...(job.area ? { industry: job.area } : {}),
  }
  const cardClass = 'min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6'
  const information = [
    ['Contrato', job.contract_type && (contractLabel[String(job.contract_type).toLowerCase()] || job.contract_type)],
    ['Área', job.area],
    ['Modalidade', job.work_modality && (modalityLabel[job.work_modality] || job.work_modality)],
    ['Nível', job.seniority_level && (levelLabel[job.seniority_level] || job.seniority_level)],
    ['Localização', job.location],
  ].filter(([, value]) => Boolean(value))

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPosting).replace(/</g, '\\u003c') }} />
      <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-6">
        <nav aria-label="Navegação estrutural" className="mb-5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <Link href={regionalizePath(site.url_prefix, '/')} className="hover:text-portal-dark">Início</Link>
          <span aria-hidden="true">/</span>
          <Link href={jobsPath} className="hover:text-portal-dark">Vagas</Link>
          {job.area && <><span aria-hidden="true">/</span><span className="break-words">{job.area}</span></>}
        </nav>
        <Link href={jobsPath} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-portal-dark">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para vagas
        </Link>

        <section aria-labelledby="job-title" className="relative overflow-hidden rounded-2xl bg-portal-dark px-5 py-7 text-white sm:px-8 sm:py-9">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-36 h-96 w-96 rounded-full border-[48px] border-white/[0.03]" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -right-20 h-80 w-80 rounded-full bg-teal-500/[0.06]" />
          <div className="relative flex min-w-0 flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-7">
            <EmployerLogo name={employer.name} src={employer.logo} hidden={employer.hidden} size="hero" />
            <div className="min-w-0 flex-1">
              {employer.name && (
                <p className="mb-2 break-words font-semibold text-white/90">
                  {companyPath ? <Link href={companyPath} className="underline decoration-white/40 underline-offset-4 hover:decoration-white">{employer.name}</Link> : employer.name}
                </p>
              )}
              <h1 id="job-title" className="break-words font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-[2.5rem]">{job.title}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-white/85">
                {job.location && <span className="flex min-w-0 items-center gap-2"><MapPin className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="break-words">{job.location}</span></span>}
                {job.work_modality && <span className="rounded-full bg-white/10 px-4 py-1">{modalityLabel[job.work_modality] || job.work_modality}</span>}
                {job.contract_type && <span className="flex items-center gap-2"><Briefcase className="h-4 w-4 shrink-0" aria-hidden="true" />{contractLabel[String(job.contract_type).toLowerCase()] || job.contract_type}</span>}
                {job.seniority_level && <span className="flex items-center gap-2"><ChartNoAxesColumnIncreasing className="h-4 w-4 shrink-0" aria-hidden="true" />{levelLabel[job.seniority_level] || job.seniority_level}</span>}
              </div>
              {published && <p className="mt-4 text-xs text-white/65">Publicada em {published}</p>}
            </div>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-6">
          <div className="min-w-0 space-y-5">
            <section className={cardClass} aria-labelledby="job-about">
              <SectionHeading id="job-about" title="Sobre a oportunidade" icon={FileText} />
              <div className="sm:pl-[60px]"><JobText text={job.description || 'Descrição não disponível.'} variant="text" /></div>
            </section>
            {hasJobText(job.responsibilities) && (
              <section className={cardClass} aria-labelledby="job-responsibilities">
                <SectionHeading id="job-responsibilities" title="O que você vai fazer" icon={ListChecks} />
                <div className="sm:pl-[60px]"><JobText text={job.responsibilities} /></div>
              </section>
            )}
            {hasJobText(job.requirements) && (
              <section className={cardClass} aria-labelledby="job-requirements">
                <SectionHeading id="job-requirements" title="O que buscamos" icon={Users} />
                <div className="sm:pl-[60px]"><JobText text={job.requirements} /></div>
              </section>
            )}
            {hasJobText(job.benefits) && (
              <section className={cardClass} aria-labelledby="job-benefits">
                <SectionHeading id="job-benefits" title="Benefícios" icon={Gift} />
                <div className="sm:pl-[60px]"><JobText text={job.benefits} variant="chips" /></div>
              </section>
            )}
            {Array.isArray(job.technologies) && job.technologies.length > 0 && (
              <section className={cardClass} aria-labelledby="job-technologies">
                <SectionHeading id="job-technologies" title="Tecnologias" icon={Code2} />
                <ul className="flex flex-wrap gap-2 sm:pl-[60px]">
                  {job.technologies.map((tech: string, index: number) => <li key={index} className="max-w-full whitespace-pre-wrap break-words rounded-lg bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800">{tech}</li>)}
                </ul>
              </section>
            )}
          </div>

          <aside className="min-w-0 space-y-5" aria-label="Candidatura e informações da vaga">
            <section className={cardClass} aria-labelledby="job-apply">
              <SectionHeading id="job-apply" title="Sua próxima oportunidade" icon={Send} />
              {salary && <div className="mb-5"><p className="mb-1 text-sm text-slate-500">Faixa salarial</p><p className="break-words text-xl font-bold text-portal-orange">{salary}</p></div>}
              <ApplyButton jobId={job.id} jobPath={jobPath} />
              <p className="mt-3 text-center text-sm leading-6 text-slate-600">Entre ou crie sua conta para se candidatar.</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-sm font-semibold text-teal-700">
                <Link href={candidateLinks.login} className="hover:underline">Entrar</Link>
                <span aria-hidden="true" className="font-normal text-slate-300">|</span>
                <Link href={candidateLinks.register} className="hover:underline">Criar conta</Link>
              </div>
            </section>
            {information.length > 0 && (
              <section className={cardClass} aria-labelledby="job-information">
                <SectionHeading id="job-information" title="Informações da vaga" icon={FileText} />
                <dl className="divide-y divide-slate-100 text-sm">
                  {information.map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-4 py-2.5"><dt className="text-slate-500">{label}</dt><dd className="break-words font-medium text-slate-700">{value}</dd></div>)}
                </dl>
              </section>
            )}
            {!employer.hidden && employer.name && (
              <section className={cardClass} aria-labelledby="job-company">
                <SectionHeading id="job-company" title="Sobre a empresa" icon={Building2} />
                <div className="flex items-start gap-4">
                  <EmployerLogo name={employer.name} src={employer.logo} hidden={employer.hidden} size="sidebar" />
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-bold text-portal-dark">{companyPath ? <Link href={companyPath} className="hover:text-teal-700">{employer.name}</Link> : employer.name}</p>
                    <JobText text={employer.description} variant="text" className="mt-2 text-sm" />
                    {companyPath && <Link href={companyPath} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:underline">Ver perfil da empresa<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Link>}
                  </div>
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
