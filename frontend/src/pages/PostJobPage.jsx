import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Briefcase, DollarSign, FileText, Code, Globe, CheckCircle } from 'lucide-react';

export default function PostJobPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Etapa 1
    title: '',
    area: '',
    level: '',
    workMode: '',
    // Etapa 2
    description: '',
    requirements: '',
    benefits: '',
    // Etapa 3
    technologies: [],
    softwares: [],
    languages: [],
    // Etapa 4
    salaryMin: '',
    salaryMax: '',
    country: '',
    state: '',
    city: '',
    contractType: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    setCurrentStep(prev => prev + 1);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Criar objeto da vaga com dados completos
    const newJob = {
      id: Date.now(), // ID único baseado em timestamp
      ...formData,
      status: 'Ativa',
      candidates: 0,
      views: 0,
      createdAt: new Date().toLocaleDateString('pt-BR'),
      companyName: 'Empresa de Tecnologia' // Seria pego do contexto de autenticação
    };
    
    // Buscar vagas existentes do localStorage
    const existingJobs = JSON.parse(localStorage.getItem('jobs') || '[]');
    
    // Adicionar nova vaga
    const updatedJobs = [...existingJobs, newJob];
    
    // Salvar no localStorage
    localStorage.setItem('jobs', JSON.stringify(updatedJobs));
    
    console.log('Vaga publicada:', newJob);
    alert('Vaga publicada com sucesso! 🎉');
    navigate('/empresa/vagas');
  };

  const steps = [
    { number: 1, title: 'Informações Básicas' },
    { number: 2, title: 'Descrição' },
    { number: 3, title: 'Tecnologias' },
    { number: 4, title: 'Salário e Localização' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
              <p className="text-xs text-gray-300">Anuncie sua vaga</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/empresa/dashboard')}
            className="px-4 py-2 border border-white/30 rounded-lg hover:bg-white/10 transition"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                    currentStep > step.number
                      ? 'bg-[#F7941D] text-white'
                      : currentStep === step.number
                      ? 'bg-[#F7941D] text-white ring-4 ring-[#F7941D]/30'
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    {currentStep > step.number ? <CheckCircle size={24} /> : step.number}
                  </div>
                  <span className={`text-sm mt-2 font-medium ${
                    currentStep >= step.number ? 'text-[#1F3B47]' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-1 flex-1 mx-2 rounded transition-all ${
                    currentStep > step.number ? 'bg-[#F7941D]' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#1F3B47] to-[#2a5261] p-6 text-white">
            <h2 className="text-2xl font-bold mb-2">
              {currentStep === 1 && 'Informações Básicas da Vaga'}
              {currentStep === 2 && 'Descrição e Requisitos'}
              {currentStep === 3 && 'Tecnologias e Habilidades'}
              {currentStep === 4 && 'Salário e Localização'}
            </h2>
            <p className="text-gray-300">
              {currentStep === 1 && 'Informe os dados principais da vaga'}
              {currentStep === 2 && 'Descreva a vaga e o que você procura'}
              {currentStep === 3 && 'Selecione as tecnologias necessárias'}
              {currentStep === 4 && 'Defina a remuneração e localização'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            {/* Etapa 1: Informações Básicas */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título da Vaga *
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Ex: Desenvolvedor Full Stack Sênior"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Área de Atuação *
                    </label>
                    <select
                      name="area"
                      value={formData.area}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                      required
                    >
                      <option value="">Selecione uma área</option>
                      <option value="desenvolvimento">Desenvolvimento</option>
                      <option value="consultoria">Consultoria & ERP</option>
                      <option value="suporte">Suporte & Infraestrutura</option>
                      <option value="gestao">Gestão & Liderança</option>
                      <option value="vendas">Vendas & Pré-Vendas</option>
                      <option value="administrativo">Administrativo</option>
                      <option value="devops">DevOps & Cloud</option>
                      <option value="dados">Dados & Analytics</option>
                      <option value="seguranca">Segurança</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nível de Experiência *
                    </label>
                    <select
                      name="level"
                      value={formData.level}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                      required
                    >
                      <option value="">Selecione o nível</option>
                      <option value="estagio">Estágio</option>
                      <option value="junior">Júnior</option>
                      <option value="pleno">Pleno</option>
                      <option value="senior">Sênior</option>
                      <option value="especialista">Especialista</option>
                      <option value="coordenador">Coordenador</option>
                      <option value="gerente">Gerente</option>
                      <option value="diretor">Diretor</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modalidade de Trabalho *
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {['Remoto', 'Presencial', 'Híbrido'].map((mode) => (
                      <label
                        key={mode}
                        className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition ${
                          formData.workMode === mode.toLowerCase()
                            ? 'border-[#F7941D] bg-[#F7941D]/10'
                            : 'border-gray-300 hover:border-[#F7941D]/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="workMode"
                          value={mode.toLowerCase()}
                          checked={formData.workMode === mode.toLowerCase()}
                          onChange={handleChange}
                          className="sr-only"
                          required
                        />
                        <span className="font-medium">{mode}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Etapa 2: Descrição */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição da Vaga *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Descreva as responsabilidades e atividades do dia a dia..."
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Requisitos *
                  </label>
                  <textarea
                    name="requirements"
                    value={formData.requirements}
                    onChange={handleChange}
                    placeholder="Liste os requisitos necessários (um por linha)&#10;Ex:&#10;- Experiência com React&#10;- Conhecimento em Node.js&#10;- Inglês intermediário"
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Benefícios
                  </label>
                  <textarea
                    name="benefits"
                    value={formData.benefits}
                    onChange={handleChange}
                    placeholder="Liste os benefícios oferecidos (um por linha)&#10;Ex:&#10;- Vale refeição&#10;- Plano de saúde&#10;- Home office"
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Etapa 3: Tecnologias */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tecnologias Necessárias *
                  </label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['React', 'Node.js', 'Python', 'Java', 'C#', '.NET', 'Angular', 'Vue.js', 'TypeScript', 'JavaScript', 'PHP', 'Ruby'].map((tech) => (
                      <button
                        key={tech}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            technologies: prev.technologies.includes(tech)
                              ? prev.technologies.filter(t => t !== tech)
                              : [...prev.technologies, tech]
                          }));
                        }}
                        className={`px-4 py-2 rounded-full font-medium transition ${
                          formData.technologies.includes(tech)
                            ? 'bg-[#F7941D] text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {tech}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">Selecione as tecnologias necessárias para a vaga</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Softwares/ERPs
                  </label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['SAP', 'Oracle', 'Protheus', 'TOTVS', 'Salesforce', 'Microsoft Dynamics', 'ServiceNow', 'Jira'].map((software) => (
                      <button
                        key={software}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            softwares: prev.softwares.includes(software)
                              ? prev.softwares.filter(s => s !== software)
                              : [...prev.softwares, software]
                          }));
                        }}
                        className={`px-4 py-2 rounded-full font-medium transition ${
                          formData.softwares.includes(software)
                            ? 'bg-[#F7941D] text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {software}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Idiomas Necessários
                  </label>
                  <div className="space-y-3">
                    {['Português', 'Inglês', 'Espanhol'].map((lang) => (
                      <label key={lang} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={formData.languages.includes(lang)}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              languages: e.target.checked
                                ? [...prev.languages, lang]
                                : prev.languages.filter(l => l !== lang)
                            }));
                          }}
                          className="w-5 h-5 text-[#F7941D] rounded focus:ring-[#F7941D]"
                        />
                        <span className="font-medium">{lang}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Etapa 4: Salário e Localização */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Faixa Salarial *
                  </label>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="number"
                        name="salaryMin"
                        value={formData.salaryMin}
                        onChange={handleChange}
                        placeholder="Salário mínimo"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                        required
                      />
                    </div>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="number"
                        name="salaryMax"
                        value={formData.salaryMax}
                        onChange={handleChange}
                        placeholder="Salário máximo"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Contratação *
                  </label>
                  <select
                    name="contractType"
                    value={formData.contractType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                    required
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="clt">CLT</option>
                    <option value="pj">PJ</option>
                    <option value="temporario">Temporário</option>
                    <option value="estagio">Estágio</option>
                    <option value="freelance">Freelance</option>
                  </select>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      País *
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="BR">Brasil</option>
                      <option value="US">Estados Unidos</option>
                      <option value="ES">Espanha</option>
                      <option value="MX">México</option>
                      <option value="AR">Argentina</option>
                      <option value="PT">Portugal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado/Região *
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="Ex: SP, NY, Madrid"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cidade *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="Ex: São Paulo"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    ℹ️ Sua vaga será publicada <strong>gratuitamente</strong> e ficará ativa por 30 dias. Você poderá editá-la ou pausá-la a qualquer momento.
                  </p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4 mt-8">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Voltar
                </button>
              )}
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 px-6 py-3 bg-[#F7941D] text-white rounded-lg font-medium hover:bg-[#e8870d] transition shadow-lg"
                >
                  Próximo
                </button>
              ) : (
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-[#F7941D] text-white rounded-lg font-medium hover:bg-[#e8870d] transition shadow-lg"
                >
                  Publicar Vaga Grátis 🎉
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-lg text-[#1F3B47] mb-3">Por que anunciar no Portal ERP Jobs?</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
              <span><strong>100% Gratuito</strong> - Publique quantas vagas quiser sem custo</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
              <span><strong>100.000+ Candidatos</strong> qualificados no setor de software</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
              <span><strong>Match Inteligente</strong> - Encontre os melhores talentos automaticamente</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
              <span><strong>Gestão Completa</strong> - Acompanhe candidaturas e gerencie todo o processo</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

