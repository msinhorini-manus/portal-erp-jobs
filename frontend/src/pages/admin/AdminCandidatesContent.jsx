import { useState, useEffect } from 'react'
import { Users, Search, Eye, Mail, Phone, MapPin, ToggleLeft, ToggleRight, X, Plus, Edit2, Trash2, Save, Briefcase, GraduationCap, Link as LinkIcon } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export default function AdminCandidatesContent() {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({})
  const [createData, setCreateData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    current_title: '',
    experience_level: '',
    linkedin_url: '',
    github_url: ''
  })

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

  const createCandidate = async () => {
    if (!createData.first_name || !createData.last_name || !createData.email) {
      toast.error('Nome, sobrenome e email são obrigatórios')
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createData)
      })

      if (response.ok) {
        toast.success('Candidato criado com sucesso')
        setShowCreateModal(false)
        setCreateData({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          city: '',
          state: '',
          current_title: '',
          experience_level: '',
          linkedin_url: '',
          github_url: ''
        })
        loadCandidates()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao criar candidato')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao conectar com o servidor')
    }
  }

  const deleteCandidate = async (candidateId) => {
    if (!confirm('Tem certeza que deseja excluir este candidato? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/candidates/${candidateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        toast.success('Candidato excluído com sucesso')
        loadCandidates()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao excluir candidato')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao conectar com o servidor')
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
        setEditData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          city: data.city || '',
          state: data.state || '',
          current_title: data.current_title || '',
          experience_level: data.experience_level || '',
          linkedin_url: data.linkedin_url || '',
          github_url: data.github_url || ''
        })
        setShowModal(true)
        setEditMode(false)
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao carregar detalhes')
    }
  }

  const saveCandidateSettings = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/candidates/${selectedCandidate.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editData)
      })

      if (response.ok) {
        toast.success('Candidato atualizado com sucesso')
        setEditMode(false)
        loadCandidates()
        setSelectedCandidate({
          ...selectedCandidate,
          ...editData,
          name: `${editData.first_name} ${editData.last_name}`
        })
      } else {
        toast.error('Erro ao salvar alterações')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao conectar com o servidor')
    }
  }

  const filteredCandidates = candidates.filter(candidate =>
    candidate.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando candidatos...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Candidatos</h1>
          <p className="text-gray-600">{candidates.length} candidatos cadastrados</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#F7941D] text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Candidato
        </button>
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
                        <p className="text-sm text-gray-500">{candidate.current_title || 'Sem cargo definido'}</p>
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => viewCandidateDetails(candidate.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver/Editar"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteCandidate(candidate.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Criar Candidato */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Novo Candidato</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={createData.first_name}
                    onChange={(e) => setCreateData({...createData, first_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Nome"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sobrenome *</label>
                  <input
                    type="text"
                    value={createData.last_name}
                    onChange={(e) => setCreateData({...createData, last_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Sobrenome"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={createData.email}
                    onChange={(e) => setCreateData({...createData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={createData.phone}
                    onChange={(e) => setCreateData({...createData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={createData.city}
                    onChange={(e) => setCreateData({...createData, city: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="São Paulo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={createData.state}
                    onChange={(e) => setCreateData({...createData, state: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    <option value="AC">Acre</option>
                    <option value="AL">Alagoas</option>
                    <option value="AP">Amapá</option>
                    <option value="AM">Amazonas</option>
                    <option value="BA">Bahia</option>
                    <option value="CE">Ceará</option>
                    <option value="DF">Distrito Federal</option>
                    <option value="ES">Espírito Santo</option>
                    <option value="GO">Goiás</option>
                    <option value="MA">Maranhão</option>
                    <option value="MT">Mato Grosso</option>
                    <option value="MS">Mato Grosso do Sul</option>
                    <option value="MG">Minas Gerais</option>
                    <option value="PA">Pará</option>
                    <option value="PB">Paraíba</option>
                    <option value="PR">Paraná</option>
                    <option value="PE">Pernambuco</option>
                    <option value="PI">Piauí</option>
                    <option value="RJ">Rio de Janeiro</option>
                    <option value="RN">Rio Grande do Norte</option>
                    <option value="RS">Rio Grande do Sul</option>
                    <option value="RO">Rondônia</option>
                    <option value="RR">Roraima</option>
                    <option value="SC">Santa Catarina</option>
                    <option value="SP">São Paulo</option>
                    <option value="SE">Sergipe</option>
                    <option value="TO">Tocantins</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo Atual</label>
                  <input
                    type="text"
                    value={createData.current_title}
                    onChange={(e) => setCreateData({...createData, current_title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Desenvolvedor Full Stack"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nível de Experiência</label>
                  <select
                    value={createData.experience_level}
                    onChange={(e) => setCreateData({...createData, experience_level: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    <option value="junior">Júnior</option>
                    <option value="pleno">Pleno</option>
                    <option value="senior">Sênior</option>
                    <option value="especialista">Especialista</option>
                    <option value="gerente">Gerente</option>
                    <option value="diretor">Diretor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                  <input
                    type="url"
                    value={createData.linkedin_url}
                    onChange={(e) => setCreateData({...createData, linkedin_url: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="https://linkedin.com/in/usuario"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GitHub</label>
                  <input
                    type="url"
                    value={createData.github_url}
                    onChange={(e) => setCreateData({...createData, github_url: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="https://github.com/usuario"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={createCandidate}
                  className="px-4 py-2 bg-[#F7941D] text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Criar Candidato
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes/Editar */}
      {showModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editMode ? 'Editar Candidato' : 'Detalhes do Candidato'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {editMode ? (
                /* Modo de Edição */
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input
                      type="text"
                      value={editData.first_name}
                      onChange={(e) => setEditData({...editData, first_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sobrenome</label>
                    <input
                      type="text"
                      value={editData.last_name}
                      onChange={(e) => setEditData({...editData, last_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({...editData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                    <input
                      type="text"
                      value={editData.phone}
                      onChange={(e) => setEditData({...editData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={editData.city}
                      onChange={(e) => setEditData({...editData, city: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select
                      value={editData.state}
                      onChange={(e) => setEditData({...editData, state: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Selecione...</option>
                      <option value="AC">Acre</option>
                      <option value="AL">Alagoas</option>
                      <option value="AP">Amapá</option>
                      <option value="AM">Amazonas</option>
                      <option value="BA">Bahia</option>
                      <option value="CE">Ceará</option>
                      <option value="DF">Distrito Federal</option>
                      <option value="ES">Espírito Santo</option>
                      <option value="GO">Goiás</option>
                      <option value="MA">Maranhão</option>
                      <option value="MT">Mato Grosso</option>
                      <option value="MS">Mato Grosso do Sul</option>
                      <option value="MG">Minas Gerais</option>
                      <option value="PA">Pará</option>
                      <option value="PB">Paraíba</option>
                      <option value="PR">Paraná</option>
                      <option value="PE">Pernambuco</option>
                      <option value="PI">Piauí</option>
                      <option value="RJ">Rio de Janeiro</option>
                      <option value="RN">Rio Grande do Norte</option>
                      <option value="RS">Rio Grande do Sul</option>
                      <option value="RO">Rondônia</option>
                      <option value="RR">Roraima</option>
                      <option value="SC">Santa Catarina</option>
                      <option value="SP">São Paulo</option>
                      <option value="SE">Sergipe</option>
                      <option value="TO">Tocantins</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cargo Atual</label>
                    <input
                      type="text"
                      value={editData.current_title}
                      onChange={(e) => setEditData({...editData, current_title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nível</label>
                    <select
                      value={editData.experience_level}
                      onChange={(e) => setEditData({...editData, experience_level: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Selecione...</option>
                      <option value="junior">Júnior</option>
                      <option value="pleno">Pleno</option>
                      <option value="senior">Sênior</option>
                      <option value="especialista">Especialista</option>
                      <option value="gerente">Gerente</option>
                      <option value="diretor">Diretor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                    <input
                      type="url"
                      value={editData.linkedin_url}
                      onChange={(e) => setEditData({...editData, linkedin_url: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GitHub</label>
                    <input
                      type="url"
                      value={editData.github_url}
                      onChange={(e) => setEditData({...editData, github_url: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ) : (
                /* Modo de Visualização */
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nome</label>
                    <p className="text-gray-900">{selectedCandidate.name || `${selectedCandidate.first_name} ${selectedCandidate.last_name}`}</p>
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
                    <label className="text-sm font-medium text-gray-500">Cargo Atual</label>
                    <p className="text-gray-900">{selectedCandidate.current_title || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nível</label>
                    <p className="text-gray-900">{selectedCandidate.experience_level || '-'}</p>
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
                  {selectedCandidate.linkedin_url && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">LinkedIn</label>
                      <a href={selectedCandidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                        <LinkIcon className="w-4 h-4" />
                        Ver perfil
                      </a>
                    </div>
                  )}
                  {selectedCandidate.github_url && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">GitHub</label>
                      <a href={selectedCandidate.github_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                        <LinkIcon className="w-4 h-4" />
                        Ver perfil
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                {editMode ? (
                  <>
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveCandidateSettings}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Salvar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Fechar
                    </button>
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
