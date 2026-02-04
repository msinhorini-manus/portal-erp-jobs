import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Briefcase, Users, Eye, TrendingUp, Edit, Trash2, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || '';

export default function CompanyDashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  
  // Estados para dados reais da API
  const [stats, setStats] = useState({
    total_jobs: 0,
    active_jobs: 0,
    paused_jobs: 0,
    total_applications: 0,
    total_views: 0,
    conversion_rate: 0,
    company_name: 'Empresa'
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        navigate('/empresa/login');
        return;
      }

      // Carregar estatísticas da empresa
      const statsResponse = await fetch(`${API_URL}/api/stats/company`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Carregar vagas recentes da empresa
      const jobsResponse = await fetch(`${API_URL}/api/jobs/my-jobs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        // Pegar apenas as 5 mais recentes
        const jobs = (jobsData.jobs || []).slice(0, 5);
        setRecentJobs(jobs);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1F3B47] mb-2">
            Bem-vindo, <span className="text-[#F7941D]">{loading ? '...' : stats.company_name}</span>!
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
                  <p className="text-3xl font-bold text-[#1F3B47]">
                    {loading ? '...' : stats.active_jobs}
                  </p>
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
                  <p className="text-3xl font-bold text-[#1F3B47]">
                    {loading ? '...' : stats.total_applications}
                  </p>
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
                  <p className="text-3xl font-bold text-[#1F3B47]">
                    {loading ? '...' : stats.total_views}
                  </p>
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
                  <p className="text-sm text-gray-600 font-medium mb-1">Média Candidaturas/Vaga</p>
                  <p className="text-3xl font-bold text-[#1F3B47]">
                    {loading ? '...' : stats.conversion_rate}
                  </p>
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
            {loading ? (
              <div className="p-12 text-center">
                <div className="text-lg text-gray-600">Carregando vagas...</div>
              </div>
            ) : recentJobs.length === 0 ? (
              <div className="p-12 text-center">
                <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhuma vaga publicada ainda</h3>
                <p className="text-gray-500 mb-6">Comece publicando sua primeira vaga!</p>
                <Link to="/empresa/vagas/nova">
                  <Button className="bg-[#F7941D] hover:bg-[#e8850d] text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Publicar Vaga
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Vaga</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Candidatos</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Visualizações</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Criada em</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{job.title}</div>
                          <div className="text-sm text-gray-500">{job.location}</div>
                        </td>
                        <td className="px-6 py-4">
                          {job.is_active ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativa</Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pausada</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="font-semibold text-gray-900">{job.applications_count || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Eye className="w-4 h-4 text-gray-400" />
                            <span className="font-semibold text-gray-900">0</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(job.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => navigate(`/empresa/vagas/${job.id}/editar`)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

