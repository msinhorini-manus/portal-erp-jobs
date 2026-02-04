import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, MapPin, Globe, Phone, Mail, Calendar, Users, Save, Edit2, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function CompanyProfilePage() {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  const [formData, setFormData] = useState({
    company_name: '',
    description: '',
    website: '',
    phone: '',
    company_size: '',
    sector: '',
    city: '',
    state: '',
    street_address: '',
    zip_code: ''
  })

  useEffect(() => {
    fetchCompanyProfile()
  }, [])

  const fetchCompanyProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/companies/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCompany(data)
        setFormData({
          company_name: data.company_name || '',
          description: data.description || '',
          website: data.website || '',
          phone: data.phone || '',
          company_size: data.company_size || '',
          sector: data.sector || '',
          city: data.city || '',
          state: data.state || '',
          street_address: data.street_address || '',
          zip_code: data.zip_code || ''
        })
      } else {
        setError('Erro ao carregar perfil da empresa')
      }
    } catch (err) {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      
      const response = await fetch(`${API_BASE}/api/companies/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        const data = await response.json()
        setCompany(data)
        setEditing(false)
        setSuccess('Perfil atualizado com sucesso!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError('Erro ao salvar perfil')
      }
    } catch (err) {
      setError('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F7941D]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-[#1F3B47] rounded-xl flex items-center justify-center">
                <Building2 className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {company?.company_name || 'Minha Empresa'}
                </h1>
                <p className="text-gray-500">{company?.sector || 'Setor não informado'}</p>
              </div>
            </div>
            
            {!editing ? (
              <Button 
                onClick={() => setEditing(true)}
                className="bg-[#F7941D] hover:bg-[#e8850d] gap-2"
              >
                <Edit2 size={16} />
                Editar Perfil
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  onClick={() => setEditing(false)}
                  variant="outline"
                  className="gap-2"
                >
                  <X size={16} />
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 gap-2"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Check size={16} />
                  )}
                  Salvar
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mensagens */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Informações da Empresa */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 size={20} className="text-[#F7941D]" />
            Informações da Empresa
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Empresa
              </label>
              {editing ? (
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{company?.company_name || '-'}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Setor
              </label>
              {editing ? (
                <input
                  type="text"
                  name="sector"
                  value={formData.sector}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{company?.sector || '-'}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porte da Empresa
              </label>
              {editing ? (
                <select
                  name="company_size"
                  value={formData.company_size}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                >
                  <option value="">Selecione</option>
                  <option value="Micro">Micro (até 9 funcionários)</option>
                  <option value="Pequena">Pequena (10-49 funcionários)</option>
                  <option value="Média">Média (50-249 funcionários)</option>
                  <option value="Grande">Grande (250+ funcionários)</option>
                </select>
              ) : (
                <p className="text-gray-900">{company?.company_size || '-'}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              {editing ? (
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">
                  {company?.website ? (
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-[#F7941D] hover:underline">
                      {company.website}
                    </a>
                  ) : '-'}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone
              </label>
              {editing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{company?.phone || '-'}</p>
              )}
            </div>
          </div>
          
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição da Empresa
            </label>
            {editing ? (
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                placeholder="Descreva sua empresa, cultura, valores..."
              />
            ) : (
              <p className="text-gray-900 whitespace-pre-line">{company?.description || 'Nenhuma descrição informada'}</p>
            )}
          </div>
        </div>

        {/* Localização */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-[#F7941D]" />
            Localização
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endereço
              </label>
              {editing ? (
                <input
                  type="text"
                  name="street_address"
                  value={formData.street_address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{company?.street_address || '-'}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cidade
              </label>
              {editing ? (
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{company?.city || '-'}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              {editing ? (
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{company?.state || '-'}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CEP
              </label>
              {editing ? (
                <input
                  type="text"
                  name="zip_code"
                  value={formData.zip_code}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{company?.zip_code || '-'}</p>
              )}
            </div>
          </div>
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
