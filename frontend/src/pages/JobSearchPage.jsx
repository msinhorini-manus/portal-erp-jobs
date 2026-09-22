import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MapPin, Building2, Clock, DollarSign, X, Filter, Loader2, Search, ChevronDown, ChevronUp, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

const API_URL = import.meta.env.VITE_API_URL || '/api'

// Lista de tecnologias populares para sugestão
const POPULAR_TECHNOLOGIES = [
  'SAP', 'ABAP', 'SAP HANA', 'SAP Fiori', 'SAP S/4HANA',
  'TOTVS', 'Protheus', 'RM', 'Datasul',
  'Oracle', 'PL/SQL', 'Oracle EBS',
  'Python', 'Java', 'JavaScript', 'React', 'Node.js',
  'SQL', 'Power BI', 'Excel VBA', 'Microsoft Dynamics'
]

// Faixas salariais predefinidas
const SALARY_RANGES = [
  { label: 'Todas', min: null, max: null },
  { label: 'Até R$ 5.000', min: 0, max: 5000 },
  { label: 'R$ 5.000 - R$ 8.000', min: 5000, max: 8000 },
  { label: 'R$ 8.000 - R$ 12.000', min: 8000, max: 12000 },
  { label: 'R$ 12.000 - R$ 15.000', min: 12000, max: 15000 },
  { label: 'R$ 15.000 - R$ 20.000', min: 15000, max: 20000 },
  { label: 'Acima de R$ 20.000', min: 20000, max: null }
]

