'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Building2, Clock, Filter, MapPin, Search } from 'lucide-react'

import { jobSearchUrl, JobSearchParams, readJobSearchParam } from '@/lib/job-search'

type CatalogItem = { id: number; name: string; label?: string }
type Company = { id: number; company_name?: string; trade_name?: string; name?: string }
type Job = {
  id: number; title: string; company_name?: string; location?: string; work_modality?: string
  seniority_level?: string; min_salary?: number; max_salary?: number; contract_type?: string
  area?: string; created_at?: string; technologies?: string[]
}
type Props = {
  initialJobs: Job[]
  pagination: { total: number; pages: number; currentPage: number; perPage: number }
  areas: CatalogItem[]; skills: CatalogItem[]; levels: CatalogItem[]; modalities: CatalogItem[]; companies: Company[]
  searchParams: JobSearchParams
}

const SALARIES = [
  ['0-5000', 'Até R$ 5.000'], ['5000-8000', 'R$ 5.000 – R$ 8.000'],
  ['8000-12000', 'R$ 8.000 – R$ 12.000'], ['12000-18000', 'R$ 12.000 – R$ 18.000'],
  ['18000-25000', 'R$ 18.000 – R$ 25.000'], ['25000-999999', 'Acima de R$ 25.000'],
]

export function JobSearchClient({ initialJobs, pagination, areas, skills, levels, modalities, companies, searchParams }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState(readJobSearchParam(searchParams, 'q'))
  const [location, setLocation] = useState(readJobSearchParam(searchParams, 'location'))
  const [area, setArea] = useState(readJobSearchParam(searchParams, 'area'))
  const [tech, setTech] = useState(readJobSearchParam(searchParams, 'tech'))
  const [level, setLevel] = useState(readJobSearchParam(searchParams, 'level'))
  const [workMode, setWorkMode] = useState(readJobSearchParam(searchParams, 'work_mode'))
  const [employmentType, setEmploymentType] = useState(readJobSearchParam(searchParams, 'employment_type'))
  const [companyId, setCompanyId] = useState(readJobSearchParam(searchParams, 'company_id'))
  const [salary, setSalary] = useState(readJobSearchParam(searchParams, 'salary'))
  const hasAdvanced = Boolean(area || tech || level || workMode || employmentType || companyId || salary)
  const [showFilters, setShowFilters] = useState(hasAdvanced)

  function handleSearch(event: React.FormEvent) {
    event.preventDefault()
    router.push(jobSearchUrl({}, {
      q: query, location, area, tech, level, work_mode: workMode,
      employment_type: employmentType, company_id: companyId, salary,
    }))
  }

  const formatSalary = (value?: number) => value ? `R$ ${value.toLocaleString('pt-BR')}` : null
  const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('pt-BR') : ''
  const modalityLabel: Record<string, string> = { remote: 'Remoto', hybrid: 'Híbrido', onsite: 'Presencial' }
  const levelLabel: Record<string, string> = { junior: 'Júnior', pleno: 'Pleno', senior: 'Sênior', tech_lead: 'Tech Lead', manager: 'Gerente' }

  return <section className="container mx-auto px-6 py-8">
    <form onSubmit={handleSearch} className="relative z-10 -mt-8 mb-6 rounded-xl bg-white p-4 shadow-md">
      <div className="flex flex-col gap-3 md:flex-row">
        <label className="relative flex-1"><span className="sr-only">Buscar cargo, tecnologia ou empresa</span><Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" /><input name="q" type="search" placeholder="Cargo, tecnologia ou empresa" value={query} onChange={event => setQuery(event.target.value)} className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-portal-orange/50" /></label>
        <label className="relative flex-1"><span className="sr-only">Cidade ou estado</span><MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" /><input name="location" type="search" placeholder="Cidade ou estado" value={location} onChange={event => setLocation(event.target.value)} className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-portal-orange/50" /></label>
        <button type="submit" className="rounded-lg bg-portal-orange px-6 py-3 font-medium text-white transition-colors hover:bg-portal-orange-dark">Buscar</button>
        <button type="button" aria-expanded={showFilters} onClick={() => setShowFilters(value => !value)} className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-3 transition-colors hover:bg-gray-50"><Filter className="h-4 w-4" />Filtros</button>
      </div>
      {showFilters && <div className="mt-4 grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium text-gray-700">Área<select name="area" value={area} onChange={event => setArea(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5"><option value="">Todas as áreas</option>{areas.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
        <label className="text-sm font-medium text-gray-700">Tecnologia<select name="tech" value={tech} onChange={event => setTech(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5"><option value="">Todas as tecnologias</option>{skills.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
        <label className="text-sm font-medium text-gray-700">Empresa<select name="company_id" value={companyId} onChange={event => setCompanyId(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5"><option value="">Todas as empresas</option>{companies.map(item => <option key={item.id} value={item.id}>{item.company_name || item.trade_name || item.name}</option>)}</select></label>
        <label className="text-sm font-medium text-gray-700">Modalidade<select name="work_mode" value={workMode} onChange={event => setWorkMode(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5"><option value="">Todas as modalidades</option>{modalities.map(item => <option key={item.id} value={item.name}>{item.label || item.name}</option>)}</select></label>
        <label className="text-sm font-medium text-gray-700">Nível<select name="level" value={level} onChange={event => setLevel(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5"><option value="">Todos os níveis</option>{levels.map(item => <option key={item.id} value={item.name}>{item.label || item.name}</option>)}</select></label>
        <label className="text-sm font-medium text-gray-700">Contrato<select name="employment_type" value={employmentType} onChange={event => setEmploymentType(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5"><option value="">Todos os contratos</option><option value="clt">CLT</option><option value="pj">PJ</option><option value="freelance">Freelance</option><option value="internship">Estágio</option><option value="temporary">Temporário</option><option value="contract">Contrato</option></select></label>
        <label className="text-sm font-medium text-gray-700">Faixa salarial<select name="salary" value={salary} onChange={event => setSalary(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5"><option value="">Todas as faixas</option>{SALARIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div className="flex items-end"><Link href="/vagas" className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50">Limpar filtros</Link></div>
      </div>}
    </form>

    {initialJobs.length === 0 ? <div className="py-16 text-center"><p className="text-lg text-gray-500">Nenhuma vaga encontrada com os filtros selecionados.</p><Link href="/vagas" className="mt-2 inline-block text-portal-orange hover:underline">Limpar filtros</Link></div> : <div className="space-y-4">{initialJobs.map(job => <Link key={job.id} href={`/vagas/${job.id}`} className="group block rounded-lg border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-portal-orange/30 hover:shadow-md"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div className="flex-1"><h3 className="text-lg font-bold text-portal-dark transition-colors group-hover:text-portal-orange">{job.title}</h3><div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">{job.company_name && <span className="flex items-center gap-1"><Building2 className="h-4 w-4" />{job.company_name}</span>}{job.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>}{job.work_modality && <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{modalityLabel[job.work_modality] || job.work_modality}</span>}{job.seniority_level && <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">{levelLabel[job.seniority_level] || job.seniority_level}</span>}{job.contract_type && <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{job.contract_type.toUpperCase()}</span>}</div>{job.technologies && job.technologies.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{job.technologies.slice(0, 5).map(technology => <span key={technology} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{technology}</span>)}</div>}</div><div className="text-right">{(job.min_salary || job.max_salary) && <div className="font-bold text-portal-orange">{formatSalary(job.min_salary)} - {formatSalary(job.max_salary)}</div>}{job.created_at && <div className="mt-1 flex items-center justify-end gap-1 text-xs text-gray-400"><Clock className="h-3 w-3" />{formatDate(job.created_at)}</div>}</div></div></Link>)}</div>}

    {pagination.pages > 1 && <nav aria-label="Paginação das vagas" className="mt-8 flex items-center justify-center gap-3"><Link aria-disabled={pagination.currentPage <= 1} href={jobSearchUrl(searchParams, { page: Math.max(1, pagination.currentPage - 1) })} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${pagination.currentPage <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-gray-50'}`}>Anterior</Link><span className="text-sm text-gray-600">Página {pagination.currentPage} de {pagination.pages}</span><Link aria-disabled={pagination.currentPage >= pagination.pages} href={jobSearchUrl(searchParams, { page: Math.min(pagination.pages, pagination.currentPage + 1) })} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${pagination.currentPage >= pagination.pages ? 'pointer-events-none opacity-40' : 'hover:bg-gray-50'}`}>Próxima</Link></nav>}
  </section>
}
