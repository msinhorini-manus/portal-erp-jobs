import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Users, Building2, FileText } from 'lucide-react'
import { adminAPI } from '../../services/adminAPI'

export default function AdminDashboardContent() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await adminAPI.getStats()
      setStats(data)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
      if (error.message.includes('403') || error.message.includes('401')) {
        navigate('/admin/login')
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando estatísticas...</p>
        </div>
      </div>
    )
  }

  const statsCards = stats ? [
    {
      label: 'Total de Empresas',
      value: stats.total_companies,
      icon: Building2,
      color: 'bg-blue-500',
      new: stats.new_companies_today,
      subtitle: `+${stats.new_companies_today} hoje`
    },
    {
      label: 'Total de Candidatos',
      value: stats.total_candidates,
      icon: Users,
      color: 'bg-green-500',
      new: stats.new_candidates_today,
      subtitle: `+${stats.new_candidates_today} hoje`
    },
    {
      label: 'Vagas Ativas',
      value: stats.active_jobs,
      icon: Briefcase,
      color: 'bg-orange-500',
      new: stats.new_jobs_today,
      subtitle: `${stats.total_jobs} total`
    },
    {
      label: 'Candidaturas',
      value: stats.total_applications,
      icon: FileText,
      color: 'bg-purple-500',
      new: stats.new_applications_today,
      subtitle: `+${stats.new_applications_today} hoje`
    },
  ] : []

  const recentActivity = stats ? [
    {
      type: 'empresa',
      text: `${stats.new_companies_today} novas empresas cadastradas hoje`,
      time: 'Hoje',
      icon: Building2,
      color: 'text-blue-500'
    },
    {
      type: 'vaga',
      text: `${stats.new_jobs_today} novas vagas publicadas hoje`,
      time: 'Hoje',
      icon: Briefcase,
      color: 'text-orange-500'
    },
    {
      type: 'candidato',
      text: `${stats.new_candidates_today} novos candidatos cadastrados hoje`,
      time: 'Hoje',
      icon: Users,
      color: 'text-green-500'
    },
    {
      type: 'candidatura',
      text: `${stats.new_applications_today} novas candidaturas hoje`,
      time: 'Hoje',
      icon: FileText,
      color: 'text-purple-500'
    },
  ] : []

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Visão geral da plataforma</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                {stat.new > 0 && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                    +{stat.new}
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className="text-xs text-gray-500">{stat.subtitle}</p>
            </div>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Atividade Recente</h2>
        <div className="space-y-4">
          {recentActivity.map((activity, index) => {
            const Icon = activity.icon
            return (
              <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className={`w-10 h-10 bg-white rounded-full flex items-center justify-center ${activity.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.text}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
