import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Briefcase, Building2, MapPin, Clock, CheckCircle, XCircle, Eye, Calendar, ArrowLeft, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || '';

export default function CandidateApplicationsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        navigate('/profissional/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/applications/my-applications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error('Erro ao carregar candidaturas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
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
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{status || 'Pendente'}</Badge>;
    }
  };

  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending' || !a.status).length,
    viewed: applications.filter(a => a.status === 'viewed').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1F3B47] mb-2">Minhas Candidaturas</h1>
            <p className="text-gray-600">Acompanhe o status de todas as suas candidaturas</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate('/profissional/dashboard')}
            className="border-[#1F3B47] text-[#1F3B47]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card 
            className={`cursor-pointer transition-all ${filter === 'all' ? 'ring-2 ring-[#F7941D]' : ''}`}
            onClick={() => setFilter('all')}
          >
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[#1F3B47]">{stats.total}</p>
              <p className="text-sm text-gray-600">Total</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${filter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
            onClick={() => setFilter('pending')}
          >
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-sm text-gray-600">Em Análise</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${filter === 'viewed' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setFilter('viewed')}
          >
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.viewed}</p>
              <p className="text-sm text-gray-600">Visualizadas</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${filter === 'accepted' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => setFilter('accepted')}
          >
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
              <p className="text-sm text-gray-600">Aceitas</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${filter === 'rejected' ? 'ring-2 ring-red-500' : ''}`}
            onClick={() => setFilter('rejected')}
          >
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              <p className="text-sm text-gray-600">Recusadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Applications List */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="bg-[#1F3B47] text-white rounded-t-lg">
            <CardTitle className="text-xl flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              {filter === 'all' ? 'Todas as Candidaturas' : `Candidaturas ${filter === 'pending' ? 'Em Análise' : filter === 'viewed' ? 'Visualizadas' : filter === 'accepted' ? 'Aceitas' : 'Recusadas'}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center">
                <div className="text-lg text-gray-600">Carregando candidaturas...</div>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="p-12 text-center">
                <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {filter === 'all' ? 'Nenhuma candidatura ainda' : `Nenhuma candidatura ${filter === 'pending' ? 'em análise' : filter === 'viewed' ? 'visualizada' : filter === 'accepted' ? 'aceita' : 'recusada'}`}
                </h3>
                <p className="text-gray-500 mb-6">
                  {filter === 'all' ? 'Comece buscando vagas que combinam com seu perfil!' : 'Tente outro filtro ou busque novas vagas.'}
                </p>
                <Link to="/vagas">
                  <Button className="bg-[#F7941D] hover:bg-[#e8850d] text-white">
                    Buscar Vagas
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredApplications.map((application) => (
                  <div key={application.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {application.job?.title || 'Vaga'}
                          </h4>
                          {getStatusBadge(application.status)}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {application.job?.company?.name || 'Empresa'}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {application.job?.location || 'Localização não informada'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Candidatura em {formatDate(application.created_at)}
                          </span>
                        </div>
                      </div>
                      <Link to={`/vagas/${application.job?.id}`}>
                        <Button variant="outline" size="sm" className="text-[#F7941D] border-[#F7941D] hover:bg-[#F7941D] hover:text-white">
                          Ver Vaga
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
