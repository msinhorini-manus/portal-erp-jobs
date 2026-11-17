import Link from '@/components/RegionalLink'
import { EmployerLogo } from '@/components/EmployerLogo'
import { publicJobPath } from '@/lib/public-job-url'
import { recentJobCompanyPath, recentJobPublication, selectRecentJobs, type RecentJob } from '@/lib/recent-jobs'
import type { RegionalSite } from '@/lib/site'

const modalityLabels: Record<string, string> = {
  remote: 'Remoto', hybrid: 'Híbrido', onsite: 'Presencial',
}
const contractLabels: Record<string, string> = {
  clt: 'CLT', pj: 'PJ', freelance: 'Freelance', internship: 'Estágio',
  temporary: 'Temporário', contract: 'Contrato', contractor: 'Contrato', part_time: 'Meio período',
}

export function RecentJobs({ jobs, site }: { jobs: readonly RecentJob[]; site: RegionalSite }) {
  const recentJobs = selectRecentJobs(jobs, site)

  return (
    <section className="bg-white py-8 sm:py-10" aria-labelledby="recent-jobs-heading">
      <div className="container mx-auto px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 id="recent-jobs-heading" className="font-display text-2xl font-extrabold tracking-tight text-portal-dark sm:text-3xl">Vagas mais recentes</h2>
          <Link href="/vagas" className="text-sm font-semibold text-orange-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-portal-orange">Ver todas as vagas →</Link>
        </div>

        {recentJobs.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {recentJobs.map(job => {
              const jobPath = publicJobPath(job, site)
              const companyPath = recentJobCompanyPath(job, site)
              const hidden = Boolean(job.is_company_hidden)
              const companyName = hidden ? 'Empresa Confidencial' : job.company_name || job.company?.company_name || job.company?.name || 'Empresa'
              const location = job.location || [job.city, job.state].filter(Boolean).join(', ')
              const publication = recentJobPublication(job, site)
              const modality = job.work_modality && (modalityLabels[job.work_modality.toLowerCase()] || job.work_modality)
              const contract = job.contract_type && (contractLabels[job.contract_type.toLowerCase()] || job.contract_type)

              return (
                <article key={job.id} className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-portal-orange/40">
                  <div className="flex items-start gap-2">
                    <EmployerLogo name={hidden ? null : companyName} src={hidden ? null : job.company_logo_url} hidden={hidden} size="card" />
                    <div className="min-w-0 flex-1 break-words pt-1 text-xs leading-5 text-slate-600">
                      {companyPath ? <Link href={companyPath} className="hover:text-orange-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-orange">{companyName}</Link> : <span>{companyName}</span>}
                    </div>
                    {publication && <time dateTime={publication.dateTime} title={`Publicada em ${publication.label}`} aria-label={`Publicada em ${publication.label}`} className="shrink-0 pt-1 text-[11px] leading-5 text-slate-500">{publication.label}</time>}
                  </div>

                  <h3 className="mt-3 break-words font-display text-base font-bold leading-snug text-portal-dark">
                    <Link href={jobPath} className="hover:text-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-orange">{job.title || job.name || 'Oportunidade no mercado de software'}</Link>
                  </h3>
                  {location && <p className="mt-3 break-words text-sm leading-5 text-slate-600">{location}</p>}
                  <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-4 text-xs leading-5">
                    {(modality || contract) && (
                      <p className="flex min-w-0 flex-wrap gap-1.5">
                        {modality && <span className="rounded-md bg-teal-50 px-2 py-0.5 text-teal-700">{modality}</span>}
                        {contract && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">{contract}</span>}
                      </p>
                    )}
                    <Link href={jobPath} aria-label={`Ver vaga: ${job.title || job.name || 'Oportunidade no mercado de software'}`} className="ml-auto shrink-0 font-semibold text-orange-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-orange">Ver vaga →</Link>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">Novas oportunidades serão publicadas aqui.</p>
        )}
      </div>
    </section>
  )
}
