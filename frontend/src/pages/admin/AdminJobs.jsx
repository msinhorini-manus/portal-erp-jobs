import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, Search, Eye, CheckCircle, XCircle, Clock, Building2, MapPin, DollarSign, Star, X } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import AdminSidebar from '../../components/admin/AdminSidebar'

export default function AdminJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedJob, setSelectedJob] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/admin/jobs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs || [])
      } else {
        toast.error('Erro ao carregar vagas')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  const updateJobStatus = async (jobId, newStatus) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/jobs/${jobId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        const statusMessages = {
          'approved': 'Vaga aprovada com sucesso',
          'rejected': 'Vaga rejeitada',
          'pending': 'Vaga marcada como pendente',
          'featured': 'Vaga destacada'
        }
        toast.success(statusMessages[newStatus] || 'Status atualizado')
        loadJobs()
        setShowModal(false)
      } else {
        toast.error('Erro ao atualizar status')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao conectar com o servidor')
    }
  }

  const toggleFeatured = async (jobId, currentFeatured) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/jobs/${jobId}/featured`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_featured: !currentFeatured })
      })

      if (response.ok) {
        toast.success(currentFeatured ? 'Destaque removido' : 'Vaga destacada')
        loadJobs()
      } else {
        toast.error('Erro ao atualizar destaque')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao conectar com o servidor')
    }
  }

  const viewJobDetails = async (jobId) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSelectedJob(data)
        setShowModal(true)
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao carregar detalhes')
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      'active': { bg: 'bg-green-100', text: 'text-green-800', label: 'Ativa' },
      'approved': { bg: 'bg-green-100', text: 'text-green-800', label: 'Aprovada' },
      'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendente' },
      'rejected': { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejeitada' },
      'closed': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Encerrada' }
    }
    const config = statusConfig[status] || statusConfig['pending']
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const filteredJobs = jobs.filter(job => {
    const matchesSearch =
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || job.status === statusFilter

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando vagas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      <div className="flex">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Vagas</h1>
            <p className="text-gray-600">{jobs.length} vagas cadastradas</p>
          </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por título ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativas</option>
              <option value="pending">Pendentes</option>
              <option value="rejected">Rejeitadas</option>
              <option value="closed">Encerradas</option>
            </select>
          </div>
        </div>

        {/* Jobs Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Vaga</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Empresa</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Localização</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Salário</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhuma vaga encontrada</p>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {job.is_featured && (
                          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{job.title}</p>
                          <p className="text-sm text-gray-500">{job.area} • {job.level}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{job.company_name || 'Empresa'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        {job.location || 'Não informado'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <DollarSign className="w-4 h-4" />
                        {job.salary_min && job.salary_max
                          ? `R$ ${job.salary_min.toLocaleString('pt-BR')} - ${job.salary_max.toLocaleString('pt-BR')}`
                          : 'A combinar'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(job.status || 'active')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewJobDetails(job.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => updateJobStatus(job.id, 'approved')}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Aprovar"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => updateJobStatus(job.id, 'rejected')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Rejeitar"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => toggleFeatured(job.id, job.is_featured)}
                          className={`p-2 rounded-lg transition-colors ${
                            job.is_featured
                              ? 'text-yellow-600 hover:bg-yellow-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={job.is_featured ? 'Remover destaque' : 'Destacar'}
                        >
                          <Star className={`w-5 h-5 ${job.is_featured ? 'fill-yellow-500' : ''}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </main>
      </div>

      {/* Modal de Detalhes */}
      {showModal && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedJob.title}</h2>
                  <p className="text-gray-600">{selectedJob.company_name}</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Informações Básicas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-sm text-gray-500">Área</label>
                  <p className="font-medium">{selectedJob.area || 'Não informado'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-sm text-gray-500">Nível</label>
                  <p className="font-medium">{selectedJob.level || 'Não informado'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-sm text-gray-500">Modalidade</label>
                  <p className="font-medium">{selectedJob.modality || 'Não informado'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-sm text-gray-500">Contratação</label>
                  <p className="font-medium">{selectedJob.contract_type || 'Não informado'}</p>
                </div>
              </div>

              {/* Salário */}
              <div className="bg-green-50 p-4 rounded-lg">
                <label className="text-sm text-green-600">Faixa Salarial</label>
                <p className="text-xl font-bold text-green-700">
                  {selectedJob.salary_min && selectedJob.salary_max
                    ? `R$ ${selectedJob.salary_min.toLocaleString('pt-BR')} - R$ ${selectedJob.salary_max.toLocaleString('pt-BR')}`
                    : 'A combinar'
                  }
                </p>
              </div>

              {/* Descrição */}
              {selectedJob.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Descrição</h3>
                  <p className="text-gray-700 whitespace-pre-line">{selectedJob.description}</p>
                </div>
              )}

              {/* Requisitos */}
              {selectedJob.requirements && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Requisitos</h3>
                  <p className="text-gray-700 whitespace-pre-line">{selectedJob.requirements}</p>
                </div>
              )}

              {/* Benefícios */}
              {selectedJob.benefits && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Benefícios</h3>
                  <p className="text-gray-700 whitespace-pre-line">{selectedJob.benefits}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => updateJobStatus(selectedJob.id, 'approved')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Aprovar
                </button>
                <button
                  onClick={() => updateJobStatus(selectedJob.id, 'rejected')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Rejeitar
                </button>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
