import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PortalHeader from '@/components/PortalHeader';

/**
 * Candidate Dashboard Page
 * Gestão de currículo e busca de vagas
 */
export default function CandidateDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('vagas');
  const [jobs, setJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterTech, setFilterTech] = useState('');
  const [filterWorkMode, setFilterWorkMode] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterSalaryMin, setFilterSalaryMin] = useState('');
  const [filterSalaryMax, setFilterSalaryMax] = useState('');
  const [filterApplicationStatus, setFilterApplicationStatus] = useState('');
  const [sortApplications, setSortApplications] = useState('recent');
  const [resume, setResume] = useState(null);
  const [loadingResume, setLoadingResume] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [candidateData, setCandidateData] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    name: '',
    phone: ''
  });

  useEffect(() => {
    loadData();
    loadResume();
    loadCandidateData();
  }, []);

  const loadData = async () => {
    try {
      setLoadingJobs(true);
      
      // Carregar vagas ativas da API
      const response = await fetch('/api/jobs/');
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }

      // Carregar minhas candidaturas da API
      const token = localStorage.getItem('authToken');
      if (token) {
        const appsResponse = await fetch('/api/applications/my-applications', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (appsResponse.ok) {
          const appsData = await appsResponse.json();
          setMyApplications(appsData.applications || []);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  const loadResume = async () => {
    try {
      setLoadingResume(true);
      const token = localStorage.getItem('authToken');
      if (!token) return;
      
      const response = await fetch('/api/resume/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setResume(data);
      }
    } catch (error) {
      console.error('Erro ao carregar currículo:', error);
    } finally {
      setLoadingResume(false);
    }
  };

  const loadCandidateData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      
      const response = await fetch('/api/candidates/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCandidateData(data);
        setProfileFormData({
          name: user?.name || '',
          phone: data?.phone || ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados do candidato:', error);
    }
  };

  const handleEditProfile = () => {
    setIsEditingProfile(true);
    setProfileFormData({
      name: user?.name || '',
      phone: candidateData?.phone || ''
    });
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setProfileFormData({
      name: user?.name || '',
      phone: candidateData?.phone || ''
    });
  };

  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/candidates/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phone: profileFormData.phone
        })
      });

      if (response.ok) {
        setSuccessMessage('✅ Perfil atualizado com sucesso!');
        setTimeout(() => setSuccessMessage(''), 3000);
        setIsEditingProfile(false);
        await loadCandidateData();
      } else {
        setErrorMessage('❌ Erro ao atualizar perfil. Tente novamente.');
        setTimeout(() => setErrorMessage(''), 3000);
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      setErrorMessage('❌ Erro ao atualizar perfil. Tente novamente.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleApply = async (jobId) => {
    // Check if already applied
    const alreadyApplied = Array.isArray(myApplications) && myApplications.some(app => app.job_id === jobId);
    
    if (alreadyApplied) {
      setErrorMessage('Você já se candidatou a esta vaga!');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    try {
      setApplyingJobId(jobId);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setErrorMessage('Você precisa estar logado para se candidatar!');
        setTimeout(() => setErrorMessage(''), 3000);
        setApplyingJobId(null);
        return;
      }

      const response = await fetch('/api/applications/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          job_id: jobId
        })
      });

      if (response.ok) {
        const newApplication = await response.json();
        setMyApplications([...myApplications, newApplication]);
        setSuccessMessage('🎉 Candidatura enviada com sucesso!');
        setTimeout(() => setSuccessMessage(''), 5000);
        // Recarregar dados para atualizar
        await loadData();
      } else {
        const error = await response.json();
        setErrorMessage(error.message || 'Erro ao enviar candidatura. Tente novamente.');
        setTimeout(() => setErrorMessage(''), 3000);
      }
    } catch (error) {
      console.error('Erro ao enviar candidatura:', error);
      setErrorMessage('Erro ao enviar candidatura. Tente novamente.');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setApplyingJobId(null);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const location = job.city && job.state ? `${job.city}, ${job.state}` : job.city || '';
    const matchesLocation = !filterLocation || location.toLowerCase().includes(filterLocation.toLowerCase());
    
    const matchesType = !filterType || job.contract_type === filterType;
    
    const matchesTech = !filterTech || 
      (job.skills && job.skills.some(skill => 
        skill.toLowerCase().includes(filterTech.toLowerCase())
      ));
    
    const matchesWorkMode = !filterWorkMode || job.work_modality === filterWorkMode;
    
    const matchesLevel = !filterLevel || job.seniority_level === filterLevel;
    
    const matchesSalary = (!filterSalaryMin || job.min_salary >= parseInt(filterSalaryMin)) &&
                         (!filterSalaryMax || job.max_salary <= parseInt(filterSalaryMax));
    
    return matchesSearch && matchesLocation && matchesType && matchesTech && matchesWorkMode && matchesLevel && matchesSalary;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <PortalHeader user={user} onLogout={handleLogout} showNav={false} />

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('vagas')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === 'vagas'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💼 Buscar Vagas
            </button>
            <button
              onClick={() => setActiveTab('candidaturas')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === 'candidaturas'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 Minhas Candidaturas
            </button>
            <button
              onClick={() => setActiveTab('curriculo')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === 'curriculo'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📄 Meu Currículo
            </button>
            <button
              onClick={() => setActiveTab('perfil')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === 'perfil'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ⚙️ Perfil
            </button>
          </nav>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center">
            <span className="text-lg mr-2">✅</span>
            <span>{successMessage}</span>
          </div>
        </div>
      )}
      {errorMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center">
            <span className="text-lg mr-2">❌</span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Buscar Vagas */}
        {activeTab === 'vagas' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Buscar Vagas</h2>
            
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buscar por palavra-chave
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Ex: Desenvolvedor, SAP..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Localização
                  </label>
                  <input
                    type="text"
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    placeholder="Ex: São Paulo, Remoto..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Contrato
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Todos</option>
                    <option value="CLT">CLT</option>
                    <option value="PJ">PJ</option>
                    <option value="Estágio">Estágio</option>
                    <option value="Temporário">Temporário</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tecnologia
                  </label>
                  <input
                    type="text"
                    value={filterTech}
                    onChange={(e) => setFilterTech(e.target.value)}
                    placeholder="Ex: React, Python..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modalidade de Trabalho
                  </label>
                  <select
                    value={filterWorkMode}
                    onChange={(e) => setFilterWorkMode(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Todas</option>
                    <option value="presencial">Presencial</option>
                    <option value="remoto">Remoto</option>
                    <option value="híbrido">Híbrido</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nível
                  </label>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Todos</option>
                    <option value="junior">Júnior</option>
                    <option value="pleno">Pleno</option>
                    <option value="senior">Sênior</option>
                    <option value="especialista">Especialista</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Salário Mínimo (R$)
                  </label>
                  <input
                    type="number"
                    value={filterSalaryMin}
                    onChange={(e) => setFilterSalaryMin(e.target.value)}
                    placeholder="Ex: 5000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Salário Máximo (R$)
                  </label>
                  <input
                    type="number"
                    value={filterSalaryMax}
                    onChange={(e) => setFilterSalaryMax(e.target.value)}
                    placeholder="Ex: 15000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {loadingJobs ? 'Carregando...' : `${filteredJobs.length} vaga${filteredJobs.length !== 1 ? 's' : ''} encontrada${filteredJobs.length !== 1 ? 's' : ''}`}
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterLocation('');
                    setFilterType('');
                    setFilterTech('');
                    setFilterWorkMode('');
                    setFilterLevel('');
                    setFilterSalaryMin('');
                    setFilterSalaryMax('');
                  }}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  Limpar filtros
                </button>
              </div>
            </div>

            {/* Jobs List */}
            {filteredJobs.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <div className="text-6xl mb-4">💼</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma vaga encontrada</h3>
                <p className="text-gray-600">Tente ajustar os filtros de busca</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredJobs.map(job => {
                  const alreadyApplied = myApplications.some(app => app.job_id === job.id);
                  
                  return (
                    <div key={job.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">{job.title}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                            <span>🏢 {job.company_name || 'Empresa'}</span>
                            <span>📍 {job.location}</span>
                            <span>💰 {job.salary}</span>
                            <span>🕒 {job.contract_type || job.work_modality}</span>
                          </div>
                          <p className="text-gray-700 mb-3 line-clamp-2">{job.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {job.skills?.slice(0, 6).map((skill, idx) => (
                              <span key={idx} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="ml-4">
                          {alreadyApplied ? (
                            <button
                              disabled
                              className="px-6 py-3 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed"
                            >
                              ✓ Candidatado
                            </button>
                          ) : (
                            <button
                              onClick={() => handleApply(job.id)}
                              disabled={applyingJobId === job.id}
                              className={`px-6 py-3 rounded-lg transition font-medium ${
                                applyingJobId === job.id
                                  ? 'bg-orange-300 text-white cursor-wait'
                                  : 'bg-orange-500 text-white hover:bg-orange-600'
                              }`}
                            >
                              {applyingJobId === job.id ? (
                                <span className="flex items-center">
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Enviando...
                                </span>
                              ) : (
                                'Candidatar-se'
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
                        Publicada em: {new Date(job.created_at || Date.now()).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Minhas Candidaturas */}
        {activeTab === 'candidaturas' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Minhas Candidaturas</h2>
            
            {/* Filtros de Candidaturas */}
            {myApplications.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filtrar por Status
                    </label>
                    <select
                      value={filterApplicationStatus}
                      onChange={(e) => setFilterApplicationStatus(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Todos os status</option>
                      <option value="pending">Pendente</option>
                      <option value="approved">Aprovado</option>
                      <option value="rejected">Rejeitado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ordenar por
                    </label>
                    <select
                      value={sortApplications}
                      onChange={(e) => setSortApplications(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="recent">Mais recentes</option>
                      <option value="oldest">Mais antigas</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            
            {myApplications.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma candidatura ainda</h3>
                <p className="text-gray-600 mb-6">Comece buscando vagas e candidate-se!</p>
                <button
                  onClick={() => setActiveTab('vagas')}
                  className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                >
                  Buscar Vagas
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {myApplications
                  .filter(app => !filterApplicationStatus || app.status === filterApplicationStatus)
                  .sort((a, b) => {
                    const dateA = new Date(a.created_at || a.createdAt);
                    const dateB = new Date(b.created_at || b.createdAt);
                    return sortApplications === 'recent' ? dateB - dateA : dateA - dateB;
                  })
                  .map(application => {
                  const job = jobs.find(j => j.id === application.job_id);
                  
                  if (!job) return null;
                  
                  return (
                    <div key={application.id} className="bg-white rounded-lg shadow-sm p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">{job.title}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                            <span>🏢 {job.company || 'Empresa'}</span>
                            <span>📍 {job.location}</span>
                            <span>💰 {job.salary}</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Candidatura enviada em: {new Date(application.applied_at || application.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div>
                          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                            application.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-700'
                              : application.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {application.status === 'pending' && '⏳ Aguardando'}
                            {application.status === 'approved' && '✓ Aprovado'}
                            {application.status === 'rejected' && '✗ Rejeitado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Meu Currículo */}
        {activeTab === 'curriculo' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Meu Currículo</h2>
              {resume && (
                <Link
                  to="/candidato/curriculo"
                  className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium"
                >
                  Editar Currículo
                </Link>
              )}
            </div>
            
            {loadingResume ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-gray-600">Carregando currículo...</p>
              </div>
            ) : resume && (resume.experiences?.length > 0 || resume.education?.length > 0) ? (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <div className="text-center mb-6 pb-4 border-b">
                  <h1 className="text-2xl font-bold">{user?.name || 'Seu Nome'}</h1>
                  <p className="text-gray-600 mt-1">{user?.email}</p>
                </div>
                
                {resume.summary && (
                  <div className="mb-6">
                    <h2 className="text-lg font-bold mb-2">Resumo Profissional</h2>
                    <p className="text-gray-700">{resume.summary}</p>
                  </div>
                )}
                
                {resume.experiences && resume.experiences.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg font-bold mb-2">Experiência</h2>
                    {resume.experiences.map((exp, i) => (
                      <div key={i} className="mb-3">
                        <h3 className="font-semibold">{exp.title}</h3>
                        <p className="text-sm text-gray-600">{exp.company}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {resume.education && resume.education.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg font-bold mb-2">Formação</h2>
                    {resume.education.map((edu, i) => (
                      <div key={i} className="mb-3">
                        <h3 className="font-semibold">{edu.degree}</h3>
                        <p className="text-sm text-gray-600">{edu.institution}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Construa seu currículo profissional</h3>
                <p className="text-gray-600 mb-6">
                  Use nosso construtor de currículos para criar um perfil completo e atrair mais empresas
                </p>
                <Link
                  to="/candidato/curriculo"
                  className="inline-block px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                >
                  Ir para o Construtor de Currículo
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Perfil */}
        {activeTab === 'perfil' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Meu Perfil</h2>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                  <input
                    type="tel"
                    value={isEditingProfile ? profileFormData.phone : (candidateData?.phone || '')}
                    onChange={(e) => setProfileFormData({...profileFormData, phone: e.target.value})}
                    disabled={!isEditingProfile}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                      isEditingProfile ? 'bg-white' : 'bg-gray-50'
                    }`}
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  {!isEditingProfile ? (
                    <button 
                      onClick={handleEditProfile}
                      className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                    >
                      Editar Perfil
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={handleSaveProfile}
                        className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                      >
                        Salvar
                      </button>
                      <button 
                        onClick={handleCancelEdit}
                        className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

