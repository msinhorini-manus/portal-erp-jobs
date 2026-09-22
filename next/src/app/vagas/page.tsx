import { Metadata } from 'next'
import { getJobs, getAreas } from '@/lib/api'
import { JobSearchClient } from '@/components/JobSearchClient'

export const metadata: Metadata = {
  title: 'Buscar Vagas',
  description: 'Encontre vagas de emprego no setor de software e ERP. Filtros por área, tecnologia, modalidade, nível e salário.',
}

export default async function VagasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams
  let jobs: any[] = []
  let areas: any[] = []

  try {
    const params: Record<string, string> = {}
    if (resolvedSearchParams.q) params.search = String(resolvedSearchParams.q)
    if (resolvedSearchParams.area) params.area = String(resolvedSearchParams.area)
    if (resolvedSearchParams.tech) params.technology = String(resolvedSearchParams.tech)
    if (resolvedSearchParams.location) params.location = String(resolvedSearchParams.location)
    if (resolvedSearchParams.salary) params.salary_range = String(resolvedSearchParams.salary)

    const jobsData = await getJobs(params)
    jobs = Array.isArray(jobsData) ? jobsData : jobsData?.jobs || []
  } catch (e) {
    console.error('Failed to fetch jobs:', e)
  }

  try {
    areas = await getAreas()
  } catch (e) {
    console.error('Failed to fetch areas:', e)
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-r from-portal-dark to-portal-dark-light text-white py-12">
        <div className="container mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Buscar Vagas</h1>
          <p className="text-white/80">
            {jobs.length} vaga{jobs.length !== 1 ? 's' : ''} encontrada{jobs.length !== 1 ? 's' : ''}
          </p>
        </div>
      </section>

      {/* Search + Results */}
      <JobSearchClient initialJobs={jobs} areas={areas} searchParams={resolvedSearchParams} />
    </>
  )
}
