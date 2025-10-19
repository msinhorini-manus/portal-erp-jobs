import { Link } from 'react-router-dom'
import { LayoutDashboard, Tags, Briefcase, TrendingUp, Users, Building2, Code, Package, Settings, LogOut, BarChart3, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminDashboard() {
  const stats = [
    { label: 'Total de Empresas', value: '1,234', icon: Building2, color: 'bg-blue-500' },
    { label: 'Total de Candidatos', value: '15,678', icon: Users, color: 'bg-green-500' },
    { label: 'Vagas Ativas', value: '3,456', icon: Briefcase, color: 'bg-orange-500' },
    { label: 'Candidaturas', value: '28,901', icon: FileText, color: 'bg-purple-500' },
  ]

  const recentActivity = [
    { type: 'empresa', text: 'Nova empresa cadastrada: Tech Solutions', time: '5 min atrás' },
    { type: 'vaga', text: 'Nova vaga publicada: Desenvolvedor Full Stack', time: '15 min atrás' },
    { type: 'candidato', text: '50 novos candidatos cadastrados hoje', time: '1 hora atrás' },
    { type: 'candidatura', text: '120 novas candidaturas nas últimas 24h', time: '2 horas atrás' },
  ]

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
            <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
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
                <TrendingUp className="w-5 h-5" />
                Níveis de Experiência
              </Link>
              
              <Link
                to="/admin/modalidades"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
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
                Softwares/ERPs
              </Link>
              
              <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-500 uppercase">
                Gerenciamento
              </div>
              
              <Link
                to="/admin/empresas"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Building2 className="w-5 h-5" />
                Empresas
              </Link>
              
              <Link
                to="/admin/candidatos"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Users className="w-5 h-5" />
                Candidatos
              </Link>
              
              <Link
                to="/admin/vagas"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Briefcase className="w-5 h-5" />
                Vagas
              </Link>
              
              <Link
                to="/admin/relatorios"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <BarChart3 className="w-5 h-5" />
                Relatórios
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#1F3B47]">Dashboard Administrativo</h1>
            <p className="text-gray-600 mt-1">Visão geral da plataforma Portal ERP Jobs</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <Card key={index} className="border-2 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-[#1F3B47]">{stat.value}</p>
                    </div>
                    <div className={`${stat.color} w-14 h-14 rounded-full flex items-center justify-center`}>
                      <stat.icon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card className="border-2">
              <CardHeader className="bg-gradient-to-r from-[#1F3B47] to-[#2a5261] text-white rounded-t-lg">
                <CardTitle>Atividades Recentes</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 pb-4 border-b last:border-b-0">
                      <div className="w-2 h-2 bg-[#F7941D] rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-800">{activity.text}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-2">
              <CardHeader className="bg-gradient-to-r from-[#1F3B47] to-[#2a5261] text-white rounded-t-lg">
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <Link
                    to="/admin/tags"
                    className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border-2 border-blue-200 transition-colors"
                  >
                    <Tags className="w-8 h-8 text-blue-600 mb-2" />
                    <p className="text-sm font-semibold text-blue-900">Gerenciar Tags</p>
                  </Link>
                  
                  <Link
                    to="/admin/tecnologias"
                    className="p-4 bg-green-50 hover:bg-green-100 rounded-lg border-2 border-green-200 transition-colors"
                  >
                    <Code className="w-8 h-8 text-green-600 mb-2" />
                    <p className="text-sm font-semibold text-green-900">Tecnologias</p>
                  </Link>
                  
                  <Link
                    to="/admin/areas"
                    className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg border-2 border-orange-200 transition-colors"
                  >
                    <Briefcase className="w-8 h-8 text-orange-600 mb-2" />
                    <p className="text-sm font-semibold text-orange-900">Áreas</p>
                  </Link>
                  
                  <Link
                    to="/admin/softwares"
                    className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border-2 border-purple-200 transition-colors"
                  >
                    <Package className="w-8 h-8 text-purple-600 mb-2" />
                    <p className="text-sm font-semibold text-purple-900">Softwares</p>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

