import { useState, useEffect } from 'react'
import { Users, Search, Eye, Mail, Phone, MapPin, Calendar, Briefcase, ToggleLeft, ToggleRight, X } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import AdminSidebar from '../../components/admin/AdminSidebar'

export default function AdminCandidates() {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadCandidates()
  }, [])

  const loadCandidates = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/admin/candidates', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setCandidates(data.candidates || [])
      } else {
        toast.error('Erro ao carregar candidatos')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  const toggleCandidateStatus = async (candidateId, currentStatus) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/candidates/${candidateId}/toggle-status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !currentStatus })
      })

      if (response.ok) {
        toast.success(currentStatus ? 'Candidato desativado' : 'Candidato ativado')
        loadCandidates()
      } else {
        toast.error('Erro ao atualizar status')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao conectar com o servidor')
    }
  }

  const viewCandidateDetails = async (candidateId) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/candidates/${candidateId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSelectedCandidate(data)
        setShowModal(true)
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao carregar detalhes')
    }
  }

  const filteredCandidates = candidates.filter(candidate =>
    candidate.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando candidatos...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Candidatos</h1>
            <p className="text-gray-600">{candidates.length} candidatos cadastrados</p>
          </div>

          {/* Search */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Candidates Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Candidato</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Contato</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Localização</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Candidaturas</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Nenhum candidato encontrado</p>
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-orange-600 font-semibold">
                              {candidate.full_name?.charAt(0) || 'C'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{candidate.full_name}</p>
                            <p className="text-sm text-gray-500">ID: {candidate.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            {candidate.email}
                          </div>
                          {candidate.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4" />
                              {candidate.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {candidate.city && candidate.state ? (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4" />
                            {candidate.city}, {candidate.state}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {candidate.applications_count || 0} candidaturas
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleCandidateStatus(candidate.id, candidate.is_active)}
                          className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            candidate.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {candidate.is_active ? (
                            <>
                              <ToggleRight className="w-4 h-4" />
                              Ativo
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4" />
                              Inativo
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => viewCandidateDetails(candidate.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
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
      {showModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Detalhes do Candidato</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nome</label>
                  <p className="text-gray-900">{selectedCandidate.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{selectedCandidate.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Telefone</label>
                  <p className="text-gray-900">{selectedCandidate.phone || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Localização</label>
                  <p className="text-gray-900">
                    {selectedCandidate.city && selectedCandidate.state
                      ? `${selectedCandidate.city}, ${selectedCandidate.state}`
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className={`font-medium ${selectedCandidate.is_active ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedCandidate.is_active ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Candidaturas</label>
                  <p className="text-gray-900">{selectedCandidate.applications_count || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
