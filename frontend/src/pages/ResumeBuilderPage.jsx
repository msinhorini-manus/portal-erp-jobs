import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, Download, Eye, EyeOff, Plus, Trash2, Edit2 } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { resumeAPI } from '../services/api'

export default function ResumeBuilderPage() {
  const navigate = useNavigate()
  const [showPreview, setShowPreview] = useState(true)
  const [activeSection, setActiveSection] = useState('personal')
  const [loading, setLoading] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const resumePreviewRef = useRef(null)

  // Carregar currículo existente
  useEffect(() => {
    const loadResume = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return

        const data = await resumeAPI.get()
        if (data && data.candidate) {
          const candidate = data.candidate
          const fullName = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim()
          
          setResume({
            personal: {
              fullName: fullName,
              email: candidate.email || '',
              phone: candidate.phone || '',
              city: candidate.city || '',
              state: candidate.state || '',
              country: 'Brasil',
              linkedin: candidate.linkedin_url || '',
              github: candidate.github_url || '',
              portfolio: candidate.portfolio_url || ''
            },
            summary: candidate.professional_summary || '',
            experiences: data.experiences || [],
            education: data.educations || [],
            skills: data.skills || [],
            certifications: data.certifications || [],
            projects: data.projects || [],
            languages: data.languages || []
          })
        }
      } catch (error) {
        console.error('Erro ao carregar currículo:', error)
      }
    }

    loadResume()
  }, [])

  // Estado do currículo
  const [resume, setResume] = useState({
    personal: {
      fullName: '',
      email: '',
      phone: '',
      city: '',
      state: '',
      country: 'Brasil',
      linkedin: '',
      github: '',
      portfolio: ''
    },
    summary: '',
    experiences: [],
    education: [],
    skills: [],
    certifications: [],
    projects: [],
    languages: []
  })

  // Seções do currículo
  const sections = [
    { id: 'personal', name: 'Dados Pessoais', icon: '👤' },
    { id: 'summary', name: 'Resumo Profissional', icon: '📝' },
    { id: 'experiences', name: 'Experiências', icon: '💼' },
    { id: 'education', name: 'Formação', icon: '🎓' },
    { id: 'skills', name: 'Tecnologias', icon: '💻' },
    { id: 'certifications', name: 'Certificações', icon: '🏆' },
    { id: 'projects', name: 'Projetos', icon: '🚀' },
    { id: 'languages', name: 'Idiomas', icon: '🌍' }
  ]

  // Funções de atualização
  const updatePersonal = (field, value) => {
    setResume(prev => ({
      ...prev,
      personal: { ...prev.personal, [field]: value }
    }))
  }

  const updateSummary = (value) => {
    setResume(prev => ({ ...prev, summary: value }))
  }

  const addExperience = () => {
    setResume(prev => ({
      ...prev,
      experiences: [...prev.experiences, {
        id: Date.now(),
        title: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        description: ''
      }]
    }))
  }

  const updateExperience = (id, field, value) => {
    setResume(prev => ({
      ...prev,
      experiences: prev.experiences.map(exp =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    }))
  }

  const removeExperience = (id) => {
    setResume(prev => ({
      ...prev,
      experiences: prev.experiences.filter(exp => exp.id !== id)
    }))
  }

  const addEducation = () => {
    setResume(prev => ({
      ...prev,
      education: [...prev.education, {
        id: Date.now(),
        degree: '',
        institution: '',
        field: '',
        startDate: '',
        endDate: '',
        current: false
      }]
    }))
  }

  const updateEducation = (id, field, value) => {
    setResume(prev => ({
      ...prev,
      education: prev.education.map(edu =>
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    }))
  }

  const removeEducation = (id) => {
    setResume(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id)
    }))
  }

  const addSkill = () => {
    setResume(prev => ({
      ...prev,
      skills: [...prev.skills, {
        id: Date.now(),
        name: '',
        level: 'intermediário'
      }]
    }))
  }

  const updateSkill = (id, field, value) => {
    setResume(prev => ({
      ...prev,
      skills: prev.skills.map(skill =>
        skill.id === id ? { ...skill, [field]: value } : skill
      )
    }))
  }

  const removeSkill = (id) => {
    setResume(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill.id !== id)
    }))
  }

  const addCertification = () => {
    setResume(prev => ({
      ...prev,
      certifications: [...prev.certifications, {
        id: Date.now(),
        name: '',
        issuer: '',
        date: '',
        url: ''
      }]
    }))
  }

  const updateCertification = (id, field, value) => {
    setResume(prev => ({
      ...prev,
      certifications: prev.certifications.map(cert =>
        cert.id === id ? { ...cert, [field]: value } : cert
      )
    }))
  }

  const removeCertification = (id) => {
    setResume(prev => ({
      ...prev,
      certifications: prev.certifications.filter(cert => cert.id !== id)
    }))
  }

  const addProject = () => {
    setResume(prev => ({
      ...prev,
      projects: [...prev.projects, {
        id: Date.now(),
        name: '',
        description: '',
        technologies: '',
        url: ''
      }]
    }))
  }

  const updateProject = (id, field, value) => {
    setResume(prev => ({
      ...prev,
      projects: prev.projects.map(proj =>
        proj.id === id ? { ...proj, [field]: value } : proj
      )
    }))
  }

  const removeProject = (id) => {
    setResume(prev => ({
      ...prev,
      projects: prev.projects.filter(proj => proj.id !== id)
    }))
  }

  const addLanguage = () => {
    setResume(prev => ({
      ...prev,
      languages: [...prev.languages, {
        id: Date.now(),
        name: '',
        level: 'intermediário'
      }]
    }))
  }

  const updateLanguage = (id, field, value) => {
    setResume(prev => ({
      ...prev,
      languages: prev.languages.map(lang =>
        lang.id === id ? { ...lang, [field]: value } : lang
      )
    }))
  }

  const removeLanguage = (id) => {
    setResume(prev => ({
      ...prev,
      languages: prev.languages.filter(lang => lang.id !== id)
    }))
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      setSaveMessage('')
      
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Você precisa estar logado para salvar o currículo')
        navigate('/candidato/login')
        return
      }

      // Salvar dados pessoais
      const [firstName, ...lastNameParts] = resume.personal.fullName.split(' ')
      const lastName = lastNameParts.join(' ')
      
      await resumeAPI.update({
        first_name: firstName || '',
        last_name: lastName || '',
        phone: resume.personal.phone,
        city: resume.personal.city,
        state: resume.personal.state,
        linkedin_url: resume.personal.linkedin,
        github_url: resume.personal.github,
        portfolio_url: resume.personal.portfolio,
        professional_summary: resume.summary
      })

      // Salvar experiências
      for (const exp of resume.experiences) {
        // Salvar apenas experiências novas (que não têm ID do backend)
        if (!exp.backend_id) {
          await resumeAPI.addExperience({
            job_title: exp.title,
            company_name: exp.company,
            city: exp.location || '',
            state: '',
            country: 'Brasil',
            start_date: exp.startDate,
            end_date: exp.current ? null : exp.endDate,
            is_current_job: exp.current || false,
            description: exp.description
          })
        }
      }

      // Salvar formação acadêmica
      for (const edu of resume.education) {
        if (!edu.backend_id) {
          await resumeAPI.addEducation({
            degree: edu.degree,
            institution_name: edu.institution,
            field_of_study: edu.field,
            start_date: edu.startDate,
            end_date: edu.endDate,
            is_current: edu.current || false
          })
        }
      }

      // Salvar habilidades
      for (const skill of resume.skills) {
        if (!skill.backend_id) {
          await resumeAPI.addSkill({
            name: skill.name,
            proficiency_level: skill.level
          })
        }
      }

      // Salvar certificações
      for (const cert of resume.certifications) {
        if (!cert.backend_id) {
          await resumeAPI.addCertification({
            name: cert.name,
            issuing_organization: cert.organization,
            issue_date: cert.date,
            credential_id: cert.credentialId || '',
            credential_url: cert.url || ''
          })
        }
      }

      // Salvar projetos
      for (const proj of resume.projects) {
        if (!proj.backend_id) {
          await resumeAPI.addProject({
            name: proj.name,
            description: proj.description,
            technologies: proj.technologies,
            url: proj.url || ''
          })
        }
      }

      // Salvar idiomas
      for (const lang of resume.languages) {
        if (!lang.backend_id) {
          await resumeAPI.addLanguage({
            language: lang.name,
            proficiency_level: lang.level
          })
        }
      }

      setSaveMessage('Currículo salvo com sucesso!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      console.error('Erro ao salvar currículo:', error)
      alert('Erro ao salvar currículo. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = () => {
    const input = resumePreviewRef.current;
    if (input) {
      html2canvas(input, { scale: 2 })
        .then((canvas) => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;
          const ratio = canvasWidth / canvasHeight;
          const width = pdfWidth;
          const height = width / ratio;

          if (height > pdfHeight) {
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, -pdfHeight, pdfWidth, pdfHeight);
          } else {
            pdf.addImage(imgData, 'PNG', 0, 0, width, height);
          }
          
          pdf.save('curriculo.pdf');
        });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Construtor de Currículo</h1>
              <p className="text-sm text-gray-600 mt-1">Crie seu currículo profissional em minutos</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPreview ? 'Ocultar' : 'Mostrar'} Preview
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar PDF
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Salvar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Editor Panel */}
          <div className={showPreview ? 'col-span-7' : 'col-span-12'}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Section Tabs */}
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex flex-wrap gap-2">
                  {sections.map(section => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        activeSection === section.id
                          ? 'bg-[#FF6B35] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>{section.icon}</span>
                      <span className="text-sm font-medium">{section.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section Content */}
              <div className="p-6">
                {/* Dados Pessoais */}
                {activeSection === 'personal' && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Dados Pessoais</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
                        <input
                          type="text"
                          value={resume.personal.fullName}
                          onChange={(e) => updatePersonal('fullName', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                          placeholder="João Silva"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                        <input
                          type="email"
                          value={resume.personal.email}
                          onChange={(e) => updatePersonal('email', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                          placeholder="joao@email.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                        <input
                          type="tel"
                          value={resume.personal.phone}
                          onChange={(e) => updatePersonal('phone', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                        <input
                          type="text"
                          value={resume.personal.city}
                          onChange={(e) => updatePersonal('city', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                          placeholder="São Paulo"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                        <input
                          type="text"
                          value={resume.personal.state}
                          onChange={(e) => updatePersonal('state', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                          placeholder="SP"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn</label>
                        <input
                          type="url"
                          value={resume.personal.linkedin}
                          onChange={(e) => updatePersonal('linkedin', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                          placeholder="https://linkedin.com/in/joaosilva"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">GitHub</label>
                        <input
                          type="url"
                          value={resume.personal.github}
                          onChange={(e) => updatePersonal('github', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                          placeholder="https://github.com/joaosilva"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Portfólio</label>
                        <input
                          type="url"
                          value={resume.personal.portfolio}
                          onChange={(e) => updatePersonal('portfolio', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                          placeholder="https://joaosilva.dev"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Resumo Profissional */}
                {activeSection === 'summary' && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Resumo Profissional</h2>
                    <textarea
                      value={resume.summary}
                      onChange={(e) => updateSummary(e.target.value)}
                      rows="6"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                      placeholder="Descreva sua carreira, habilidades e objetivos..."
                    />
                    <p className="text-xs text-gray-500 mt-2">{resume.summary.length} / 1500 caracteres</p>
                  </div>
                )}

                {/* Experiências */}
                {activeSection === 'experiences' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-900">Experiências Profissionais</h2>
                      <button
                        onClick={addExperience}
                        className="flex items-center gap-2 px-4 py-2 text-white bg-[#FF6B35] rounded-lg hover:bg-opacity-90 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar Experiência
                      </button>
                    </div>
                    {resume.experiences.length > 0 ? (
                      <div className="space-y-6">
                        {resume.experiences.map((exp, index) => (
                          <div key={exp.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-bold text-lg">Experiência #{index + 1}</h3>
                              <button onClick={() => removeExperience(exp.id)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cargo *</label>
                                <input
                                  type="text"
                                  value={exp.title}
                                  onChange={(e) => updateExperience(exp.id, 'title', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                  placeholder="Desenvolvedor Full Stack"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Empresa *</label>
                                <input
                                  type="text"
                                  value={exp.company}
                                  onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                  placeholder="Tech Company"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
                                <input
                                  type="month"
                                  value={exp.startDate}
                                  onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
                                <input
                                  type="month"
                                  value={exp.endDate}
                                  onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                  disabled={exp.current}
                                />
                              </div>
                              <div className="col-span-2 flex items-center">
                                <input
                                  type="checkbox"
                                  checked={exp.current}
                                  onChange={(e) => updateExperience(exp.id, 'current', e.target.checked)}
                                  className="h-4 w-4 text-[#FF6B35] border-gray-300 rounded"
                                />
                                <label className="ml-2 block text-sm text-gray-900">Trabalho aqui atualmente</label>
                              </div>
                              <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                                <textarea
                                  value={exp.description}
                                  onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                                  rows="4"
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                  placeholder="Descreva suas responsabilidades e conquistas..."
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                        <p className="text-gray-500">Nenhuma experiência adicionada ainda</p>
                        <button
                          onClick={addExperience}
                          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#FF6B35] rounded-lg"
                        >
                          Adicionar primeira experiência
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Formação */}
                {activeSection === 'education' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-900">Formação Acadêmica</h2>
                      <button
                        onClick={addEducation}
                        className="flex items-center gap-2 px-4 py-2 text-white bg-[#FF6B35] rounded-lg hover:bg-opacity-90 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar Formação
                      </button>
                    </div>
                    {resume.education.length > 0 ? (
                      <div className="space-y-6">
                        {resume.education.map((edu, index) => (
                          <div key={edu.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-bold text-lg">Formação #{index + 1}</h3>
                              <button onClick={() => removeEducation(edu.id)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Grau *</label>
                                <input
                                  type="text"
                                  value={edu.degree}
                                  onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                  placeholder="Bacharelado"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Instituição *</label>
                                <input
                                  type="text"
                                  value={edu.institution}
                                  onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                  placeholder="Universidade de São Paulo"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Área de Estudo</label>
                                <input
                                  type="text"
                                  value={edu.field}
                                  onChange={(e) => updateEducation(edu.id, 'field', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                  placeholder="Ciência da Computação"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
                                <input
                                  type="month"
                                  value={edu.startDate}
                                  onChange={(e) => updateEducation(edu.id, 'startDate', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
                                <input
                                  type="month"
                                  value={edu.endDate}
                                  onChange={(e) => updateEducation(edu.id, 'endDate', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                  disabled={edu.current}
                                />
                              </div>
                              <div className="col-span-2 flex items-center">
                                <input
                                  type="checkbox"
                                  checked={edu.current}
                                  onChange={(e) => updateEducation(edu.id, 'current', e.target.checked)}
                                  className="h-4 w-4 text-[#FF6B35] border-gray-300 rounded"
                                />
                                <label className="ml-2 block text-sm text-gray-900">Estudo aqui atualmente</label>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                        <p className="text-gray-500">Nenhuma formação adicionada ainda</p>
                        <button
                          onClick={addEducation}
                          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#FF6B35] rounded-lg"
                        >
                          Adicionar primeira formação
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Tecnologias */}
                {activeSection === 'skills' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-900">Tecnologias e Habilidades</h2>
                      <button
                        onClick={addSkill}
                        className="flex items-center gap-2 px-4 py-2 text-white bg-[#FF6B35] rounded-lg hover:bg-opacity-90 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar Tecnologia
                      </button>
                    </div>
                    {resume.skills.length > 0 ? (
                      <div className="space-y-6">
                        {resume.skills.map((skill, index) => (
                          <div key={skill.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-bold text-lg">Tecnologia #{index + 1}</h3>
                              <button onClick={() => removeSkill(skill.id)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
                                <input
                                  type="text"
                                  value={skill.name}
                                  onChange={(e) => updateSkill(skill.id, 'name', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                  placeholder="React"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nível</label>
                                <select
                                  value={skill.level}
                                  onChange={(e) => updateSkill(skill.id, 'level', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                >
                                  <option>Básico</option>
                                  <option>Intermediário</option>
                                  <option>Avançado</option>
                                  <option>Expert</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                        <p className="text-gray-500">Nenhuma tecnologia adicionada ainda</p>
                        <button
                          onClick={addSkill}
                          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#FF6B35] rounded-lg"
                        >
                          Adicionar primeira tecnologia
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="col-span-5">
              <div className="sticky top-28">
                <div ref={resumePreviewRef} className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
                  {/* Preview Header */}
                  <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">{resume.personal.fullName || 'Seu Nome Aqui'}</h1>
                    <div className="flex justify-center items-center gap-4 mt-2 text-sm text-gray-600">
                      <span>{resume.personal.email || 'seu@email.com'}</span>
                      {resume.personal.phone && <span>•</span>}
                      <span>{resume.personal.phone}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {resume.personal.city && resume.personal.state ? `${resume.personal.city}, ${resume.personal.state}` : 'Sua Cidade, Estado'}
                    </div>
                    <div className="flex justify-center gap-4 mt-3">
                      {resume.personal.linkedin && <a href={resume.personal.linkedin} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">LinkedIn</a>}
                      {resume.personal.github && <a href={resume.personal.github} target="_blank" rel="noreferrer" className="text-gray-800 hover:underline">GitHub</a>}
                      {resume.personal.portfolio && <a href={resume.personal.portfolio} target="_blank" rel="noreferrer" className="text-purple-600 hover:underline">Portfólio</a>}
                    </div>
                  </div>

                  {/* Preview Summary */}
                  {resume.summary && (
                    <div className="mb-6">
                      <h2 className="text-xl font-bold border-b-2 border-[#FF6B35] pb-1 mb-2">Resumo Profissional</h2>
                      <p className="text-gray-700 text-sm">{resume.summary}</p>
                    </div>
                  )}

                  {/* Preview Experience */}
                  {resume.experiences.length > 0 && (
                    <div className="mb-6">
                      <h2 className="text-xl font-bold border-b-2 border-[#FF6B35] pb-1 mb-2">Experiência Profissional</h2>
                      {resume.experiences.map(exp => (
                        <div key={exp.id} className="mb-4">
                          <h3 className="text-lg font-bold">{exp.title || 'Cargo'}</h3>
                          <p className="font-semibold text-gray-700">{exp.company || 'Empresa'}</p>
                          <p className="text-xs text-gray-500">{exp.startDate} - {exp.current ? 'Atual' : exp.endDate}</p>
                          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{exp.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Preview Skills */}
                  {resume.skills.length > 0 && (
                    <div className="mb-6">
                      <h2 className="text-xl font-bold border-b-2 border-[#FF6B35] pb-1 mb-2">Tecnologias</h2>
                      <div className="flex flex-wrap gap-2">
                        {resume.skills.map(skill => (
                          <span key={skill.id} className="bg-gray-200 text-gray-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
                            {skill.name} - {skill.level}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