export default function JobSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [filters, setFilters] = useState({
    keyword: searchParams.get('q') || '',
    location: searchParams.get('city') || '',
    area: searchParams.get('area') || 'Todas',
    level: searchParams.get('level') || 'Todos',
    modality: searchParams.get('work_mode') || 'Todas',
    salary: 'Todas',
    salaryMin: searchParams.get('salary_min') || '',
    salaryMax: searchParams.get('salary_max') || '',
    contractType: searchParams.get('contract') || 'Todos',
    technology: searchParams.get('tech') || ''
  })

  const [sortBy, setSortBy] = useState('date')
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [totalJobs, setTotalJobs] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [showTechSuggestions, setShowTechSuggestions] = useState(false)

  // Buscar vagas da API com filtros
  const fetchJobs = async () => {
    try {
      setLoading(true)

      // Construir URL com parâmetros
      const params = new URLSearchParams()
      params.append('page', currentPage)
      params.append('per_page', 20)

      if (filters.keyword) params.append('q', filters.keyword)
      if (filters.location) params.append('city', filters.location)
      if (filters.technology) params.append('tech', filters.technology)
      if (filters.area && filters.area !== 'Todas') params.append('area', filters.area)
      if (filters.level && filters.level !== 'Todos') params.append('level', filters.level)
      if (filters.modality && filters.modality !== 'Todas') params.append('work_mode', filters.modality)
      if (filters.contractType && filters.contractType !== 'Todos') params.append('employment_type', filters.contractType)

      // Filtros de salário
      if (filters.salaryMin) params.append('salary_min_exact', filters.salaryMin)
      if (filters.salaryMax) params.append('salary_max_exact', filters.salaryMax)

      const response = await fetch(`${API_URL}/jobs/?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Erro ao carregar vagas')
      }

      const data = await response.json()

      // Transformar dados da API para o formato esperado
      const jobsArray = data.jobs || data
      const transformedJobs = jobsArray.map(job => ({
        id: job.id,
        title: job.title,
        company: job.company_name || 'Empresa não informada',
        companyId: job.company_id,
        location: job.location || `${job.city || ''}, ${job.state || ''}`.trim() || 'Não informado',
        match: 85,
        level: job.seniority_level || 'Não especificado',
        salary: job.salary || (job.min_salary && job.max_salary
          ? `R$ ${job.min_salary.toLocaleString()} - R$ ${job.max_salary.toLocaleString()}`
          : 'A combinar'),
        salaryMin: job.min_salary || 0,
        salaryMax: job.max_salary || 0,
        tags: job.skills?.map(s => s.name || s) || [],
        type: job.seniority_level || 'Não especificado',
        contractType: job.contract_type || 'Não especificado',
        date: job.created_at || new Date().toISOString(),
        modality: job.work_modality || 'Não especificado',
        area: job.area || 'Não especificado',
        description: job.description || ''
      }))

      setJobs(transformedJobs)
      setTotalJobs(data.total || transformedJobs.length)
      setTotalPages(data.pages || 1)
      setError(null)
    } catch (err) {
      console.error('Erro ao buscar vagas:', err)
      setError(err.message)
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [currentPage])

  // Aplicar filtros quando clicar em buscar
  const handleSearch = () => {
    setCurrentPage(1)
    fetchJobs()

    // Atualizar URL com os filtros
    const params = new URLSearchParams()
    if (filters.keyword) params.set('q', filters.keyword)
    if (filters.location) params.set('city', filters.location)
    if (filters.technology) params.set('tech', filters.technology)
    if (filters.area !== 'Todas') params.set('area', filters.area)
    if (filters.level !== 'Todos') params.set('level', filters.level)
    if (filters.modality !== 'Todas') params.set('work_mode', filters.modality)
    if (filters.salaryMin) params.set('salary_min', filters.salaryMin)
    if (filters.salaryMax) params.set('salary_max', filters.salaryMax)
    setSearchParams(params)
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleSalaryRangeSelect = (range) => {
    setFilters(prev => ({
      ...prev,
      salary: range.label,
      salaryMin: range.min || '',
      salaryMax: range.max || ''
    }))
  }

  const clearFilters = () => {
    setFilters({
      keyword: '',
      location: '',
      area: 'Todas',
      level: 'Todos',
      modality: 'Todas',
      salary: 'Todas',
      salaryMin: '',
      salaryMax: '',
      contractType: 'Todos',
      technology: ''
    })
    setSortBy('date')
    setSearchParams({})
    setCurrentPage(1)
    setTimeout(() => fetchJobs(), 100)
  }

  const handleTechSelect = (tech) => {
    setFilters(prev => ({ ...prev, technology: tech }))
    setShowTechSuggestions(false)
  }

  const getActiveFilters = () => {
    const active = []
    if (filters.keyword) active.push({ key: 'keyword', label: `"${filters.keyword}"` })
    if (filters.location) active.push({ key: 'location', label: filters.location })
    if (filters.technology) active.push({ key: 'technology', label: `Tech: ${filters.technology}` })
    if (filters.area !== 'Todas') active.push({ key: 'area', label: filters.area })
    if (filters.level !== 'Todos') active.push({ key: 'level', label: filters.level })
    if (filters.modality !== 'Todas') active.push({ key: 'modality', label: filters.modality })
    if (filters.salaryMin || filters.salaryMax) {
      const label = filters.salaryMin && filters.salaryMax
        ? `R$ ${Number(filters.salaryMin).toLocaleString()} - R$ ${Number(filters.salaryMax).toLocaleString()}`
        : filters.salaryMin
          ? `A partir de R$ ${Number(filters.salaryMin).toLocaleString()}`
          : `Até R$ ${Number(filters.salaryMax).toLocaleString()}`
      active.push({ key: 'salary', label })
    }
    if (filters.contractType !== 'Todos') active.push({ key: 'contractType', label: filters.contractType })
    return active
  }

  const removeFilter = (key) => {
    if (key === 'keyword' || key === 'location' || key === 'technology') {
      handleFilterChange(key, '')
    } else if (key === 'salary') {
      setFilters(prev => ({ ...prev, salary: 'Todas', salaryMin: '', salaryMax: '' }))
    } else {
      handleFilterChange(key, key === 'area' || key === 'modality' ? 'Todas' : 'Todos')
    }
    setTimeout(() => handleSearch(), 100)
  }

  const activeFilters = getActiveFilters()

  // Ordenar localmente
  const sortedJobs = [...jobs].sort((a, b) => {
    if (sortBy === 'salary') return b.salaryMax - a.salaryMax
    if (sortBy === 'date') return new Date(b.date) - new Date(a.date)
    return 0
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        <div className="flex gap-8">
          <aside className="w-80 space-y-6">
            <Card className="border-2 shadow-lg">
              <div className="bg-[#1F3B47] text-white rounded-t-lg p-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filtros Avançados
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {/* Busca por Tecnologia */}
                <div className="relative">
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">
                    🔍 Buscar por Tecnologia
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: SAP, ABAP, Python..."
                    className="w-full border-2 focus:border-[#F7941D]"
                    value={filters.technology}
                    onChange={(e) => handleFilterChange('technology', e.target.value)}
                    onFocus={() => setShowTechSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowTechSuggestions(false), 200)}
                  />
                  {showTechSuggestions && (
                    <div className="absolute z-10 w-full mt-1 bg-white border-2 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {POPULAR_TECHNOLOGIES.filter(t =>
                        t.toLowerCase().includes(filters.technology.toLowerCase())
                      ).slice(0, 8).map(tech => (
                        <button
                          key={tech}
                          className="w-full px-3 py-2 text-left hover:bg-[#F7941D]/10 text-sm"
                          onClick={() => handleTechSelect(tech)}
                        >
                          {tech}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Palavras-chave */}
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Palavras-chave</label>
                  <Input
                    type="text"
                    placeholder="Cargo, empresa..."
                    className="w-full border-2 focus:border-[#F7941D]"
                    value={filters.keyword}
                    onChange={(e) => handleFilterChange('keyword', e.target.value)}
                  />
                </div>

                {/* Localização */}
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Localização</label>
                  <Input
                    type="text"
                    placeholder="Cidade"
                    className="w-full border-2 focus:border-[#F7941D]"
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                  />
                </div>

                {/* Área de Atuação */}
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Área de Atuação</label>
                  <select
                    className="w-full px-3 py-2 border-2 rounded-md focus:border-[#F7941D] focus:outline-none"
                    value={filters.area}
                    onChange={(e) => handleFilterChange('area', e.target.value)}
                  >
                    <option>Todas</option>
                    <option>Desenvolvimento</option>
                    <option>Consultoria & ERP</option>
                    <option>Suporte</option>
                    <option>Infraestrutura</option>
                    <option>Dados & Analytics</option>
                    <option>Gestão de Projetos</option>
                  </select>
                </div>

                {/* Nível de Experiência */}
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Nível de Experiência</label>
                  <select
                    className="w-full px-3 py-2 border-2 rounded-md focus:border-[#F7941D] focus:outline-none"
                    value={filters.level}
                    onChange={(e) => handleFilterChange('level', e.target.value)}
                  >
                    <option>Todos</option>
                    <option>Estágio</option>
                    <option>Júnior</option>
                    <option>Pleno</option>
                    <option>Sênior</option>
                    <option>Especialista</option>
                    <option>Gerente</option>
                  </select>
                </div>

                {/* Modalidade de Trabalho */}
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Modalidade de Trabalho</label>
                  <select
                    className="w-full px-3 py-2 border-2 rounded-md focus:border-[#F7941D] focus:outline-none"
                    value={filters.modality}
                    onChange={(e) => handleFilterChange('modality', e.target.value)}
                  >
                    <option>Todas</option>
                    <option>Remoto</option>
                    <option>Híbrido</option>
                    <option>Presencial</option>
                  </select>
                </div>

                {/* Tipo de Contratação */}
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Tipo de Contratação</label>
                  <select
                    className="w-full px-3 py-2 border-2 rounded-md focus:border-[#F7941D] focus:outline-none"
                    value={filters.contractType}
                    onChange={(e) => handleFilterChange('contractType', e.target.value)}
                  >
                    <option>Todos</option>
                    <option>CLT</option>
                    <option>PJ</option>
                    <option>Estágio</option>
                    <option>Temporário</option>
                    <option>Freelancer</option>
                  </select>
                </div>

                {/* Filtro de Salário Avançado */}
                <div>
                  <button
                    className="flex items-center justify-between w-full text-sm font-semibold text-[#1F3B47] mb-2"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  >
                    <span>💰 Faixa Salarial</span>
                    {showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {/* Faixas predefinidas */}
                  <div className="space-y-1 mb-3">
                    {SALARY_RANGES.map(range => (
                      <button
                        key={range.label}
                        className={`w-full px-3 py-2 text-left text-sm rounded-md transition-colors ${
                          filters.salary === range.label
                            ? 'bg-[#F7941D] text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                        onClick={() => handleSalaryRangeSelect(range)}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>

                  {/* Valores personalizados */}
                  {showAdvancedFilters && (
                    <div className="space-y-3 pt-3 border-t">
                      <p className="text-xs text-gray-500 font-medium">Ou defina valores exatos:</p>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500">Mínimo</label>
                          <Input
                            type="number"
                            placeholder="R$ 0"
                            className="w-full border-2 focus:border-[#F7941D] text-sm"
                            value={filters.salaryMin}
                            onChange={(e) => setFilters(prev => ({
                              ...prev,
                              salaryMin: e.target.value,
                              salary: 'Personalizado'
                            }))}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-500">Máximo</label>
                          <Input
                            type="number"
                            placeholder="R$ 50.000"
                            className="w-full border-2 focus:border-[#F7941D] text-sm"
                            value={filters.salaryMax}
                            onChange={(e) => setFilters(prev => ({
                              ...prev,
                              salaryMax: e.target.value,
                              salary: 'Personalizado'
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    className="flex-1 bg-[#F7941D] hover:bg-[#e8850d] text-white font-semibold h-11"
                    onClick={handleSearch}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Buscar Vagas
                  </Button>
                  <Button
                    variant="outline"
                    className="border-2 border-[#1F3B47] text-[#1F3B47] hover:bg-[#1F3B47] hover:text-white font-semibold h-11 px-4"
                    onClick={clearFilters}
                    title="Limpar todos os filtros"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Tecnologias Populares */}
            <Card className="border-2 shadow-lg">
              <div className="p-4">
                <h3 className="font-semibold text-[#1F3B47] mb-3">🔥 Tecnologias em Alta</h3>
                <div className="flex flex-wrap gap-2">
                  {['SAP', 'ABAP', 'TOTVS', 'Python', 'Power BI', 'SQL'].map(tech => (
                    <button
                      key={tech}
                      className="px-3 py-1 bg-gray-100 hover:bg-[#F7941D] hover:text-white rounded-full text-sm transition-colors"
                      onClick={() => {
                        handleFilterChange('technology', tech)
                        setTimeout(() => handleSearch(), 100)
                      }}
                    >
                      {tech}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </aside>

          <main className="flex-1">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-[#1F3B47] mb-2">PESQUISA DE VAGAS</h1>
                  {loading ? (
                    <p className="text-gray-600">Carregando vagas...</p>
                  ) : (
                    <p className="text-gray-600">
                      Encontradas <span className="font-bold text-[#F7941D]">{totalJobs} {totalJobs === 1 ? 'vaga' : 'vagas'}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-[#1F3B47]">Ordenar por:</label>
                  <select
                    className="px-4 py-2 border-2 rounded-md focus:border-[#F7941D] focus:outline-none font-medium"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="date">Mais Recentes</option>
                    <option value="salary">Maior Salário</option>
                  </select>
                </div>
              </div>

              {activeFilters.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-sm text-gray-600 py-1">Filtros ativos:</span>
                  {activeFilters.map(filter => (
                    <Badge
                      key={filter.key}
                      variant="secondary"
                      className="bg-[#F7941D]/10 text-[#F7941D] hover:bg-[#F7941D]/20 cursor-pointer flex items-center gap-1"
                      onClick={() => removeFilter(filter.key)}
                    >
                      {filter.label}
                      <X className="w-3 h-3" />
                    </Badge>
                  ))}
                  <button
                    className="text-sm text-gray-500 hover:text-[#F7941D] underline"
                    onClick={clearFilters}
                  >
                    Limpar todos
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#F7941D]" />
                <span className="ml-3 text-gray-600">Carregando vagas...</span>
              </div>
            ) : error ? (
              <Card className="p-8 text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={fetchJobs} className="bg-[#F7941D] hover:bg-[#e8850d]">
                  Tentar novamente
                </Button>
              </Card>
            ) : sortedJobs.length === 0 ? (
              <Card className="p-8 text-center">
                <Briefcase className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhuma vaga encontrada</h3>
                <p className="text-gray-500 mb-4">Tente ajustar os filtros ou buscar por outros termos</p>
                <Button onClick={clearFilters} className="bg-[#F7941D] hover:bg-[#e8850d]">
                  Limpar filtros
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {sortedJobs.map(job => (
                  <Link key={job.id} to={`/vagas/${job.id}`}>
                    <Card className="border-2 hover:border-[#F7941D] hover:shadow-lg transition-all cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-bold text-[#1F3B47] hover:text-[#F7941D] transition-colors">
                                {job.title}
                              </h3>
                              <Badge className="bg-[#F7941D]/10 text-[#F7941D] border-0">
                                {job.level}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-3">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-4 h-4" />
                                {job.company}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {job.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {job.modality}
                              </span>
                              <span className="flex items-center gap-1 font-semibold text-green-600">
                                <DollarSign className="w-4 h-4" />
                                {job.salary}
                              </span>
                            </div>
                            {job.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {job.tags.slice(0, 5).map((tag, idx) => (
                                  <Badge key={idx} variant="outline" className="border-gray-300 text-gray-600">
                                    {tag}
                                  </Badge>
                                ))}
                                {job.tags.length > 5 && (
                                  <Badge variant="outline" className="border-gray-300 text-gray-600">
                                    +{job.tags.length - 5}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-sm text-gray-500">
                              {new Date(job.date).toLocaleDateString('pt-BR')}
                            </div>
                            <Badge className="mt-2 bg-gray-100 text-gray-700 border-0">
                              {job.contractType}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      Anterior
                    </Button>
                    <span className="px-4 py-2 text-gray-600">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
