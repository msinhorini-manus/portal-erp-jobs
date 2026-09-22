import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { MapPin, Mail, Phone, Linkedin, Github, Globe, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_BASE = `${API_URL}/api`;

export default function CandidateProfilePage() {
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
      const response = await fetch(`${API_BASE}/candidates/${id}/profile`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar perfil');
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

  const getInitials = (firstName, lastName) => {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || 'U';
  };

  const getSkillLevel = (level) => {
    const levels = {
      'beginner': 25,
      'intermediate': 50,
      'advanced': 75,
      'expert': 100
    };
    return levels[level?.toLowerCase()] || 50;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive text-lg mb-4">{error}</p>
          <Button onClick={() => navigate('/buscar-candidatos')} variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Busca
          </Button>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-lg mb-4">Candidato não encontrado</p>
          <Button onClick={() => navigate('/buscar-candidatos')} variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Busca
          </Button>
        </div>
      </div>
    );
  }

  const fullName = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || 'Candidato';
  const initials = getInitials(candidate.first_name, candidate.last_name);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold">
            PORTAL <span className="text-secondary">ERP</span> JOBS
          </Link>
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-primary-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-3xl font-bold">
                  {initials}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">{fullName.toUpperCase()}</CardTitle>
                  <p className="text-lg text-muted-foreground mb-4">{candidate.current_title || 'Profissional'}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                    {(candidate.city || candidate.state) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {[candidate.city, candidate.state].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {candidate.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {candidate.email}
                      </span>
                    )}
                    {candidate.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {candidate.phone}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {candidate.linkedin_url && (
                      <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Linkedin className="w-4 h-4 mr-1" />
                          LinkedIn
                        </Button>
                      </a>
                    )}
                    {candidate.github_url && (
                      <a href={candidate.github_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Github className="w-4 h-4 mr-1" />
                          GitHub
                        </Button>
                      </a>
                    )}
                    {candidate.portfolio_url && (
                      <a href={candidate.portfolio_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Globe className="w-4 h-4 mr-1" />
                          Portfólio
                        </Button>
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="secondary">ENTRAR EM CONTATO</Button>
                    <Button variant="outline">SALVAR</Button>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-secondary mb-1">
                    {candidate.match_percentage || 85}%
                  </div>
                  <div className="text-sm text-muted-foreground">Match</div>
                  <div className="mt-4 space-y-2">
                    <div className="text-sm">
                      <div className="font-semibold">Status</div>
                      <div className="text-muted-foreground">
                        {candidate.is_actively_looking ? 'Buscando Emprego' : 'Não Disponível'}
                      </div>
                    </div>
                    {candidate.expected_salary && (
                      <div className="text-sm">
                        <div className="font-semibold">Pretensão</div>
                        <div className="text-muted-foreground">
                          R$ {candidate.expected_salary.toLocaleString('pt-BR')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Resumo Profissional */}
              {candidate.professional_summary && (
                <div>
                  <h3 className="font-semibold mb-3">RESUMO PROFISSIONAL</h3>
                  <p className="text-muted-foreground">{candidate.professional_summary}</p>
                </div>
              )}

              {/* Tecnologias */}
              {candidate.skills && candidate.skills.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">TECNOLOGIAS</h3>
                  <div className="space-y-2">
                    {candidate.skills.map((skill, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="w-28 text-sm truncate">{skill.skill_name || skill.name}</span>
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{width: `${getSkillLevel(skill.level)}%`}}
                          ></div>
                        </div>
                        <span className="text-xs text-muted-foreground w-20">
                          {skill.level || 'Intermediário'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Experiência Profissional */}
              {candidate.experiences && candidate.experiences.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">EXPERIÊNCIA PROFISSIONAL</h3>
                  <div className="space-y-4">
                    {candidate.experiences.map((exp, index) => (
                      <div key={index}>
                        <div className="font-semibold">{exp.title || exp.position}</div>
                        <div className="text-sm text-muted-foreground">
                          {exp.company} • {formatDate(exp.start_date)} - {exp.is_current ? 'Atual' : formatDate(exp.end_date)}
                        </div>
                        {exp.description && (
                          <p className="mt-2 text-sm text-muted-foreground">{exp.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Educação */}
              {candidate.educations && candidate.educations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">FORMAÇÃO ACADÊMICA</h3>
                  <div className="space-y-3">
                    {candidate.educations.map((edu, index) => (
                      <div key={index}>
                        <div className="font-semibold">{edu.degree} em {edu.field_of_study || edu.course}</div>
                        <div className="text-sm text-muted-foreground">
                          {edu.institution} • {formatDate(edu.start_date)} - {formatDate(edu.end_date)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certificações */}
              {candidate.certifications && candidate.certifications.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">CERTIFICAÇÕES</h3>
                  <div className="space-y-2">
                    {candidate.certifications.map((cert, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{cert.name}</span>
                        {cert.issuer && <span className="text-muted-foreground"> - {cert.issuer}</span>}
                        {cert.issue_date && <span className="text-muted-foreground"> ({formatDate(cert.issue_date)})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projetos */}
              {candidate.projects && candidate.projects.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">PROJETOS</h3>
                  <div className="space-y-3">
                    {candidate.projects.map((project, index) => (
                      <div key={index}>
                        <div className="font-semibold">{project.name || project.title}</div>
                        {project.description && (
                          <p className="text-sm text-muted-foreground">{project.description}</p>
                        )}
                        {project.technologies && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {project.technologies.split(',').map((tech, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{tech.trim()}</Badge>
                            ))}
                          </div>
                        )}
                        {project.url && (
                          <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                            Ver projeto
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Idiomas */}
              {candidate.languages && candidate.languages.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">IDIOMAS</h3>
                  <div className="flex flex-wrap gap-2">
                    {candidate.languages.map((lang, index) => (
                      <Badge key={index} variant="outline">
                        {lang.name || lang.language} ({lang.level || lang.proficiency})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
