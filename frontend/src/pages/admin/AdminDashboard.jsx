import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Tags, Briefcase, Users, Building2, Code, Package, LogOut, FileText } from 'lucide-react'
import { adminAPI } from '../../services/adminAPI'
import { useAuth } from '../../contexts/AuthContext'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { logout } = useAuth()

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await adminAPI.getStats()
      setStats(data)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
      // If unauthorized, redirect to login
      if (error.message.includes('403') || error.message.includes('401')) {
        navigate('/admin/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1F3B47] text-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F7941D] rounded-full flex items-center justify-center font-bold">
                P
              </div>
              <div>
                <div className="text-xl font-bold">
                  PORTAL <span className="text-[#F7941D]">ERP</span> JOBS
                </div>
                <div className="text-xs text-white/70">Painel de Administração</div>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-lg min-h-[calc(100vh-72px)]">
          <nav className="p-4">
            <div className="space-y-1">
              <Link
                to="/admin"
                className="flex items-center gap-3 px-4 py-3 bg-[#F7941D] text-white rounded-lg font-semibold"
              >
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </Link>
              
              <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-500 uppercase">
                Configurações
              </div>
              
              <Link
                to="/admin/tags"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Tags className="w-5 h-5" />
                Tags/Keywords
              </Link>
              
              <Link
                to="/admin/areas"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Briefcase className="w-5 h-5" />
                Áreas de Atuação
              </Link>
              
              <Link
                to="/admin/niveis"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Code className="w-5 h-5" />
                Níveis
              </Link>
              
              <Link
                to="/admin/modalidades"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Package className="w-5 h-5" />
                Modalidades
              </Link>
              
              <Link
                to="/admin/tecnologias"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Code className="w-5 h-5" />
                Tecnologias
              </Link>
              
              <Link
                to="/admin/softwares"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Package className="w-5 h-5" />
                Softwares
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
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
        </main>
      </div>
    </div>
  )
}

