import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, Briefcase, Building2, MapPin, DollarSign, Clock, Trash2, ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || '';

export default function CandidateSavedJobsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedJobs();
  }, []);

  const loadSavedJobs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        navigate('/profissional/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/candidates/saved-jobs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSavedJobs(data.jobs || data.saved_jobs || []);
      }
    } catch (error) {
      console.error('Erro ao carregar vagas salvas:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeSavedJob = async (jobId) => {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_URL}/api/candidates/saved-jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setSavedJobs(prev => prev.filter(job => job.id !== jobId));
      }
    } catch (error) {
      console.error('Erro ao remover vaga:', error);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1F3B47] mb-2">Vagas Salvas</h1>
            <p className="text-gray-600">Vagas que você salvou para se candidatar depois</p>
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

        {/* Saved Jobs Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-600">Carregando vagas salvas...</div>
          </div>
        ) : savedJobs.length === 0 ? (
          <Card className="border-2">
            <CardContent className="p-12 text-center">
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhuma vaga salva</h3>
              <p className="text-gray-500 mb-6">
                Ao navegar pelas vagas, clique no ícone de coração para salvar as que mais te interessam.
              </p>
              <Link to="/vagas">
                <Button className="bg-[#F7941D] hover:bg-[#e8850d] text-white">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Buscar Vagas
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedJobs.map((job) => (
              <Card key={job.id} className="border-2 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <Badge className="bg-[#F7941D]/10 text-[#F7941D]">
                      {job.level || 'Pleno'}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeSavedJob(job.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 -mr-2 -mt-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-[#1F3B47] mb-2 line-clamp-2">
                    {job.title}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span>{job.company?.name || job.company_name || 'Empresa'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{job.location || `${job.city}, ${job.state}`}</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-600 font-medium">
                      <DollarSign className="w-4 h-4" />
                      <span>{formatSalary(job.salary_min, job.salary_max)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>Salva em {formatDate(job.saved_at || job.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link to={`/vagas/${job.id}`} className="flex-1">
                      <Button className="w-full bg-[#F7941D] hover:bg-[#e8850d] text-white">
                        Ver Vaga
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
