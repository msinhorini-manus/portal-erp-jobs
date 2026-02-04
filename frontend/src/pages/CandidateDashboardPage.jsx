import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Briefcase, Heart, Eye, TrendingUp, Clock, CheckCircle, XCircle, Building2, MapPin, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || '';

export default function CandidateDashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  
  const [stats, setStats] = useState({
    total_applications: 0,
    pending_applications: 0,
    accepted_applications: 0,
    rejected_applications: 0,
    saved_jobs: 0,
    profile_views: 0,
    candidate_name: 'Profissional'
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        navigate('/profissional/login');
        return;
      }

      // Carregar estatísticas do candidato
      const statsResponse = await fetch(`${API_URL}/api/stats/candidate`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      } else {
        // Se não houver API, usar dados do user
        setStats(prev => ({
          ...prev,
          candidate_name: user?.name || user?.full_name || 'Profissional'
        }));
      }

      // Carregar candidaturas recentes
      const applicationsResponse = await fetch(`${API_URL}/api/applications/my-applications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (applicationsResponse.ok) {
        const applicationsData = await applicationsResponse.json();
        setRecentApplications((applicationsData.applications || []).slice(0, 5));
      }

      // Carregar vagas recomendadas
      const jobsResponse = await fetch(`${API_URL}/api/jobs/?limit=3`);
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        setRecommendedJobs(jobsData.jobs || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      // Usar dados do contexto de autenticação
      setStats(prev => ({
        ...prev,
        candidate_name: user?.name || user?.full_name || 'Profissional'
      }));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatSalary = (min, max) => {
    if (!min && !max) return 'A combinar';
    const formatValue = (val) => {
      if (!val) return '';
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0
      }).format(val);
    };
    if (min && max) return `${formatValue(min)} - ${formatValue(max)}`;
    if (min) return `A partir de ${formatValue(min)}`;
    return `Até ${formatValue(max)}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Clock className="w-3 h-3 mr-1" />Em análise</Badge>;
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle className="w-3 h-3 mr-1" />Aceita</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><XCircle className="w-3 h-3 mr-1" />Recusada</Badge>;
      case 'viewed':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100"><Eye className="w-3 h-3 mr-1" />Visualizada</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1F3B47] mb-2">
            Olá, <span className="text-[#F7941D]">{loading ? '...' : stats.candidate_name}</span>!
          </h1>
          <p className="text-gray-600">Acompanhe suas candidaturas e encontre novas oportunidades</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">Candidaturas</p>
                  <p className="text-3xl font-bold text-[#1F3B47]">
                    {loading ? '...' : stats.total_applications}
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
                  <p className="text-sm text-gray-600 font-medium mb-1">Em Análise</p>
                  <p className="text-3xl font-bold text-[#1F3B47]">
                    {loading ? '...' : stats.pending_applications}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">Vagas Salvas</p>
                  <p className="text-3xl font-bold text-[#1F3B47]">
                    {loading ? '...' : stats.saved_jobs}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Heart className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">Visualizações do Perfil</p>
                  <p className="text-3xl font-bold text-[#1F3B47]">
                    {loading ? '...' : stats.profile_views}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Eye className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Link to="/vagas">
            <Button className="bg-[#F7941D] hover:bg-[#e8850d] text-white font-semibold h-12 px-6">
              <Briefcase className="w-5 h-5 mr-2" />
              Buscar Vagas
            </Button>
          </Link>
          <Link to="/profissional/curriculo">
            <Button variant="outline" className="border-[#1F3B47] text-[#1F3B47] hover:bg-[#1F3B47] hover:text-white font-semibold h-12 px-6">
              <FileText className="w-5 h-5 mr-2" />
              Atualizar Currículo
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Applications */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="bg-[#1F3B47] text-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Candidaturas Recentes</CardTitle>
                <Link to="/profissional/candidaturas">
                  <Button variant="ghost" className="text-white hover:bg-white/10">
                    Ver todas
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="text-lg text-gray-600">Carregando candidaturas...</div>
                </div>
              ) : recentApplications.length === 0 ? (
                <div className="p-12 text-center">
                  <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhuma candidatura ainda</h3>
                  <p className="text-gray-500 mb-6">Comece buscando vagas que combinam com seu perfil!</p>
                  <Link to="/vagas">
                    <Button className="bg-[#F7941D] hover:bg-[#e8850d] text-white">
                      Buscar Vagas
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {recentApplications.map((application) => (
                    <div key={application.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{application.job?.title || 'Vaga'}</h4>
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Building2 className="w-3 h-3" />
                            {application.job?.company?.name || 'Empresa'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Candidatura em {formatDate(application.created_at)}
                          </p>
                        </div>
                        {getStatusBadge(application.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recommended Jobs */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="bg-[#F7941D] text-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Vagas Recomendadas</CardTitle>
                <Link to="/vagas">
                  <Button variant="ghost" className="text-white hover:bg-white/10">
                    Ver mais
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="text-lg text-gray-600">Carregando vagas...</div>
                </div>
              ) : recommendedJobs.length === 0 ? (
                <div className="p-12 text-center">
                  <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhuma vaga disponível</h3>
                  <p className="text-gray-500">Volte em breve para novas oportunidades!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {recommendedJobs.map((job) => (
                    <Link key={job.id} to={`/vagas/${job.id}`} className="block p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 hover:text-[#F7941D]">{job.title}</h4>
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Building2 className="w-3 h-3" />
                            {job.company?.name || job.company_name || 'Empresa'}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {job.location || `${job.city}, ${job.state}`}
                            </span>
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                              <DollarSign className="w-3 h-3" />
                              {formatSalary(job.salary_min, job.salary_max)}
                            </span>
                          </div>
                        </div>
                        <Badge className="bg-[#F7941D]/10 text-[#F7941D] hover:bg-[#F7941D]/20">
                          {job.level || 'Pleno'}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Profile Completion Card */}
        <Card className="mt-8 border-2 border-dashed border-[#F7941D]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#F7941D]/10 rounded-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-[#F7941D]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#1F3B47]">Complete seu perfil</h3>
                  <p className="text-gray-600">Perfis completos têm 3x mais chances de serem visualizados por recrutadores</p>
                </div>
              </div>
              <Link to="/profissional/curriculo">
                <Button className="bg-[#F7941D] hover:bg-[#e8850d] text-white">
                  Completar Perfil
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
