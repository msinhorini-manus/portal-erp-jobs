import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Building2, Clock, DollarSign, X, Filter, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

const API_URL = import.meta.env.VITE_API_URL || 'https://portal-erp-jobs-production.up.railway.app'

export default function JobSearchPage() {
  const [filters, setFilters] = useState({
    keyword: '',
    location: '',
    area: 'Todas',
    level: 'Todos',
    modality: 'Todas',
    salary: 'Todas',
    contractType: 'Todos'
  })

  const [sortBy, setSortBy] = useState('match') // match, salary, date
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Buscar vagas da API
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_URL}/api/jobs`)
        
        if (!response.ok) {
          throw new Error('Erro ao carregar vagas')
        }
        
        const data = await response.json()
        
        // Transformar dados da API para o formato esperado
        const transformedJobs = data.map(job => ({
          id: job.id,
          title: job.title,
          company: job.company?.name || 'Empresa não informada',
          location: `${job.city || ''}, ${job.state || ''}`.trim(),
          match: 85, // TODO: Calcular match real baseado no perfil do candidato
          level: job.level || 'Não especificado',
          salary: job.salary_min && job.salary_max 
            ? `R$ ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
            : 'A combinar',
          salaryMin: job.salary_min || 0,
          salaryMax: job.salary_max || 0,
          tags: job.technologies?.map(t => t.name) || [],
          type: job.level || 'Não especificado',
          contractType: job.contract_type || 'Não especificado',
          date: job.created_at || new Date().toISOString(),
          modality: job.modality || 'Não especificado'
        }))
        
        setJobs(transformedJobs)
        setFilteredJobs(transformedJobs)
        setError(null)
      } catch (err) {
        console.error('Erro ao buscar vagas:', err)
        setError(err.message)
        setJobs([])
        setFilteredJobs([])
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [])

  // Aplicar filtros e ordenação
  useEffect(() => {
    if (jobs.length === 0) return

    let result = [...jobs]

    // Filtrar por palavra-chave
    if (filters.keyword) {
      result = result.filter(job => 
        job.title.toLowerCase().includes(filters.keyword.toLowerCase()) ||
        job.tags.some(tag => tag.toLowerCase().includes(filters.keyword.toLowerCase())) ||
        job.company.toLowerCase().includes(filters.keyword.toLowerCase())
      )
    }

    // Filtrar por localização
    if (filters.location) {
      result = result.filter(job => 
        job.location.toLowerCase().includes(filters.location.toLowerCase())
      )
    }

    // Filtrar por área (TODO: implementar quando houver campo de área no backend)
    if (filters.area !== 'Todas') {
      // result = result.filter(job => job.area === filters.area)
    }

    // Filtrar por nível
    if (filters.level !== 'Todos') {
      result = result.filter(job => job.level === filters.level)
    }

    // Filtrar por modalidade
    if (filters.modality !== 'Todas') {
      result = result.filter(job => job.modality === filters.modality)
    }

    // Filtrar por faixa salarial
    if (filters.salary !== 'Todas') {
      if (filters.salary === 'Até R$ 5.000') {
        result = result.filter(job => job.salaryMax <= 5000 && job.salaryMax > 0)
      } else if (filters.salary === 'R$ 5.000 - R$ 8.000') {
        result = result.filter(job => job.salaryMin >= 5000 && job.salaryMax <= 8000)
      } else if (filters.salary === 'R$ 8.000 - R$ 12.000') {
        result = result.filter(job => job.salaryMin >= 8000 && job.salaryMax <= 12000)
      } else if (filters.salary === 'Acima de R$ 12.000') {
        result = result.filter(job => job.salaryMin >= 12000)
      }
    }

    // Filtrar por tipo de contratação
    if (filters.contractType !== 'Todos') {
      result = result.filter(job => job.contractType === filters.contractType)
    }

    // Ordenar
    if (sortBy === 'match') {
      result.sort((a, b) => b.match - a.match)
    } else if (sortBy === 'salary') {
      result.sort((a, b) => b.salaryMax - a.salaryMax)
    } else if (sortBy === 'date') {
      result.sort((a, b) => new Date(b.date) - new Date(a.date))
    }

    setFilteredJobs(result)
  }, [filters, sortBy, jobs])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      keyword: '',
      location: '',
      area: 'Todas',
      level: 'Todos',
      modality: 'Todas',
      salary: 'Todas',
      contractType: 'Todos'
    })
    setSortBy('match')
  }

  const getActiveFilters = () => {
    const active = []
    if (filters.keyword) active.push({ key: 'keyword', label: `"${filters.keyword}"` })
    if (filters.location) active.push({ key: 'location', label: filters.location })
    if (filters.area !== 'Todas') active.push({ key: 'area', label: filters.area })
    if (filters.level !== 'Todos') active.push({ key: 'level', label: filters.level })
    if (filters.modality !== 'Todas') active.push({ key: 'modality', label: filters.modality })
    if (filters.salary !== 'Todas') active.push({ key: 'salary', label: filters.salary })
    if (filters.contractType !== 'Todos') active.push({ key: 'contractType', label: filters.contractType })
    return active
  }

  const removeFilter = (key) => {
    if (key === 'keyword' || key === 'location') {
      handleFilterChange(key, '')
    } else {
      handleFilterChange(key, key === 'area' || key === 'modality' || key === 'salary' ? 'Todas' : 'Todos')
    }
  }

  const activeFilters = getActiveFilters()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1F3B47] text-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-10 h-10 bg-[#F7941D] rounded-full flex items-center justify-center font-bold text-white">
                  P
                </div>
                <div className="text-xl font-bold">
                  PORTAL <span className="text-[#F7941D]">ERP</span> JOBS
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <Button className="bg-[#F7941D] hover:bg-[#e8850d] text-white text-sm font-medium">
                Cadastrar CV grátis
              </Button>
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 text-sm font-medium">
                Entrar
              </Button>
            </div>
          </div>
        </div>
      </header>

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
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Palavras-chave</label>
                  <Input 
                    type="text" 
                    placeholder="Ex: SAP, Python" 
                    className="w-full border-2 focus:border-[#F7941D]"
                    value={filters.keyword}
                    onChange={(e) => handleFilterChange('keyword', e.target.value)}
                  />
                </div>
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
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Área de Atuação</label>
                  <select 
                    className="w-full px-3 py-2 border-2 rounded-md focus:border-[#F7941D] focus:outline-none"
                    value={filters.area}
                    onChange={(e) => handleFilterChange('area', e.target.value)}
                  >
                    <option>Todas</option>
                    <option>Desenvolvimento</option>
                    <option>Consultoria</option>
                    <option>Suporte</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Nível de Experiência</label>
                  <select 
                    className="w-full px-3 py-2 border-2 rounded-md focus:border-[#F7941D] focus:outline-none"
                    value={filters.level}
                    onChange={(e) => handleFilterChange('level', e.target.value)}
                  >
                    <option>Todos</option>
                    <option>Júnior</option>
                    <option>Pleno</option>
                    <option>Sênior</option>
                  </select>
                </div>
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
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Faixa Salarial</label>
                  <select 
                    className="w-full px-3 py-2 border-2 rounded-md focus:border-[#F7941D] focus:outline-none"
                    value={filters.salary}
                    onChange={(e) => handleFilterChange('salary', e.target.value)}
                  >
                    <option>Todas</option>
                    <option>Até R$ 5.000</option>
                    <option>R$ 5.000 - R$ 8.000</option>
                    <option>R$ 8.000 - R$ 12.000</option>
                    <option>Acima de R$ 12.000</option>
                  </select>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 bg-[#F7941D] hover:bg-[#e8850d] text-white font-semibold h-11"
                    onClick={() => {/* Filtros já são aplicados automaticamente */}}
                  >
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
                      Encontradas <span className="font-bold text-[#F7941D]">{filteredJobs.length} {filteredJobs.length === 1 ? 'vaga' : 'vagas'}</span>
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
                    <option value="match">Match %</option>
                    <option value="salary">Maior Salário</option>
                    <option value="date">Mais Recentes</option>
                  </select>
                </div>
              </div>

              {/* Badges de filtros ativos */}
              {activeFilters.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <span className="text-sm font-semibold text-[#1F3B47] mr-2">Filtros ativos:</span>
                  {activeFilters.map((filter, idx) => (
                    <Badge 
                      key={idx}
                      className="bg-[#1F3B47] text-white font-medium px-3 py-1 flex items-center gap-2 cursor-pointer hover:bg-[#2a5261]"
                      onClick={() => removeFilter(filter.key)}
                    >
                      {filter.label}
                      <X className="w-3 h-3" />
                    </Badge>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold"
                    onClick={clearFilters}
                  >
                    Limpar todos
                  </Button>
                </div>
              )}
            </div>

            {loading ? (
              <Card className="p-8 text-center">
                <Loader2 className="w-12 h-12 animate-spin text-[#F7941D] mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Carregando vagas...</p>
              </Card>
            ) : error ? (
              <Card className="p-8 text-center">
                <p className="text-red-600 text-lg mb-4">❌ {error}</p>
                <Button 
                  className="bg-[#F7941D] hover:bg-[#e8850d] text-white"
                  onClick={() => window.location.reload()}
                >
                  Tentar Novamente
                </Button>
              </Card>
            ) : filteredJobs.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-600 text-lg">Nenhuma vaga encontrada com os filtros selecionados.</p>
                <Button 
                  className="mt-4 bg-[#F7941D] hover:bg-[#e8850d] text-white"
                  onClick={clearFilters}
                >
                  Limpar Filtros
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredJobs.map((job) => (
                  <Link key={job.id} to={`/vagas/${job.id}`}>
                    <Card className="hover:shadow-2xl transition-all duration-300 border-2 hover:border-[#F7941D]/50 bg-gradient-to-r from-white to-gray-50">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-[#1F3B47] mb-3 hover:text-[#F7941D] transition-colors">
                              {job.title}
                            </h3>
                            <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                              <span className="flex items-center gap-2 font-medium">
                                <Building2 className="w-4 h-4" />
                                {job.company}
                              </span>
                              <span className="flex items-center gap-2 font-medium">
                                <MapPin className="w-4 h-4" />
                                {job.location}
                              </span>
                              {job.contractType !== 'Não especificado' && (
                                <Badge variant="outline" className="font-semibold">
                                  {job.contractType}
                                </Badge>
                              )}
                            </div>
                            {job.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {job.tags.map((tag, idx) => (
                                  <Badge 
                                    key={idx} 
                                    className="bg-[#F7941D] hover:bg-[#e8850d] text-white font-semibold px-3 py-1"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-6 text-sm">
                              <span className="flex items-center gap-2 text-gray-700 font-medium">
                                <Clock className="w-4 h-4" />
                                {job.type}
                              </span>
                              <span className="flex items-center gap-2 text-gray-700 font-medium">
                                <DollarSign className="w-4 h-4" />
                                {job.salary}
                              </span>
                            </div>
                          </div>
                          <div className="text-center ml-6">
                            <div className="text-5xl font-bold text-[#F7941D] mb-1">
                              {job.match}%
                            </div>
                            <div className="text-sm text-gray-600 font-medium">Match</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

