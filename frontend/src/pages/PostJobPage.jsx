import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, MapPin, Briefcase, DollarSign, FileText, Code, Globe, CheckCircle } from 'lucide-react';
import { jobAPI, configAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function PostJobPage() {
  const navigate = useNavigate();
  const { id } = useParams(); // ID da vaga para edição
  const isEditing = !!id;
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Etapa 1
    title: '',
    area_id: '',  // Agora usa area_id em vez de area texto
    area: '',     // Mantido para compatibilidade
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

  // Estados para dados dinâmicos do banco de dados
  const [areas, setAreas] = useState([]);
  const [levels, setLevels] = useState([]);
  const [modalities, setModalities] = useState([]);
  const [technologiesList, setTechnologiesList] = useState([]);
  const [softwaresList, setSoftwaresList] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Carregar dados de configuração do banco de dados
  useEffect(() => {
    loadConfigData();
  }, []);

  const loadConfigData = async () => {
    try {
      setLoadingConfig(true);
      const [areasData, levelsData, modalitiesData, techData, softData] = await Promise.all([
        configAPI.getAreas(),
        configAPI.getLevels(),
        configAPI.getModalities(),
        configAPI.getTechnologies(),
        configAPI.getSoftwares()
      ]);
      
      setAreas(areasData || []);
      setLevels(levelsData || []);
      setModalities(modalitiesData || []);
      setTechnologiesList(techData || []);
      setSoftwaresList(softData || []);
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
      // Fallback para dados estáticos se a API falhar
      setAreas([
        { id: 1, name: 'Desenvolvimento' },
        { id: 2, name: 'Consultoria & ERP' },
        { id: 3, name: 'Suporte & Infraestrutura' },
        { id: 4, name: 'DevOps & Cloud' },
        { id: 5, name: 'Dados & Analytics' },
        { id: 6, name: 'Segurança' },
        { id: 7, name: 'Gestão & Liderança' },
        { id: 8, name: 'Mobile' },
        { id: 9, name: 'QA & Testes' },
        { id: 10, name: 'Inteligência Artificial' },
        { id: 11, name: 'Blockchain & Web3' }
      ]);
      setLevels([
        { id: 1, name: 'Estágio' },
        { id: 2, name: 'Júnior' },
        { id: 3, name: 'Pleno' },
        { id: 4, name: 'Sênior' },
        { id: 5, name: 'Especialista' },
        { id: 6, name: 'Coordenador/Gerente' }
      ]);
      setModalities([
        { id: 1, name: 'Remoto', value: 'remote' },
        { id: 2, name: 'Presencial', value: 'onsite' },
        { id: 3, name: 'Híbrido', value: 'hybrid' }
      ]);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log('🔧 handleChange chamado:', { name, value });
    setFormData(prev => {
      console.log('🔧 Estado anterior:', prev);
      const newState = { ...prev, [name]: value };
      console.log('🔧 Novo estado:', newState);
      return newState;
    });
  };

  const handleAreaChange = (e) => {
    const areaId = e.target.value;
    const selectedArea = areas.find(a => a.id === parseInt(areaId));
    setFormData(prev => ({
      ...prev,
      area_id: areaId,
      area: selectedArea ? selectedArea.name : ''
    }));
  };

  const handleNext = () => {
    setCurrentStep(prev => prev + 1);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingJob, setLoadingJob] = useState(isEditing);

  // Carregar dados da vaga se estiver editando
  useEffect(() => {
    if (isEditing) {
      loadJobData();
    }
  }, [id]);

  const loadJobData = async () => {
    try {
      setLoadingJob(true);
      const job = await jobAPI.getById(id);
      
      // Preencher formulário com dados da vaga
      setFormData({
        title: job.title || '',
        area_id: job.area_id || '',
        area: job.area || '',
        level: job.seniority_level || '',
        workMode: job.work_modality || '',
        description: job.description || '',
        requirements: job.requirements || '',
        benefits: job.benefits || '',
        technologies: job.technologies || [],
        softwares: job.softwares || [],
        languages: job.languages || [],
        salaryMin: job.min_salary || '',
        salaryMax: job.max_salary || '',
        country: job.country || '',
        state: job.state || '',
        city: job.city || '',
        contractType: job.contract_type || '',
      });
    } catch (err) {
      console.error('Erro ao carregar vaga:', err);
      toast.error('Erro ao carregar dados da vaga');
      navigate('/empresa/vagas');
    } finally {
      setLoadingJob(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Preparar dados da vaga para a API
      const jobData = {
        title: formData.title,
        area_id: formData.area_id ? parseInt(formData.area_id) : null,
        area: formData.area,  // Mantido para compatibilidade
        level: formData.level,
        work_mode: formData.workMode,
        description: formData.description,
        requirements: formData.requirements,
        benefits: formData.benefits,
        technologies: formData.technologies,
        salary_min: parseFloat(formData.salaryMin) || null,
        salary_max: parseFloat(formData.salaryMax) || null,
        country: formData.country,
        state: formData.state,
        city: formData.city,
        contract_type: formData.contractType,
      };
      
      let response;
      if (isEditing) {
        response = await jobAPI.update(id, jobData);
        toast.success('Vaga atualizada com sucesso! ✅');
      } else {
        response = await jobAPI.create(jobData);
        toast.success('Vaga publicada com sucesso! 🎉');
      }
      
      navigate('/empresa/vagas');
    } catch (err) {
      console.error('Erro ao publicar vaga:', err);
      setError(err.message || 'Erro ao publicar vaga');
      toast.error(err.message || 'Erro ao publicar vaga');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Informações Básicas' },
    { number: 2, title: 'Descrição' },
    { number: 3, title: 'Tecnologias' },
    { number: 4, title: 'Salário e Localização' }
  ];

  // Mostrar loading enquanto carrega vaga para edição ou configurações
  if (loadingJob || loadingConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F7941D] mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {loadingJob ? 'Carregando dados da vaga...' : 'Carregando configurações...'}
          </p>
        </div>
      </div>
    );
  }

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
              <p className="text-xs text-gray-300">{isEditing ? 'Editar vaga' : 'Anuncie sua vaga'}</p>
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
                      name="area_id"
                      value={formData.area_id}
                      onChange={handleAreaChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                      required
                    >
                      <option value="">Selecione uma área</option>
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
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
                      {levels.length > 0 ? (
                        levels.map((level) => (
                          <option key={level.id} value={level.value || level.name.toLowerCase()}>
                            {level.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="estagio">Estágio</option>
                          <option value="junior">Júnior</option>
                          <option value="pleno">Pleno</option>
                          <option value="senior">Sênior</option>
                          <option value="especialista">Especialista</option>
                          <option value="coordenador">Coordenador</option>
                          <option value="gerente">Gerente</option>
                          <option value="diretor">Diretor</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modalidade de Trabalho *
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {(modalities.length > 0 ? modalities : [
                      { id: 1, name: 'Remoto', value: 'remote' },
                      { id: 2, name: 'Presencial', value: 'onsite' },
                      { id: 3, name: 'Híbrido', value: 'hybrid' }
                    ]).map((mode) => (
                      <label
                        key={mode.id}
                        className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition ${
                          formData.workMode === (mode.value || mode.name.toLowerCase())
                            ? 'border-[#F7941D] bg-[#F7941D]/10'
                            : 'border-gray-300 hover:border-[#F7941D]/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="workMode"
                          value={mode.value || mode.name.toLowerCase()}
                          checked={formData.workMode === (mode.value || mode.name.toLowerCase())}
                          onChange={handleChange}
                          className="sr-only"
                          required
                        />
                        <span className="font-medium">{mode.name}</span>
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
                    {(technologiesList.length > 0 ? technologiesList.map(t => t.name) : 
                      ['React', 'Node.js', 'Python', 'Java', 'C#', '.NET', 'Angular', 'Vue.js', 'TypeScript', 'JavaScript', 'PHP', 'Ruby']
                    ).map((tech) => (
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
                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                          formData.technologies.includes(tech)
                            ? 'bg-[#F7941D] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tech}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">
                    Selecionadas: {formData.technologies.length > 0 ? formData.technologies.join(', ') : 'Nenhuma'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Softwares / ERPs
                  </label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(softwaresList.length > 0 ? softwaresList.map(s => s.name) : 
                      ['SAP', 'TOTVS Protheus', 'TOTVS RM', 'Oracle EBS', 'Microsoft Dynamics', 'Salesforce', 'NetSuite', 'Workday']
                    ).map((software) => (
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
                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                          formData.softwares.includes(software)
                            ? 'bg-[#1F3B47] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {software}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">
                    Selecionados: {formData.softwares.length > 0 ? formData.softwares.join(', ') : 'Nenhum'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Idiomas Desejados
                  </label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['Inglês', 'Espanhol', 'Alemão', 'Francês', 'Italiano', 'Mandarim'].map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            languages: prev.languages.includes(lang)
                              ? prev.languages.filter(l => l !== lang)
                              : [...prev.languages, lang]
                          }));
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                          formData.languages.includes(lang)
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">
                    Selecionados: {formData.languages.length > 0 ? formData.languages.join(', ') : 'Nenhum'}
                  </p>
                </div>
              </div>
            )}

            {/* Etapa 4: Salário e Localização */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Faixa Salarial (R$)
                  </label>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="number"
                        name="salaryMin"
                        value={formData.salaryMin}
                        onChange={handleChange}
                        placeholder="Mínimo"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                      />
                    </div>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="number"
                        name="salaryMax"
                        value={formData.salaryMax}
                        onChange={handleChange}
                        placeholder="Máximo"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Deixe em branco para "A combinar"
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Contratação *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { value: 'clt', label: 'CLT' },
                      { value: 'pj', label: 'PJ' },
                      { value: 'freelance', label: 'Freelance' },
                      { value: 'internship', label: 'Estágio' }
                    ].map((type) => (
                      <label
                        key={type.value}
                        className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition ${
                          formData.contractType === type.value
                            ? 'border-[#F7941D] bg-[#F7941D]/10'
                            : 'border-gray-300 hover:border-[#F7941D]/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="contractType"
                          value={type.value}
                          checked={formData.contractType === type.value}
                          onChange={handleChange}
                          className="sr-only"
                          required
                        />
                        <span className="font-medium">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      País
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        placeholder="Brasil"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        placeholder="São Paulo"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cidade
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="São Paulo"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Voltar
                </button>
              ) : (
                <div />
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-8 py-3 bg-[#F7941D] text-white rounded-lg font-medium hover:bg-[#e8850f] transition"
                >
                  Próximo
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-[#F7941D] text-white rounded-lg font-medium hover:bg-[#e8850f] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      {isEditing ? 'Salvando...' : 'Publicando...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      {isEditing ? 'Salvar Alterações' : 'Publicar Vaga'}
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
