'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, MapPin, Filter, Building2, Clock, DollarSign, Briefcase } from 'lucide-react'

interface Job {
  id: number
  title: string
  company_name?: string
  location?: string
  work_modality?: string
  seniority_level?: string
  salary_min?: number
  salary_max?: number
  contract_type?: string
  area?: string
  created_at?: string
  technologies?: string[]
}

interface Props {
  initialJobs: Job[]
  areas: any[]
  searchParams: Record<string, any>
}

export function JobSearchClient({ initialJobs, areas, searchParams }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState(String(searchParams.q || ''))
  const [location, setLocation] = useState(String(searchParams.location || ''))
  const [selectedArea, setSelectedArea] = useState(String(searchParams.area || ''))
  const [showFilters, setShowFilters] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (location) params.set('location', location)
    if (selectedArea) params.set('area', selectedArea)
    router.push(`/vagas?${params.toString()}`)
  }

  const formatSalary = (value?: number) => {
    if (!value) return null
    return `R$ ${value.toLocaleString('pt-BR')}`
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const modalityLabel: Record<string, string> = {
    remote: 'Remoto',
    hybrid: 'Híbrido',
    onsite: 'Presencial',
  }

  const levelLabel: Record<string, string> = {
    junior: 'Júnior',
    pleno: 'Pleno',
    senior: 'Sênior',
    tech_lead: 'Tech Lead',
    manager: 'Gerente',
  }

  return (
    <section className="container mx-auto px-6 py-8">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-md p-4 mb-6 -mt-8 relative z-10">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cargo, tecnologia ou empresa"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-portal-orange/50"
            />
          </div>
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cidade ou estado"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-portal-orange/50"
            />
          </div>
          <button
            type="submit"
            className="bg-portal-orange hover:bg-portal-orange-dark text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 border border-gray-200 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-portal-orange/50"
            >
              <option value="">Todas as áreas</option>
              {areas.map((area: any) => (
                <option key={area.id} value={area.name}>{area.name}</option>
              ))}
            </select>
          </div>
        )}
      </form>

      {/* Results */}
      {initialJobs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">Nenhuma vaga encontrada com os filtros selecionados.</p>
          <Link href="/vagas" className="text-portal-orange hover:underline mt-2 inline-block">
            Limpar filtros
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {initialJobs.map((job) => (
            <Link
              key={job.id}
              href={`/vagas/${job.id}`}
              className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-all p-6 border border-gray-100 hover:border-portal-orange/30 group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-portal-dark group-hover:text-portal-orange transition-colors">
                    {job.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                    {job.company_name && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {job.company_name}
                      </span>
                    )}
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </span>
                    )}
                    {job.work_modality && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                        {modalityLabel[job.work_modality] || job.work_modality}
                      </span>
                    )}
                    {job.seniority_level && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">
                        {levelLabel[job.seniority_level] || job.seniority_level}
                      </span>
                    )}
                    {job.contract_type && (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
                        {job.contract_type}
                      </span>
                    )}
                  </div>
                  {job.technologies && job.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(Array.isArray(job.technologies) ? job.technologies : []).slice(0, 5).map((tech: string, i: number) => (
                        <span key={i} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {(job.salary_min || job.salary_max) && (
                    <div className="text-portal-orange font-bold">
                      {formatSalary(job.salary_min)} - {formatSalary(job.salary_max)}
                    </div>
                  )}
                  {job.created_at && (
                    <div className="text-gray-400 text-xs mt-1 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {formatDate(job.created_at)}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
