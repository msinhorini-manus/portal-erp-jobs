import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Linkedin, Github, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function CompanySearchPage() {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    keywords: '',
    location: '',
    level: '',
    salary: '',
    technology: '',
    availability: ''
  })

  useEffect(() => {
    fetchCandidates()
  }, [])

  const fetchCandidates = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/candidates/public`)
      if (!response.ok) {
        throw new Error('Erro ao buscar candidatos')
      }
      const data = await response.json()
      setCandidates(data.candidates || [])
    } catch (err) {
      console.error('Erro ao buscar candidatos:', err)
      setError(err.message)
      // Fallback para dados mockados se a API falhar
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }

  const filteredCandidates = candidates.filter(candidate => {
    if (filters.keywords) {
      const keywords = filters.keywords.toLowerCase()
      const matchName = candidate.name?.toLowerCase().includes(keywords)
      const matchTitle = candidate.title?.toLowerCase().includes(keywords)
      const matchTechs = candidate.technologies?.some(t =>
        t.name?.toLowerCase().includes(keywords)
      )
      if (!matchName && !matchTitle && !matchTechs) return false
    }
    if (filters.location && !candidate.location?.toLowerCase().includes(filters.location.toLowerCase())) {
      return false
    }
    return true
  })

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  const getTechnologyTags = (candidate) => {
    if (candidate.technologies && candidate.technologies.length > 0) {
      return candidate.technologies.slice(0, 4).map(t => t.name || t)
    }
    return []
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1F3B47] text-white shadow-md">
        <div className="container mx-auto px-6 py-4">
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
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="flex gap-8">
          <aside className="w-80 space-y-6">
            <Card className="border-2 shadow-lg">
              <div className="bg-[#1F3B47] text-white rounded-t-lg p-4">
                <h2 className="text-lg font-bold">Filtros Avançados</h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Palavras-chave</label>
                  <Input
                    type="text"
                    placeholder="Ex: React, Python"
                    className="w-full border-2 focus:border-[#F7941D]"
                    value={filters.keywords}
                    onChange={(e) => setFilters({...filters, keywords: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Localidade</label>
                  <Input
                    type="text"
                    placeholder="Cidade"
                    className="w-full border-2 focus:border-[#F7941D]"
                    value={filters.location}
                    onChange={(e) => setFilters({...filters, location: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Nível de Experiência</label>
                  <select
                    className="w-full px-3 py-2 border-2 rounded-md focus:border-[#F7941D] focus:outline-none"
                    value={filters.level}
                    onChange={(e) => setFilters({...filters, level: e.target.value})}
                  >
                    <option value="">Todos os níveis</option>
                    <option value="junior">Júnior</option>
                    <option value="pleno">Pleno</option>
                    <option value="senior">Sênior</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Faixa Salarial</label>
                  <select
                    className="w-full px-3 py-2 border-2 rounded-md focus:border-[#F7941D] focus:outline-none"
                    value={filters.salary}
                    onChange={(e) => setFilters({...filters, salary: e.target.value})}
                  >
                    <option value="">Todas as faixas</option>
                    <option value="5000">Até R$ 5.000</option>
                    <option value="8000">R$ 5.000 - R$ 8.000</option>
                    <option value="12000">R$ 8.000 - R$ 12.000</option>
                    <option value="12001">Acima de R$ 12.000</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Tecnologias</label>
                  <select
                    className="w-full px-3 py-2 border-2 rounded-md focus:border-[#F7941D] focus:outline-none"
                    value={filters.technology}
                    onChange={(e) => setFilters({...filters, technology: e.target.value})}
                  >
                    <option value="">Todas as tecnologias</option>
                    <option value="React">React</option>
                    <option value="Python">Python</option>
                    <option value="Java">Java</option>
                    <option value="SAP">SAP</option>
                    <option value="TOTVS">TOTVS</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Disponibilidade</label>
                  <select
                    className="w-full px-3 py-2 border-2 rounded-md focus:border-[#F7941D] focus:outline-none"
                    value={filters.availability}
                    onChange={(e) => setFilters({...filters, availability: e.target.value})}
                  >
                    <option value="">Todas</option>
                    <option value="imediata">Imediata</option>
                    <option value="30">30 dias</option>
                    <option value="60">60 dias</option>
                  </select>
                </div>
              </div>
            </Card>
          </aside>

          <main className="flex-1">
            <h1 className="text-3xl font-bold mb-6 text-[#1F3B47]">Busca de Candidatos</h1>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#F7941D]" />
                <span className="ml-2 text-gray-600">Carregando candidatos...</span>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">Nenhum candidato encontrado com os filtros selecionados.</p>
                <p className="text-gray-500 mt-2">Tente ajustar os filtros ou aguarde novos cadastros.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredCandidates.map((candidate) => (
                  <Link key={candidate.id} to={`/candidato/${candidate.id}`}>
                    <Card className="hover:shadow-2xl transition-all duration-300 border-2 hover:border-[#F7941D]/50 h-full">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-16 h-16 bg-[#1F3B47] rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                            {getInitials(candidate.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-[#1F3B47] mb-1 hover:text-[#F7941D] transition-colors truncate">
                              {candidate.name}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2 font-medium">{candidate.title || candidate.cargo || 'Profissional'}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {candidate.location || candidate.cidade || 'Brasil'}
                            </p>
                          </div>
                          {candidate.match && (
                            <div className="text-center flex-shrink-0">
                              <div className="text-3xl font-bold text-[#F7941D]">{candidate.match}%</div>
                              <div className="text-xs text-gray-600 font-medium">Match</div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {getTechnologyTags(candidate).map((tag, idx) => (
                            <Badge key={idx} className="bg-[#F7941D] hover:bg-[#e8850d] text-white font-semibold">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="flex gap-2">
                            {candidate.linkedin && (
                              <Button size="sm" variant="ghost" className="hover:bg-[#F7941D]/10">
                                <Linkedin className="w-4 h-4 text-[#0077B5]" />
                              </Button>
                            )}
                            {candidate.github && (
                              <Button size="sm" variant="ghost" className="hover:bg-[#F7941D]/10">
                                <Github className="w-4 h-4 text-[#333]" />
                              </Button>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-[#F7941D] hover:bg-[#e8850d] text-white font-semibold">
                              Contactar
                            </Button>
                            <Button size="sm" variant="outline" className="border-[#1F3B47] text-[#1F3B47] hover:bg-[#1F3B47] hover:text-white font-semibold">
                              Salvar
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Pretensão salarial:</span>
                            <span className="font-bold text-[#1F3B47]">
                              {candidate.pretensao_salarial ? `R$ ${candidate.pretensao_salarial.toLocaleString('pt-BR')}` : 'A combinar'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Disponibilidade:</span>
                            <span className="font-semibold text-green-600">
                              {candidate.disponibilidade || 'Imediata'}
                            </span>
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
