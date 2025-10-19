import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Load jobs from localStorage (will be replaced with API call)
    const savedJobs = JSON.parse(localStorage.getItem('company_jobs') || '[]');
    setJobs(savedJobs.filter(job => job.status === 'active'));

    // Load my applications
    const allApplications = JSON.parse(localStorage.getItem('applications') || '[]');
    const myApps = allApplications.filter(app => app.candidateId === user?.id);
    setMyApplications(myApps);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleApply = (jobId) => {
    // Check if already applied
    const alreadyApplied = myApplications.some(app => app.jobId === jobId);
    
    if (alreadyApplied) {
      alert('Você já se candidatou a esta vaga!');
      return;
    }

    // Create application
    const newApplication = {
      id: Date.now(),
      jobId,
      candidateId: user?.id,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Save to localStorage
    const allApplications = JSON.parse(localStorage.getItem('applications') || '[]');
    allApplications.push(newApplication);
    localStorage.setItem('applications', JSON.stringify(allApplications));

    // Update state
    setMyApplications([...myApplications, newApplication]);
    
    alert('Candidatura enviada com sucesso!');
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = !filterLocation || job.location?.toLowerCase().includes(filterLocation.toLowerCase());
    const matchesType = !filterType || job.type === filterType;
    const matchesTech = !filterTech || job.skills?.some(skill => 
      skill.toLowerCase().includes(filterTech.toLowerCase())
    );
    return matchesSearch && matchesLocation && matchesType && matchesTech;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-blue-900">Portal ERP Jobs</h1>
              <span className="text-gray-500">|</span>
              <span className="text-gray-700">Painel do Candidato</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

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
              </div>
              <div className="mt-4 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {filteredJobs.length} vaga{filteredJobs.length !== 1 ? 's' : ''} encontrada{filteredJobs.length !== 1 ? 's' : ''}
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterLocation('');
                    setFilterType('');
                    setFilterTech('');
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
                  const alreadyApplied = myApplications.some(app => app.jobId === job.id);
                  
                  return (
                    <div key={job.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">{job.title}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                            <span>🏢 {job.company || 'Empresa'}</span>
                            <span>📍 {job.location}</span>
                            <span>💰 {job.salary}</span>
                            <span>🕒 {job.type}</span>
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
                              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium"
                            >
                              Candidatar-se
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
                        Publicada em: {new Date(job.createdAt || Date.now()).toLocaleDateString('pt-BR')}
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
                {myApplications.map(application => {
                  const job = jobs.find(j => j.id === application.jobId);
                  
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
                            Candidatura enviada em: {new Date(application.createdAt).toLocaleDateString('pt-BR')}
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
              <Link
                to="/candidato/curriculo"
                className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium"
              >
                Editar Currículo
              </Link>
            </div>
            
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
                    value={user?.phone || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div className="pt-4">
                  <button className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition">
                    Editar Perfil
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

