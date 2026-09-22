import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2, Search, Filter, MoreVertical, Eye, Edit, Trash2, Power, ChevronLeft, ChevronRight,
  MapPin, Phone, Mail, Globe, Calendar, FileText
} from 'lucide-react'
import { adminAPI } from '../../services/adminAPI'
import { useAuth } from '../../contexts/AuthContext'
import AdminSidebar from '../../components/admin/AdminSidebar'

export default function AdminCompanies() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('view')
  const [editForm, setEditForm] = useState({})
  const navigate = useNavigate()
  const { logout } = useAuth()

  useEffect(() => {
    loadCompanies()
  }, [currentPage, statusFilter])

  const loadCompanies = async () => {
    try {
      setLoading(true)
      const data = await adminAPI.getCompanies({
        page: currentPage,
        per_page: 10,
        search: search,
        status: statusFilter === 'all' ? '' : statusFilter
      })
      setCompanies(data.companies || [])
      setTotalPages(data.pages || 1)
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Erro ao carregar empresas:', error)
      if (error.message.includes('403') || error.message.includes('401')) {
        navigate('/admin/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setCurrentPage(1)
    loadCompanies()
  }

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const handleToggleStatus = async (company) => {
    try {
      await adminAPI.toggleCompanyStatus(company.id)
      loadCompanies()
    } catch (error) {
      console.error('Erro ao alterar status:', error)
    }
  }

  const handleDelete = async (company) => {
    if (window.confirm(`Tem certeza que deseja excluir a empresa ${company.name}?`)) {
      try {
        await adminAPI.deleteCompany(company.id)
        loadCompanies()
        setShowModal(false)
      } catch (error) {
        console.error('Erro ao excluir empresa:', error)
      }
    }
  }

  const openModal = (type, company) => {
    setModalType(type)
    setSelectedCompany(company)
    if (type === 'edit') {
      setEditForm({
        name: company.name,
        email: company.email,
        phone: company.phone || '',
        website: company.website || '',
        description: company.description || ''
      })
    }
    setShowModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    try {
      await adminAPI.updateCompany(selectedCompany.id, editForm)
      loadCompanies()
      setShowModal(false)
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Gestão de Empresas</h1>
            <p className="text-gray-600 mt-2">Gerencie todas as empresas cadastradas na plataforma</p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por nome, email ou CNPJ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">Todos os status</option>
                <option value="active">Ativas</option>
                <option value="inactive">Inativas</option>
              </select>
              <button
                type="submit"
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Buscar
              </button>
            </form>
          </div>

          {/* Companies Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando empresas...</p>
              </div>
            ) : companies.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Nenhuma empresa encontrada</p>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Empresa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contato
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vagas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cadastro
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {companies.map((company) => (
                      <tr key={company.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-orange-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{company.name}</div>
                              <div className="text-sm text-gray-500">{company.sector || 'Não informado'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{company.email}</div>
                          <div className="text-sm text-gray-500">{company.phone || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {company.jobs_count || 0} vagas
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            company.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {company.is_active ? 'Ativa' : 'Inativa'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {company.created_at ? new Date(company.created_at).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openModal('view', company)}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openModal('edit', company)}
                              className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(company)}
                              className={`p-2 rounded-lg transition-colors ${
                                company.is_active
                                  ? 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                                  : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                              }`}
                              title={company.is_active ? 'Desativar' : 'Ativar'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(company)}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">{companies.length}</span> de{' '}
                    <span className="font-medium">{total}</span> empresas
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-700">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Modal */}
      {showModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {modalType === 'view' ? 'Detalhes da Empresa' : 'Editar Empresa'}
              </h2>
            </div>

            {modalType === 'view' ? (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedCompany.name}</h3>
                    <p className="text-gray-500">{selectedCompany.sector || 'Setor não informado'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>{selectedCompany.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{selectedCompany.phone || 'Não informado'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Globe className="w-4 h-4" />
                    <span>{selectedCompany.website || 'Não informado'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedCompany.city || 'Não informado'}, {selectedCompany.state || ''}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Cadastro: {selectedCompany.created_at ? new Date(selectedCompany.created_at).toLocaleDateString('pt-BR') : '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>{selectedCompany.jobs_count || 0} vagas publicadas</span>
                  </div>
                </div>

                {selectedCompany.description && (
                  <div className="pt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Descrição</h4>
                    <p className="text-gray-600">{selectedCompany.description}</p>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={editForm.website}
                    onChange={(e) => setEditForm({...editForm, website: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            )}

            {modalType === 'view' && (
              <div className="p-6 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
