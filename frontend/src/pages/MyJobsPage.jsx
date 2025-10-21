import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Pause, Play, Users, Eye, BarChart3, Filter } from 'lucide-react';
import { jobAPI } from '../services/api';
import { useAuth } from '@/contexts/AuthContext';

export default function MyJobsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterArea, setFilterArea] = useState('all');
  const [filterWorkMode, setFilterWorkMode] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  // Carregar vagas da API
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await jobAPI.getByCompany();
      // Extrair array de jobs da resposta paginada
      const jobsArray = response.jobs || [];
      // Formatar dados para o frontend
      const formattedJobs = jobsArray.map(job => ({
        ...job,
        status: job.is_active ? 'active' : 'paused',
        salary: job.min_salary && job.max_salary ? `R$ ${job.min_salary} - R$ ${job.max_salary}` : 'A combinar',
        location: job.city && job.state ? `${job.city}, ${job.state}` : job.city || 'Remoto',
        workMode: job.work_modality || 'Remoto',
        candidates: 0 // TODO: Buscar número real de candidaturas
      }));
      setJobs(formattedJobs);
    } catch (error) {
      console.error('Erro ao carregar vagas:', error);
      alert('Erro ao carregar vagas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (jobId) => {
    if (confirm('Tem certeza que deseja excluir esta vaga?')) {
      try {
        await jobAPI.delete(jobId);
        setJobs(jobs.filter(job => job.id !== jobId));
        alert('Vaga excluída com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir vaga:', error);
        alert('Erro ao excluir vaga. Tente novamente.');
      }
    }
  };
  
  const handleToggleStatus = async (jobId) => {
    try {
      await jobAPI.toggleStatus(jobId);
      const updatedJobs = jobs.map(job => {
        if (job.id === jobId) {
          const newStatus = job.status === 'active' ? 'paused' : 'active';
          return { ...job, status: newStatus };
        }
        return job;
      });
      setJobs(updatedJobs);
    } catch (error) {
      console.error('Erro ao alterar status da vaga:', error);
      alert('Erro ao alterar status. Tente novamente.');
    }
  };

  const filteredJobs = jobs
    .filter(job => {
      const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || job.status === filterStatus;
      const matchesArea = filterArea === 'all' || job.area === filterArea;
      const matchesWorkMode = filterWorkMode === 'all' || job.workMode === filterWorkMode;
      const matchesLevel = filterLevel === 'all' || job.seniority_level === filterLevel;
      return matchesSearch && matchesStatus && matchesArea && matchesWorkMode && matchesLevel;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      } else if (sortBy === 'candidates') {
        return (b.candidates || 0) - (a.candidates || 0);
      }
      return 0;
    });

  const stats = {
    total: jobs.length,
    active: jobs.filter(j => j.status === 'active').length,
    paused: jobs.filter(j => j.status === 'paused').length,
    totalCandidates: jobs.reduce((sum, j) => sum + j.candidates, 0),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1F3B47] text-white py-4 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F7941D] flex items-center justify-center font-bold text-xl">
              P
            </div>
            <div>
              <h1 className="text-xl font-bold">
                PORTAL <span className="text-[#F7941D]">ERP</span> JOBS
              </h1>
              <p className="text-xs text-gray-300">Minhas Vagas</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/empresa/dashboard')}
              className="px-4 py-2 border border-white/30 rounded-lg hover:bg-white/10 transition"
            >
              Dashboard
            </button>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 border border-white/30 rounded-lg hover:bg-white/10 transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total de Vagas</h3>
              <BarChart3 className="text-blue-500" size={24} />
            </div>
            <p className="text-3xl font-bold text-[#1F3B47]">{stats.total}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Vagas Ativas</h3>
              <Play className="text-green-500" size={24} />
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.active}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Vagas Pausadas</h3>
              <Pause className="text-yellow-500" size={24} />
            </div>
            <p className="text-3xl font-bold text-yellow-600">{stats.paused}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Candidatos</h3>
              <Users className="text-purple-500" size={24} />
            </div>
            <p className="text-3xl font-bold text-purple-600">{stats.totalCandidates}</p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar vagas..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativas</option>
              <option value="paused">Pausadas</option>
            </select>

            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
            >
              <option value="all">Todas as Áreas</option>
              <option value="Desenvolvimento">Desenvolvimento</option>
              <option value="Consultoria & ERP">Consultoria & ERP</option>
              <option value="Suporte & Infraestrutura">Suporte & Infraestrutura</option>
              <option value="Gestão & Liderança">Gestão & Liderança</option>
            </select>

            <select
              value={filterWorkMode}
              onChange={(e) => setFilterWorkMode(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
            >
              <option value="all">Todas Modalidades</option>
              <option value="presencial">Presencial</option>
              <option value="remoto">Remoto</option>
              <option value="híbrido">Híbrido</option>
            </select>

            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
            >
              <option value="all">Todos os Níveis</option>
              <option value="junior">Júnior</option>
              <option value="pleno">Pleno</option>
              <option value="senior">Sênior</option>
              <option value="especialista">Especialista</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
            >
              <option value="recent">Mais Recentes</option>
              <option value="oldest">Mais Antigas</option>
              <option value="candidates">Mais Candidatos</option>
            </select>

            {/* New Job Button */}
            <button
              onClick={() => navigate('/empresa/publicar-vaga')}
              className="px-6 py-3 bg-[#F7941D] text-white rounded-lg font-medium hover:bg-[#e8870d] transition shadow-lg flex items-center gap-2 whitespace-nowrap"
            >
              <Plus size={20} />
              Nova Vaga
            </button>
          </div>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-12 text-center">
              <p className="text-gray-500 text-lg mb-4">Nenhuma vaga encontrada</p>
              <button
                onClick={() => navigate('/empresa/publicar-vaga')}
                className="px-6 py-3 bg-[#F7941D] text-white rounded-lg font-medium hover:bg-[#e8870d] transition inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Publicar Primeira Vaga
              </button>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-xl shadow hover:shadow-lg transition p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <h3 className="text-xl font-bold text-[#1F3B47] hover:text-[#F7941D] cursor-pointer">
                        {job.title}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        job.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {job.status === 'active' ? 'Ativa' : 'Pausada'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                      <span className="flex items-center gap-1">
                        <span className="font-medium">Área:</span> {job.area}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="font-medium">Local:</span> {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="font-medium">Modalidade:</span> {job.workMode}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="font-medium">Salário:</span> {job.salary}
                      </span>
                    </div>

                    <div className="flex gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="text-[#F7941D]" size={18} />
                        <span className="font-bold text-[#F7941D]">{job.candidates}</span>
                        <span className="text-gray-600">candidatos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="text-gray-400" size={18} />
                        <span className="font-medium">{job.views}</span>
                        <span className="text-gray-600">visualizações</span>
                      </div>
                      <div className="text-gray-500">
                        Criada em {new Date(job.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => navigate(`/empresa/vagas/${job.id}/candidatos`)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
                      title="Ver candidatos"
                    >
                      <Users size={18} />
                      <span className="hidden sm:inline">Candidatos</span>
                    </button>

                    <button
                      onClick={() => navigate(`/empresa/vagas/${job.id}/estatisticas`)}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition flex items-center gap-2"
                      title="Estatísticas"
                    >
                      <BarChart3 size={18} />
                      <span className="hidden sm:inline">Stats</span>
                    </button>

                    <button
                      onClick={() => navigate(`/empresa/vagas/${job.id}/editar`)}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2"
                      title="Editar"
                    >
                      <Edit size={18} />
                      <span className="hidden sm:inline">Editar</span>
                    </button>

                    <button
                      onClick={() => handleToggleStatus(job.id)}
                      className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                        job.status === 'active'
                          ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                      title={job.status === 'active' ? 'Pausar' : 'Ativar'}
                    >
                      {job.status === 'active' ? <Pause size={18} /> : <Play size={18} />}
                    </button>

                    <button
                      onClick={() => handleDelete(job.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* CTA Bottom */}
        <div className="mt-8 bg-gradient-to-r from-[#1F3B47] to-[#2a5261] rounded-xl shadow-xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Publique mais vagas e encontre os melhores talentos!</h2>
          <p className="text-gray-300 mb-6">100% gratuito • Sem limite de vagas • Match inteligente</p>
          <button
            onClick={() => navigate('/empresa/publicar-vaga')}
            className="px-8 py-4 bg-[#F7941D] text-white rounded-lg font-bold text-lg hover:bg-[#e8870d] transition shadow-lg inline-flex items-center gap-2"
          >
            <Plus size={24} />
            Anunciar Vaga Grátis
          </button>
        </div>
      </div>
    </div>
  );
}

