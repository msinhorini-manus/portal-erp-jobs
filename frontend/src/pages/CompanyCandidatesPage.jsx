import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Search, MapPin, Briefcase, Mail, Phone, ExternalLink, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

const API_BASE = import.meta.env.VITE_API_URL || 'https://jobs.portalerp.com.br/api'

export default function CompanyCandidatesPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [applications, setApplications] = useState([])

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/jobs/my-jobs/applications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setApplications(data.applications || [])
      }
    } catch (err) {
      console.error('Erro ao carregar candidaturas:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredApplications = applications.filter(app => 
    app.candidate_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.job_title?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F7941D]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#1F3B47] rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Candidatos</h1>
                <p className="text-gray-500">Gerencie as candidaturas das suas vagas</p>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar candidato ou vaga..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total de Candidaturas</p>
                <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pendentes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {applications.filter(a => a.status === 'pending').length}
                </p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Filter className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Em Análise</p>
                <p className="text-2xl font-bold text-gray-900">
                  {applications.filter(a => a.status === 'reviewing').length}
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Candidates List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {filteredApplications.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {applications.length === 0 ? 'Nenhuma candidatura ainda' : 'Nenhum resultado encontrado'}
              </h3>
              <p className="text-gray-500 mb-6">
                {applications.length === 0 
                  ? 'Quando candidatos se inscreverem nas suas vagas, eles aparecerão aqui.'
                  : 'Tente ajustar os filtros de busca.'}
              </p>
              {applications.length === 0 && (
                <Button 
                  onClick={() => navigate('/empresa/publicar-vaga')}
                  className="bg-[#F7941D] hover:bg-[#e8850d]"
                >
                  Publicar Nova Vaga
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredApplications.map((application, index) => (
                <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-[#1F3B47] rounded-full flex items-center justify-center text-white font-bold">
                        {application.candidate_name?.charAt(0)?.toUpperCase() || 'C'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{application.candidate_name || 'Candidato'}</h3>
                        <p className="text-sm text-gray-500 mb-2">
                          Candidatou-se para: <span className="font-medium text-[#F7941D]">{application.job_title}</span>
                        </p>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                          {application.candidate_email && (
                            <span className="flex items-center gap-1">
                              <Mail size={14} />
                              {application.candidate_email}
                            </span>
                          )}
                          {application.candidate_phone && (
                            <span className="flex items-center gap-1">
                              <Phone size={14} />
                              {application.candidate_phone}
                            </span>
                          )}
                          {application.candidate_city && (
                            <span className="flex items-center gap-1">
                              <MapPin size={14} />
                              {application.candidate_city}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        application.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        application.status === 'reviewing' ? 'bg-blue-100 text-blue-700' :
                        application.status === 'approved' ? 'bg-green-100 text-green-700' :
                        application.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {application.status === 'pending' ? 'Pendente' :
                         application.status === 'reviewing' ? 'Em Análise' :
                         application.status === 'approved' ? 'Aprovado' :
                         application.status === 'rejected' ? 'Rejeitado' :
                         application.status}
                      </span>
                      
                      {application.candidate_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/candidato/perfil/${application.candidate_id}`)}
                          className="gap-1"
                        >
                          <ExternalLink size={14} />
                          Ver Perfil
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botão Voltar */}
        <div className="mt-6">
          <Button 
            onClick={() => navigate('/empresa/dashboard')}
            variant="outline"
            className="gap-2"
          >
            ← Voltar ao Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
