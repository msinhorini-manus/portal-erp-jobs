import { useState, useEffect } from 'react'
import { Briefcase, Search, Eye, Building2, MapPin, Calendar, ToggleLeft, ToggleRight, X, Users, Plus, Edit2, Trash2, Save, DollarSign, Clock } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export default function AdminJobsContent() {
  const [jobs, setJobs] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedJob, setSelectedJob] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({})
  const [createData, setCreateData] = useState({
    title: '',
    company_id: '',
    description: '',
    requirements: '',
    benefits: '',
    city: '',
    state: '',
    modality: '',
    contract_type: '',
    experience_level: '',
    salary_min: '',
    salary_max: '',
    salary_visible: true
  })

  useEffect(() => {
    loadJobs()
    loadCompanies()
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

  const loadCompanies = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/admin/companies', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setCompanies(data.companies || [])
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error)
    }
  }

  const createJob = async () => {
    if (!createData.title || !createData.company_id) {
      toast.error('Título e empresa são obrigatórios')
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/admin/jobs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createData)
      })

      if (response.ok) {
        toast.success('Vaga criada com sucesso')
        setShowCreateModal(false)
        setCreateData({
          title: '',
          company_id: '',
          description: '',
          requirements: '',
          benefits: '',
          city: '',
          state: '',
          modality: '',
          contract_type: '',
          experience_level: '',
          salary_min: '',
          salary_max: '',
          salary_visible: true
        })
        loadJobs()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao criar vaga')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao conectar com o servidor')
    }
  }

  const deleteJob = async (jobId) => {
    if (!confirm('Tem certeza que deseja excluir esta vaga? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        toast.success('Vaga excluída com sucesso')
        loadJobs()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao excluir vaga')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao conectar com o servidor')
    }
  }

  const toggleJobStatus = async (jobId, currentStatus) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/jobs/${jobId}/toggle-status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !currentStatus })
      })

      if (response.ok) {
        toast.success(currentStatus ? 'Vaga desativada' : 'Vaga ativada')
        loadJobs()
      } else {
        toast.error('Erro ao atualizar status')
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
        setEditData({
          title: data.title || '',
          description: data.description || '',
          requirements: data.requirements || '',
          benefits: data.benefits || '',
          city: data.city || '',
          state: data.state || '',
          modality: data.modality || '',
          contract_type: data.contract_type || '',
          experience_level: data.experience_level || '',
          salary_min: data.salary_min || '',
          salary_max: data.salary_max || '',
          salary_visible: data.salary_visible !== false
        })
        setShowModal(true)
        setEditMode(false)
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao carregar detalhes')
    }
  }

  const saveJobSettings = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/jobs/${selectedJob.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editData)
      })

      if (response.ok) {
        toast.success('Vaga atualizada com sucesso')
        setEditMode(false)
        loadJobs()
        setSelectedJob({
          ...selectedJob,
          ...editData
        })
      } else {
        toast.error('Erro ao salvar alterações')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao conectar com o servidor')
    }
  }

  const filteredJobs = jobs.filter(job =>
    job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando vagas...</p>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Vagas</h1>
          <p className="text-gray-600">{jobs.length} vagas cadastradas</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#F7941D] text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Vaga
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por título ou empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
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
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Candidaturas</th>
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
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{job.title}</p>
                        <p className="text-sm text-gray-500">{job.modality || 'Não informado'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 className="w-4 h-4" />
                      {job.company_name || 'Empresa não informada'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {job.city && job.state ? (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        {job.city}, {job.state}
                      </div>
                    ) : job.modality ? (
                      <span className="text-sm text-gray-600">{job.modality}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {job.applications_count || 0} candidaturas
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleJobStatus(job.id, job.is_active)}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        job.is_active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {job.is_active ? (
                        <>
                          <ToggleRight className="w-4 h-4" />
                          Ativa
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4" />
                          Inativa
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => viewJobDetails(job.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver/Editar"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteJob(job.id)}
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

      {/* Modal de Criar Vaga */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Nova Vaga</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título da Vaga *</label>
                  <input
                    type="text"
                    value={createData.title}
                    onChange={(e) => setCreateData({...createData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Ex: Desenvolvedor Full Stack Sênior"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empresa *</label>
                  <select
                    value={createData.company_id}
                    onChange={(e) => setCreateData({...createData, company_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Selecione uma empresa...</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>{company.company_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modalidade</label>
                  <select
                    value={createData.modality}
                    onChange={(e) => setCreateData({...createData, modality: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    <option value="Presencial">Presencial</option>
                    <option value="Remoto">Remoto</option>
                    <option value="Híbrido">Híbrido</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Contrato</label>
                  <select
                    value={createData.contract_type}
                    onChange={(e) => setCreateData({...createData, contract_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    <option value="CLT">CLT</option>
                    <option value="PJ">PJ</option>
                    <option value="Estágio">Estágio</option>
                    <option value="Freelancer">Freelancer</option>
                    <option value="Temporário">Temporário</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nível de Experiência</label>
                  <select
                    value={createData.experience_level}
                    onChange={(e) => setCreateData({...createData, experience_level: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    <option value="Estágio">Estágio</option>
                    <option value="Júnior">Júnior</option>
                    <option value="Pleno">Pleno</option>
                    <option value="Sênior">Sênior</option>
                    <option value="Especialista">Especialista</option>
                    <option value="Gerente">Gerente</option>
                    <option value="Diretor">Diretor</option>
                  </select>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salário Mínimo (R$)</label>
                  <input
                    type="number"
                    value={createData.salary_min}
                    onChange={(e) => setCreateData({...createData, salary_min: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salário Máximo (R$)</label>
                  <input
                    type="number"
                    value={createData.salary_max}
                    onChange={(e) => setCreateData({...createData, salary_max: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="10000"
                  />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={createData.salary_visible}
                      onChange={(e) => setCreateData({...createData, salary_visible: e.target.checked})}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700">Exibir salário na vaga</span>
                  </label>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição da Vaga</label>
                  <textarea
                    value={createData.description}
                    onChange={(e) => setCreateData({...createData, description: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Descreva as responsabilidades e atividades da vaga..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requisitos</label>
                  <textarea
                    value={createData.requirements}
                    onChange={(e) => setCreateData({...createData, requirements: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Liste os requisitos necessários para a vaga..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Benefícios</label>
                  <textarea
                    value={createData.benefits}
                    onChange={(e) => setCreateData({...createData, benefits: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Liste os benefícios oferecidos..."
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
                  onClick={createJob}
                  className="px-4 py-2 bg-[#F7941D] text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Criar Vaga
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes/Editar */}
      {showModal && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editMode ? 'Editar Vaga' : 'Detalhes da Vaga'}
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
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Título da Vaga</label>
                    <input
                      type="text"
                      value={editData.title}
                      onChange={(e) => setEditData({...editData, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modalidade</label>
                    <select
                      value={editData.modality}
                      onChange={(e) => setEditData({...editData, modality: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Selecione...</option>
                      <option value="Presencial">Presencial</option>
                      <option value="Remoto">Remoto</option>
                      <option value="Híbrido">Híbrido</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Contrato</label>
                    <select
                      value={editData.contract_type}
                      onChange={(e) => setEditData({...editData, contract_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Selecione...</option>
                      <option value="CLT">CLT</option>
                      <option value="PJ">PJ</option>
                      <option value="Estágio">Estágio</option>
                      <option value="Freelancer">Freelancer</option>
                      <option value="Temporário">Temporário</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nível</label>
                    <select
                      value={editData.experience_level}
                      onChange={(e) => setEditData({...editData, experience_level: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Selecione...</option>
                      <option value="Estágio">Estágio</option>
                      <option value="Júnior">Júnior</option>
                      <option value="Pleno">Pleno</option>
                      <option value="Sênior">Sênior</option>
                      <option value="Especialista">Especialista</option>
                      <option value="Gerente">Gerente</option>
                      <option value="Diretor">Diretor</option>
                    </select>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salário Mínimo (R$)</label>
                    <input
                      type="number"
                      value={editData.salary_min}
                      onChange={(e) => setEditData({...editData, salary_min: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salário Máximo (R$)</label>
                    <input
                      type="number"
                      value={editData.salary_max}
                      onChange={(e) => setEditData({...editData, salary_max: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editData.salary_visible}
                        onChange={(e) => setEditData({...editData, salary_visible: e.target.checked})}
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">Exibir salário na vaga</span>
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                    <textarea
                      value={editData.description}
                      onChange={(e) => setEditData({...editData, description: e.target.value})}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Requisitos</label>
                    <textarea
                      value={editData.requirements}
                      onChange={(e) => setEditData({...editData, requirements: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Benefícios</label>
                    <textarea
                      value={editData.benefits}
                      onChange={(e) => setEditData({...editData, benefits: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ) : (
                /* Modo de Visualização */
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-500">Título</label>
                      <p className="text-gray-900 text-lg font-semibold">{selectedJob.title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Empresa</label>
                      <p className="text-gray-900">{selectedJob.company_name || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Modalidade</label>
                      <p className="text-gray-900">{selectedJob.modality || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Localização</label>
                      <p className="text-gray-900">
                        {selectedJob.city && selectedJob.state
                          ? `${selectedJob.city}, ${selectedJob.state}`
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Tipo de Contrato</label>
                      <p className="text-gray-900">{selectedJob.contract_type || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Nível</label>
                      <p className="text-gray-900">{selectedJob.experience_level || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Salário</label>
                      <p className="text-gray-900">
                        {selectedJob.salary_min && selectedJob.salary_max
                          ? `R$ ${selectedJob.salary_min.toLocaleString()} - R$ ${selectedJob.salary_max.toLocaleString()}`
                          : selectedJob.salary_min
                            ? `A partir de R$ ${selectedJob.salary_min.toLocaleString()}`
                            : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <p className={`font-medium ${selectedJob.is_active ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedJob.is_active ? 'Ativa' : 'Inativa'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Candidaturas</label>
                      <p className="text-gray-900">{selectedJob.applications_count || 0}</p>
                    </div>
                  </div>
                  {selectedJob.description && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Descrição</label>
                      <p className="text-gray-900 mt-1 whitespace-pre-line">{selectedJob.description}</p>
                    </div>
                  )}
                  {selectedJob.requirements && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Requisitos</label>
                      <p className="text-gray-900 mt-1 whitespace-pre-line">{selectedJob.requirements}</p>
                    </div>
                  )}
                  {selectedJob.benefits && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Benefícios</label>
                      <p className="text-gray-900 mt-1 whitespace-pre-line">{selectedJob.benefits}</p>
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
                      onClick={saveJobSettings}
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
