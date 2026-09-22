import { useState, useEffect } from 'react'
import { Building2, Search, Eye, Mail, Phone, MapPin, ToggleLeft, ToggleRight, X, Calendar, Briefcase, Crown, Edit2, Save, Plus, Trash2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export default function AdminCompaniesContent() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({})
  const [createData, setCreateData] = useState({
    company_name: '',
    email: '',
    phone: '',
    cnpj: '',
    city: '',
    state: '',
    is_member: false,
    max_active_jobs: 3
  })

  useEffect(() => {
    loadCompanies()
  }, [])

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
      } else {
        toast.error('Erro ao carregar empresas')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  const createCompany = async () => {
    if (!createData.company_name || !createData.email) {
      toast.error('Nome e email são obrigatórios')
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createData)
      })

      if (response.ok) {
        toast.success('Empresa criada com sucesso')
        setShowCreateModal(false)
        setCreateData({
          company_name: '',
          email: '',
          phone: '',
          cnpj: '',
          city: '',
          state: '',
          is_member: false,
          max_active_jobs: 3
        })
        loadCompanies()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao criar empresa')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao conectar com o servidor')
    }
  }

  const deleteCompany = async (companyId) => {
    if (!confirm('Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        toast.success('Empresa excluída com sucesso')
        loadCompanies()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao excluir empresa')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao conectar com o servidor')
    }
  }

  const toggleCompanyStatus = async (companyId, currentStatus) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/companies/${companyId}/toggle-status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !currentStatus })
      })

      if (response.ok) {
        toast.success(currentStatus ? 'Empresa desativada' : 'Empresa ativada')
        loadCompanies()
      } else {
        toast.error('Erro ao atualizar status')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao conectar com o servidor')
    }
  }

  const toggleMemberStatus = async (companyId, currentStatus) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_member: !currentStatus })
      })

      if (response.ok) {
        toast.success(currentStatus ? 'Status de membro removido' : 'Empresa marcada como membro')
        loadCompanies()
      } else {
        toast.error('Erro ao atualizar status de membro')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao conectar com o servidor')
    }
  }

  const viewCompanyDetails = async (companyId) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSelectedCompany(data)
        setEditData({
          company_name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          cnpj: data.cnpj || '',
          city: data.city || '',
          state: data.state || '',
          is_member: data.is_member || false,
          max_active_jobs: data.max_active_jobs || 3
        })
        setShowModal(true)
        setEditMode(false)
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao carregar detalhes')
    }
  }

  const saveCompanySettings = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/companies/${selectedCompany.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editData)
      })

      if (response.ok) {
        toast.success('Empresa atualizada com sucesso')
        setEditMode(false)
        loadCompanies()
        setSelectedCompany({
          ...selectedCompany,
          name: editData.company_name,
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

  const filteredCompanies = companies.filter(company =>
    company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando empresas...</p>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Empresas</h1>
          <p className="text-gray-600">{companies.length} empresas cadastradas</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#F7941D] text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Empresa
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

      {/* Companies Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Empresa</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Contato</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Localização</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Vagas</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Membro</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCompanies.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma empresa encontrada</p>
                </td>
              </tr>
            ) : (
              filteredCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center relative">
                        <span className="text-blue-600 font-semibold">
                          {company.name?.charAt(0) || 'E'}
                        </span>
                        {company.is_member && (
                          <Crown className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{company.name}</p>
                        <p className="text-sm text-gray-500">ID: {company.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        {company.email}
                      </div>
                      {company.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          {company.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {company.city && company.state ? (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        {company.city}, {company.state}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium inline-block w-fit">
                        {company.active_jobs || 0} / {company.max_active_jobs || 3}
                      </span>
                      <span className="text-xs text-gray-500">
                        {company.jobs_count || 0} total
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleMemberStatus(company.id, company.is_member)}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        company.is_member
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Crown className="w-4 h-4" />
                      {company.is_member ? 'Membro' : 'Não'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleCompanyStatus(company.id, company.is_active)}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        company.is_active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {company.is_active ? (
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
                        onClick={() => viewCompanyDetails(company.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver/Editar"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteCompany(company.id)}
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

      {/* Modal de Criar Empresa */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Nova Empresa</h2>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa *</label>
                  <input
                    type="text"
                    value={createData.company_name}
                    onChange={(e) => setCreateData({...createData, company_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Nome da empresa"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={createData.email}
                    onChange={(e) => setCreateData({...createData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="email@empresa.com"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={createData.cnpj}
                    onChange={(e) => setCreateData({...createData, cnpj: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="00.000.000/0001-00"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Limite de Vagas</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={createData.max_active_jobs}
                    onChange={(e) => setCreateData({...createData, max_active_jobs: parseInt(e.target.value) || 3})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createData.is_member}
                      onChange={(e) => setCreateData({...createData, is_member: e.target.checked})}
                      className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                    />
                    <span className="text-gray-700 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-500" />
                      Empresa Membro do Portal ERP
                    </span>
                  </label>
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
                  onClick={createCompany}
                  className="px-4 py-2 bg-[#F7941D] text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Criar Empresa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes/Editar */}
      {showModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editMode ? 'Editar Empresa' : 'Detalhes da Empresa'}
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
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
                      <input
                        type="text"
                        value={editData.company_name}
                        onChange={(e) => setEditData({...editData, company_name: e.target.value})}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                      <input
                        type="text"
                        value={editData.cnpj}
                        onChange={(e) => setEditData({...editData, cnpj: e.target.value})}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Limite de Vagas</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={editData.max_active_jobs}
                        onChange={(e) => setEditData({...editData, max_active_jobs: parseInt(e.target.value) || 3})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editData.is_member}
                          onChange={(e) => setEditData({...editData, is_member: e.target.checked})}
                          className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                        />
                        <span className="text-gray-700 flex items-center gap-2">
                          <Crown className="w-4 h-4 text-yellow-500" />
                          Empresa Membro do Portal ERP
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                /* Modo de Visualização */
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nome</label>
                    <p className="text-gray-900">{selectedCompany.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{selectedCompany.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Telefone</label>
                    <p className="text-gray-900">{selectedCompany.phone || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">CNPJ</label>
                    <p className="text-gray-900">{selectedCompany.cnpj || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Localização</label>
                    <p className="text-gray-900">
                      {selectedCompany.city && selectedCompany.state
                        ? `${selectedCompany.city}, ${selectedCompany.state}`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <p className={`font-medium ${selectedCompany.is_active ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedCompany.is_active ? 'Ativa' : 'Inativa'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Total de Vagas</label>
                    <p className="text-gray-900">{selectedCompany.jobs_count || 0}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Limite de Vagas</label>
                    <p className="text-gray-900">{selectedCompany.max_active_jobs || 3}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Membro Portal ERP</label>
                    <p className={`flex items-center gap-2 ${selectedCompany.is_member ? 'text-yellow-600' : 'text-gray-500'}`}>
                      <Crown className="w-4 h-4" />
                      {selectedCompany.is_member ? 'Sim, é membro' : 'Não é membro'}
                    </p>
                  </div>
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
                      onClick={saveCompanySettings}
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
