import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Phone, MapPin, Briefcase, GraduationCap, Code, Award, Globe, Linkedin, Github, FileText, Edit, Save, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || '';

export default function CandidateProfilePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    title: '',
    summary: '',
    linkedin: '',
    github: '',
    portfolio: '',
    salary_expectation: '',
    experiences: [],
    education: [],
    skills: [],
    certifications: [],
    languages: []
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        navigate('/profissional/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/candidates/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile({
          name: data.name || data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          city: data.city || '',
          state: data.state || '',
          title: data.title || data.current_title || '',
          summary: data.summary || data.professional_summary || '',
          linkedin: data.linkedin || data.linkedin_url || '',
          github: data.github || data.github_url || '',
          portfolio: data.portfolio || data.portfolio_url || '',
          salary_expectation: data.salary_expectation || '',
          experiences: data.experiences || [],
          education: data.education || [],
          skills: data.skills || [],
          certifications: data.certifications || [],
          languages: data.languages || []
        });
      } else {
        // Usar dados do contexto de autenticação
        setProfile(prev => ({
          ...prev,
          name: user?.name || user?.full_name || '',
          email: user?.email || ''
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      setError('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_URL}/api/candidates/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      });
      
      if (response.ok) {
        setEditing(false);
        setError(null);
      } else {
        setError('Erro ao salvar perfil');
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      setError('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const addSkill = () => {
    const skill = prompt('Digite a tecnologia/habilidade:');
    if (skill) {
      setProfile(prev => ({
        ...prev,
        skills: [...prev.skills, { name: skill, level: 'intermediário' }]
      }));
    }
  };

  const removeSkill = (index) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Carregando perfil...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1F3B47] mb-2">Meu Currículo</h1>
            <p className="text-gray-600">Mantenha seu perfil atualizado para atrair mais recrutadores</p>
          </div>
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/profissional/dashboard')}
              className="border-[#1F3B47] text-[#1F3B47]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            {editing ? (
              <Button 
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            ) : (
              <Button 
                onClick={() => setEditing(true)}
                className="bg-[#F7941D] hover:bg-[#e8850d] text-white"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar Perfil
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar - Info Básica */}
          <div className="lg:col-span-1 space-y-6">
            {/* Card Principal */}
            <Card className="border-2">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 bg-[#F7941D] rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4">
                    {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  {editing ? (
                    <Input 
                      value={profile.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="text-center font-semibold mb-2"
                      placeholder="Seu nome"
                    />
                  ) : (
                    <h2 className="text-xl font-semibold text-[#1F3B47] mb-1">{profile.name || 'Nome não informado'}</h2>
                  )}
                  {editing ? (
                    <Input 
                      value={profile.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      className="text-center text-sm mb-4"
                      placeholder="Cargo atual"
                    />
                  ) : (
                    <p className="text-gray-600 mb-4">{profile.title || 'Cargo não informado'}</p>
                  )}
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 text-gray-600">
                    <Mail className="w-4 h-4 text-[#F7941D]" />
                    {editing ? (
                      <Input 
                        value={profile.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className="flex-1"
                        placeholder="Email"
                      />
                    ) : (
                      <span>{profile.email || 'Email não informado'}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Phone className="w-4 h-4 text-[#F7941D]" />
                    {editing ? (
                      <Input 
                        value={profile.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className="flex-1"
                        placeholder="Telefone"
                      />
                    ) : (
                      <span>{profile.phone || 'Telefone não informado'}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <MapPin className="w-4 h-4 text-[#F7941D]" />
                    {editing ? (
                      <div className="flex-1 flex gap-2">
                        <Input 
                          value={profile.city}
                          onChange={(e) => handleChange('city', e.target.value)}
                          className="flex-1"
                          placeholder="Cidade"
                        />
                        <Input 
                          value={profile.state}
                          onChange={(e) => handleChange('state', e.target.value)}
                          className="w-20"
                          placeholder="UF"
                        />
                      </div>
                    ) : (
                      <span>{profile.city && profile.state ? `${profile.city}, ${profile.state}` : 'Localização não informada'}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Links */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#F7941D]" />
                  Links Profissionais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Linkedin className="w-5 h-5 text-blue-600" />
                  {editing ? (
                    <Input 
                      value={profile.linkedin}
                      onChange={(e) => handleChange('linkedin', e.target.value)}
                      className="flex-1"
                      placeholder="URL do LinkedIn"
                    />
                  ) : profile.linkedin ? (
                    <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                      {profile.linkedin}
                    </a>
                  ) : (
                    <span className="text-gray-400">Não informado</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Github className="w-5 h-5 text-gray-800" />
                  {editing ? (
                    <Input 
                      value={profile.github}
                      onChange={(e) => handleChange('github', e.target.value)}
                      className="flex-1"
                      placeholder="URL do GitHub"
                    />
                  ) : profile.github ? (
                    <a href={profile.github} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:underline truncate">
                      {profile.github}
                    </a>
                  ) : (
                    <span className="text-gray-400">Não informado</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-[#F7941D]" />
                  {editing ? (
                    <Input 
                      value={profile.portfolio}
                      onChange={(e) => handleChange('portfolio', e.target.value)}
                      className="flex-1"
                      placeholder="URL do Portfólio"
                    />
                  ) : profile.portfolio ? (
                    <a href={profile.portfolio} target="_blank" rel="noopener noreferrer" className="text-[#F7941D] hover:underline truncate">
                      {profile.portfolio}
                    </a>
                  ) : (
                    <span className="text-gray-400">Não informado</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tecnologias */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Code className="w-5 h-5 text-[#F7941D]" />
                    Tecnologias
                  </span>
                  {editing && (
                    <Button size="sm" variant="ghost" onClick={addSkill}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.skills && profile.skills.length > 0 ? (
                    profile.skills.map((skill, index) => (
                      <Badge 
                        key={index} 
                        className="bg-[#F7941D]/10 text-[#F7941D] hover:bg-[#F7941D]/20 flex items-center gap-1"
                      >
                        {typeof skill === 'string' ? skill : skill.name}
                        {editing && (
                          <button onClick={() => removeSkill(index)} className="ml-1 hover:text-red-500">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-gray-400 text-sm">Nenhuma tecnologia informada</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Resumo */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-[#F7941D]" />
                  Resumo Profissional
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <Textarea 
                    value={profile.summary}
                    onChange={(e) => handleChange('summary', e.target.value)}
                    className="min-h-[150px]"
                    placeholder="Descreva sua experiência, habilidades e objetivos profissionais..."
                  />
                ) : (
                  <p className="text-gray-700 whitespace-pre-line">
                    {profile.summary || 'Nenhum resumo informado. Adicione um resumo para destacar suas principais qualificações.'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Experiência */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-[#F7941D]" />
                  Experiência Profissional
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.experiences && profile.experiences.length > 0 ? (
                  <div className="space-y-6">
                    {profile.experiences.map((exp, index) => (
                      <div key={index} className="border-l-2 border-[#F7941D] pl-4">
                        <h4 className="font-semibold text-[#1F3B47]">{exp.title || exp.position}</h4>
                        <p className="text-gray-600">{exp.company}</p>
                        <p className="text-sm text-gray-500">{exp.period || `${exp.start_date} - ${exp.end_date || 'Atual'}`}</p>
                        {exp.description && <p className="mt-2 text-gray-700">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">Nenhuma experiência informada</p>
                )}
              </CardContent>
            </Card>

            {/* Formação */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-[#F7941D]" />
                  Formação Acadêmica
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.education && profile.education.length > 0 ? (
                  <div className="space-y-4">
                    {profile.education.map((edu, index) => (
                      <div key={index} className="border-l-2 border-[#F7941D] pl-4">
                        <h4 className="font-semibold text-[#1F3B47]">{edu.degree || edu.course}</h4>
                        <p className="text-gray-600">{edu.institution}</p>
                        <p className="text-sm text-gray-500">{edu.year || `${edu.start_year} - ${edu.end_year || 'Em andamento'}`}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">Nenhuma formação informada</p>
                )}
              </CardContent>
            </Card>

            {/* Certificações */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#F7941D]" />
                  Certificações
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.certifications && profile.certifications.length > 0 ? (
                  <div className="space-y-3">
                    {profile.certifications.map((cert, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Award className="w-5 h-5 text-[#F7941D]" />
                        <div>
                          <p className="font-medium text-[#1F3B47]">{cert.name || cert.title}</p>
                          <p className="text-sm text-gray-500">{cert.issuer} • {cert.year || cert.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">Nenhuma certificação informada</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
