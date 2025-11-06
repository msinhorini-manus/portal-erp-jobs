import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function CandidatePublicProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCandidateProfile();
  }, [id]);

  const loadCandidateProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/candidates/${id}/profile`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao carregar perfil');
      }
      
      const data = await response.json();
      setCandidate(data);
    } catch (err) {
      console.error('Error loading candidate profile:', err);
      setError(err.message || 'Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleContact = () => {
    // TODO: Implementar modal de contato ou redirecionar para formulário
    alert('Funcionalidade de contato será implementada');
  };

  const handleSaveCandidate = () => {
    // TODO: Implementar salvamento do candidato pela empresa
    alert('Candidato salvo com sucesso!');
  };

  const handleDownloadResume = () => {
    // TODO: Implementar download do currículo em PDF
    alert('Download do currículo será implementado');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
          <button
            onClick={() => navigate('/vagas')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar para Vagas
          </button>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return null;
  }

  // Calculate match percentage (placeholder - will be calculated based on job requirements)
  const matchPercentage = 92;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1e3a5f] text-white py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center font-bold text-xl">
              P
            </div>
            <h1 className="text-2xl font-bold">
              PORTAL <span className="text-orange-500">ERP JOBS</span>
            </h1>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <span>🔍 652 SER</span>
            <span>IF</span>
            <span>HT</span>
            <button className="p-2 hover:bg-white/10 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-8">
            {/* Profile Header */}
            <div className="flex items-start space-x-6 mb-8">
              {/* Photo */}
              <div className="flex-shrink-0">
                {candidate.photo_url ? (
                  <img
                    src={candidate.photo_url}
                    alt={candidate.full_name}
                    className="w-32 h-32 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-lg bg-gray-200 flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-[#1e3a5f] mb-2">
                  {candidate.full_name || `${candidate.first_name} ${candidate.last_name}`}
                </h2>
                <p className="text-xl text-gray-700 mb-4">
                  {candidate.current_title || 'Profissional'}
                </p>
                
                <div className="space-y-2 text-gray-600">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{candidate.city}, {candidate.state}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{candidate.email || 'Não informado'}</span>
                  </div>
                  
                  {candidate.phone && (
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{candidate.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Professional Summary */}
            {candidate.professional_summary && (
              <section className="mb-8">
                <h3 className="text-xl font-bold text-[#1e3a5f] mb-4 uppercase">
                  Resumo Profissional
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {candidate.professional_summary}
                </p>
              </section>
            )}

            {/* Professional Experience */}
            {candidate.experiences && candidate.experiences.length > 0 && (
              <section className="mb-8">
                <h3 className="text-xl font-bold text-[#1e3a5f] mb-4 uppercase">
                  Experiência Profissional
                </h3>
                <div className="space-y-6">
                  {candidate.experiences.map((exp, index) => (
                    <div key={index} className="border-l-2 border-gray-200 pl-4">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {exp.title}
                      </h4>
                      <p className="text-gray-600 mb-1">{exp.company}</p>
                      <p className="text-sm text-gray-500 mb-2">
                        {exp.start_date} - {exp.is_current ? 'Atual' : exp.end_date}
                      </p>
                      {exp.description && (
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                          {exp.description.split('\n').map((line, i) => (
                            line.trim() && <li key={i}>{line.trim().replace(/^[•\-]\s*/, '')}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Education */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {candidate.educations && candidate.educations.length > 0 && (
                <section>
                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-4 uppercase">
                    Educação
                  </h3>
                  <div className="space-y-4">
                    {candidate.educations.map((edu, index) => (
                      <div key={index}>
                        <p className="font-semibold text-gray-900">{edu.degree}</p>
                        <p className="text-gray-600">{edu.institution}</p>
                        {edu.field_of_study && (
                          <p className="text-sm text-gray-500">{edu.field_of_study}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {candidate.languages && candidate.languages.length > 0 && (
                <section>
                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-4 uppercase">
                    Idiomas
                  </h3>
                  <div className="space-y-2">
                    {candidate.languages.map((lang, index) => (
                      <div key={index}>
                        <p className="text-gray-900">
                          {lang.language} <span className="text-gray-500">({lang.proficiency})</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Match Card */}
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="relative inline-block mb-4">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#f3f4f6"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#f97316"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - matchPercentage / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-gray-900">{matchPercentage}%</span>
                  <span className="text-sm text-gray-600">Match</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Rarável</p>
                  <p className="font-semibold text-gray-900">
                    {candidate.available_immediately ? 'Disponível' : 'Não disponível'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Disponível</p>
                  <p className="font-semibold text-gray-900">
                    {candidate.expected_salary ? `R$ ${candidate.expected_salary.toLocaleString('pt-BR')}` : 'A combinar'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleContact}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg mb-3 transition-colors"
              >
                ENTRAR EM CONTATO
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleSaveCandidate}
                  className="border-2 border-gray-300 hover:border-orange-500 text-gray-700 hover:text-orange-500 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  SALVAR
                </button>
                <button
                  onClick={handleDownloadResume}
                  className="border-2 border-gray-300 hover:border-orange-500 text-gray-700 hover:text-orange-500 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  CURRÍCULO
                </button>
              </div>
            </div>

            {/* Technologies */}
            {candidate.skills && candidate.skills.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-bold text-[#1e3a5f] mb-4 uppercase">
                  Tecnologias
                </h3>
                <div className="space-y-3">
                  {candidate.skills.map((skill, index) => (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {skill.skill_name}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(skill.proficiency_level / 4) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {candidate.certifications && candidate.certifications.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-bold text-[#1e3a5f] mb-4 uppercase">
                  Certificações
                </h3>
                <ul className="space-y-2">
                  {candidate.certifications.map((cert, index) => (
                    <li key={index} className="text-sm text-gray-700">
                      {cert.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Projects */}
            {candidate.projects && candidate.projects.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-bold text-[#1e3a5f] mb-4 uppercase">
                  Projetos
                </h3>
                <ul className="space-y-2">
                  {candidate.projects.map((project, index) => (
                    <li key={index} className="text-sm text-gray-700">
                      {project.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

