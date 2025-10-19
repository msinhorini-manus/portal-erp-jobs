import { Link } from 'react-router-dom'
import { Plus, Briefcase, Users, Eye, TrendingUp, Edit, Trash2, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const mockJobs = [
  { id: 1, title: 'Desenvolvedor Full Stack', status: 'Ativa', candidates: 45, views: 320, created: '15/09/2025' },
  { id: 2, title: 'Analista SAP', status: 'Ativa', candidates: 28, views: 185, created: '10/09/2025' },
  { id: 3, title: 'DevOps Engineer', status: 'Pausada', candidates: 12, views: 95, created: '05/09/2025' },
]

export default function CompanyDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1F3B47] text-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-10 h-10 bg-[#F7941D] rounded-full flex items-center justify-center font-bold text-white">
                  P
                </div>
                <div className="text-xl font-bold">
                  PORTAL <span className="text-[#F7941D]">ERP</span> JOBS
                </div>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link to="/empresa/dashboard" className="text-[#F7941D] font-semibold">Dashboard</Link>
              <Link to="/empresa/vagas" className="hover:text-[#F7941D] transition-colors">Minhas Vagas</Link>
              <Link to="/empresa/candidatos" className="hover:text-[#F7941D] transition-colors">Candidatos</Link>
              <Link to="/empresa/usuarios" className="hover:text-[#F7941D] transition-colors">Usuários</Link>
              <Link to="/empresa/perfil" className="hover:text-[#F7941D] transition-colors">Perfil</Link>
            </nav>
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 text-sm">
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1F3B47] mb-2">
            Bem-vindo, <span className="text-[#F7941D]">Empresa de Tecnologia</span>!
          </h1>
          <p className="text-gray-600">Gerencie suas vagas e encontre os melhores talentos</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">Vagas Ativas</p>
                  <p className="text-3xl font-bold text-[#1F3B47]">12</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">Candidaturas</p>
                  <p className="text-3xl font-bold text-[#1F3B47]">85</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">Visualizações</p>
                  <p className="text-3xl font-bold text-[#1F3B47]">600</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Eye className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">Taxa de Conversão</p>
                  <p className="text-3xl font-bold text-[#1F3B47]">14%</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <Link to="/empresa/vagas/nova">
            <Button className="bg-[#F7941D] hover:bg-[#e8850d] text-white font-semibold h-12 px-6">
              <Plus className="w-5 h-5 mr-2" />
              Publicar Nova Vaga
            </Button>
          </Link>
        </div>

        {/* Jobs Table */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="bg-[#1F3B47] text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Suas Vagas Recentes</CardTitle>
              <Link to="/empresa/vagas">
                <Button variant="ghost" className="text-white hover:bg-white/10">
                  Ver todas
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#1F3B47]">Título da Vaga</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#1F3B47]">Status</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-[#1F3B47]">Candidatos</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-[#1F3B47]">Visualizações</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#1F3B47]">Criada em</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-[#1F3B47]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {mockJobs.map((job, index) => (
                    <tr key={job.id} className={`border-b hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-6 py-4">
                        <Link to={`/empresa/vagas/${job.id}`} className="font-semibold text-[#1F3B47] hover:text-[#F7941D] transition-colors">
                          {job.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={job.status === 'Ativa' ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'}>
                          {job.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-semibold text-[#F7941D]">{job.candidates}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-gray-600">{job.views}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {job.created}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button size="sm" variant="ghost" className="hover:bg-blue-50">
                            <BarChart3 className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button size="sm" variant="ghost" className="hover:bg-green-50">
                            <Edit className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" className="hover:bg-red-50">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

