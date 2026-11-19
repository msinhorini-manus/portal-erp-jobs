import { BriefcaseBusiness, Building2, UsersRound } from 'lucide-react'
import { countLabels, formattedPublicCount, validPublicCount } from '@/lib/public-counts'

type Props = { stats: unknown; locale?: string; siteName?: string }

/** Only aggregate, regional counts are accepted; failures never display fake zeroes. */
export function PublicPlatformStats({ stats, locale = 'pt-BR', siteName }: Props) {
  const labels = countLabels(locale)
  const values = stats && typeof stats === 'object' && !Array.isArray(stats)
    ? stats as Record<string, unknown> : {}
  const metrics = [
    { key: 'active_jobs', label: labels.jobs, note: labels.jobsNote, Icon: BriefcaseBusiness },
    { key: 'total_companies', label: labels.companies, note: labels.companiesNote, Icon: Building2 },
    { key: 'total_candidates', label: labels.candidates, note: labels.candidatesNote, Icon: UsersRound },
  ]

  return (
    <section aria-labelledby="platform-stats-heading" className="border-y border-slate-100 bg-white py-6 sm:py-8">
      <div className="container mx-auto px-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="platform-stats-heading" className="font-display text-lg font-bold text-portal-dark">{labels.heading}</h2>
          <p className="text-xs text-slate-500">{siteName || labels.scope}</p>
        </div>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {metrics.map(({ key, label, note, Icon }) => {
            const count = values[key]
            const available = validPublicCount(count)
            return (
              <div key={key} data-platform-stat={key} data-count-available={available ? 'true' : 'false'} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-portal-dark text-white"><Icon aria-hidden="true" className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <dd data-stat-value className="font-display text-3xl font-extrabold leading-tight tracking-tight text-portal-dark">{formattedPublicCount(count, locale)}</dd>
                    <dt className="mt-1 text-sm font-semibold text-slate-700">{label}</dt>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">{available ? note : labels.unavailable}</p>
              </div>
            )
          })}
        </dl>
      </div>
    </section>
  )
}
