import { Metadata } from 'next'
import { getAreas, getCompanies, getJobs, getLevels, getModalities, getSkills } from '@/lib/api'
import { JobSearchClient } from '@/components/JobSearchClient'
import { buildJobApiParams, JobSearchParams } from '@/lib/job-search'

export const metadata: Metadata = {
  title: 'Buscar Vagas',
  description: 'Encontre vagas de emprego no setor de software e ERP. Filtros por área, tecnologia, modalidade, nível e salário.',
  alternates: { canonical: '/vagas' },
}

const fallbackPage = { jobs: [], total: 0, pages: 0, current_page: 1, per_page: 20 }

export default async function VagasPage({ searchParams }: { searchParams: Promise<JobSearchParams> }) {
  const resolvedSearchParams = await searchParams
  const apiParams = buildJobApiParams(resolvedSearchParams)

  const [jobsData, areas, skills, levels, modalities, companiesData] = await Promise.all([
    getJobs(apiParams).catch(error => { console.error('Failed to fetch jobs:', error); return fallbackPage }),
    getAreas().catch(error => { console.error('Failed to fetch areas:', error); return [] }),
    getSkills().catch(error => { console.error('Failed to fetch skills:', error); return [] }),
    getLevels().catch(error => { console.error('Failed to fetch levels:', error); return [] }),
    getModalities().catch(error => { console.error('Failed to fetch modalities:', error); return [] }),
    getCompanies({ per_page: '100' }).catch(error => { console.error('Failed to fetch companies:', error); return { companies: [] } }),
  ])

  const pageData = Array.isArray(jobsData)
    ? { ...fallbackPage, jobs: jobsData, total: jobsData.length }
    : { ...fallbackPage, ...jobsData, jobs: jobsData?.jobs || [] }
  const companies = Array.isArray(companiesData) ? companiesData : companiesData?.companies || []

  return (
    <>
      <section className="bg-gradient-to-r from-portal-dark to-portal-dark-light py-12 text-white">
        <div className="container mx-auto px-6">
          <h1 className="mb-2 text-3xl font-bold md:text-4xl">Buscar Vagas</h1>
          <p className="text-white/80">{pageData.total} vaga{pageData.total !== 1 ? 's' : ''} encontrada{pageData.total !== 1 ? 's' : ''}</p>
        </div>
      </section>
      <JobSearchClient
        initialJobs={pageData.jobs}
        pagination={{ total: pageData.total, pages: pageData.pages, currentPage: pageData.current_page, perPage: pageData.per_page }}
        areas={areas}
        skills={skills}
        levels={levels}
        modalities={modalities}
        companies={companies}
        searchParams={resolvedSearchParams}
      />
    </>
  )
}
