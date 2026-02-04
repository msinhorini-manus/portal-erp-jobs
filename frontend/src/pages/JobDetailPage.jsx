import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { 
  MapPin, Building2, Clock, DollarSign, Users, Briefcase, Calendar,
  Globe, FileText, CheckCircle, Gift, Laptop, GraduationCap, Tag,
  Home, Building, Wifi
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'
import { jobAPI, applicationAPI } from '@/services/api'

// Mapeamento de modalidades de trabalho
const modalityLabels = {
  'presencial': 'Presencial',
  'remoto': 'Remoto',
  'híbrido': 'Híbrido',
  'hibrido': 'Híbrido'
}

// Mapeamento de níveis de senioridade
const seniorityLabels = {
  'estagio': 'Estágio',
  'junior': 'Júnior',
  'pleno': 'Pleno',
  'senior': 'Sênior',
  'especialista': 'Especialista',
  'gerente': 'Gerente',
  'diretor': 'Diretor'
}

// Mapeamento de tipos de contrato
const contractLabels = {
  'clt': 'CLT',
  'pj': 'PJ',
  'estagio': 'Estágio',
  'freelancer': 'Freelancer',
  'temporario': 'Temporário'
}

// Ícone para modalidade de trabalho
const getModalityIcon = (modality) => {
  switch (modality?.toLowerCase()) {
    case 'remoto':
      return <Wifi className="w-4 h-4" />
    case 'presencial':
      return <Building className="w-4 h-4" />
    case 'híbrido':
    case 'hibrido':
      return <Home className="w-4 h-4" />
    default:
      return <Laptop className="w-4 h-4" />
  }
}

export default function JobDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [applying, setApplying] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)
  const [applicationSuccess, setApplicationSuccess] = useState(false)

  useEffect(() => {
    loadJobDetails()
    if (isAuthenticated && user?.user_type === 'candidate') {
      checkIfApplied()
    }
  }, [id, isAuthenticated])

  const loadJobDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await jobAPI.getById(id)
      setJob(data)
    } catch (err) {
      console.error('Erro ao carregar vaga:', err)
      setError(err.message || 'Erro ao carregar detalhes da vaga')
    } finally {
      setLoading(false)
    }
  }

  const checkIfApplied = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch(`${API_URL}/api/applications/my-applications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const applied = data.applications?.some(app => app.job_id === parseInt(id))
        setHasApplied(applied)
      }
    } catch (err) {
      console.error('Erro ao verificar candidatura:', err)
    }
  }

  const handleApply = async () => {
    // Verificar se está logado
    if (!isAuthenticated) {
      alert('Você precisa estar logado para se candidatar. Redirecionando para login...')
      navigate('/candidato/login')
      return
    }

    // Verificar se é candidato
    if (user?.user_type !== 'candidate') {
      alert('Apenas candidatos podem se candidatar a vagas.')
      return
    }

    // Verificar se já se candidatou
    if (hasApplied) {
      alert('Você já se candidatou a esta vaga.')
      return
    }

    try {
      setApplying(true)
      setError(null)

      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/applications/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          job_id: parseInt(id)
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar candidatura')
      }

      // Sucesso!
      setHasApplied(true)
      setApplicationSuccess(true)
      
      // Esconder mensagem de sucesso após 5 segundos
      setTimeout(() => {
        setApplicationSuccess(false)
      }, 5000)

    } catch (err) {
      console.error('Erro ao candidatar-se:', err)
      setError(err.message || 'Erro ao enviar candidatura. Tente novamente.')
    } finally {
      setApplying(false)
    }
  }

  // Formatar o label de modalidade
  const formatModality = (modality) => {
    if (!modality) return null
    return modalityLabels[modality.toLowerCase()] || modality
  }

  // Formatar o label de senioridade
  const formatSeniority = (level) => {
    if (!level) return null
    return seniorityLabels[level.toLowerCase()] || level
  }

  // Formatar o label de contrato
  const formatContract = (type) => {
    if (!type) return null
    return contractLabels[type.toLowerCase()] || type.toUpperCase()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 py-4">
            <Link to="/" className="text-2xl font-bold">
              P<span className="text-secondary">PORTAL ERP</span> JOBS
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-lg text-muted-foreground">Carregando detalhes da vaga...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !job) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 py-4">
            <Link to="/" className="text-2xl font-bold">
              P<span className="text-secondary">PORTAL ERP</span> JOBS
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button onClick={() => navigate('/vagas')}>Voltar para vagas</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!job) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="text-2xl font-bold">
            P<span className="text-secondary">PORTAL ERP</span> JOBS
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Mensagem de sucesso */}
          {applicationSuccess && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                ✅ Candidatura enviada com sucesso! Você pode acompanhar o status no seu dashboard.
              </AlertDescription>
            </Alert>
          )}

          {/* Mensagem de erro */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-4">{job.title}</CardTitle>
                  
                  {/* Informações principais */}
                  <div className="flex items-center gap-6 text-muted-foreground mb-4 flex-wrap">
                    <span className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      {job.is_company_hidden ? 'Empresa Confidencial' : (job.company_name || 'Empresa Confidencial')}
                    </span>
                    {job.location && (
                      <span className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        {job.location}
                      </span>
                    )}
                  </div>

                  {/* Badges de informações rápidas */}
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {/* Área de Atuação */}
                    {(job.area_info || job.area) && (
                      <Badge 
                        variant="outline" 
                        className="flex items-center gap-1"
                        style={{ 
                          borderColor: job.area_info?.color || 'gray',
                          color: job.area_info?.color || 'gray'
                        }}
                      >
                        <Tag className="w-3 h-3" />
                        {job.area_info?.name || job.area}
                      </Badge>
                    )}
                    
                    {/* Nível de Experiência */}
                    {job.seniority_level && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" />
                        {formatSeniority(job.seniority_level)}
                      </Badge>
                    )}
                    
                    {/* Modalidade de Trabalho */}
                    {job.work_modality && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        {getModalityIcon(job.work_modality)}
                        {formatModality(job.work_modality)}
                      </Badge>
                    )}
                    
                    {/* Tipo de Contrato */}
                    {job.contract_type && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {formatContract(job.contract_type)}
                      </Badge>
                    )}
                  </div>

                  {/* Skills/Tecnologias */}
                  {job.skills && job.skills.length > 0 && (
                    <div className="flex gap-2 mb-4 flex-wrap">
                      {job.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                {job.match_percentage && (
                  <div className="text-center ml-4">
                    <div className="text-4xl font-bold text-secondary mb-1">
                      {job.match_percentage}%
                    </div>
                    <div className="text-sm text-muted-foreground">Match</div>
                  </div>
                )}
              </div>
              
              {/* Botão de Candidatura */}
              <div className="flex items-center gap-4 pt-4 border-t">
                <Button 
                  size="lg" 
                  variant="secondary" 
                  className="flex-1"
                  onClick={handleApply}
                  disabled={applying || hasApplied || !job.is_active}
                >
                  {applying ? 'Enviando...' : hasApplied ? 'Já Candidatado' : 'Candidatar-se'}
                </Button>
                {!isAuthenticated && (
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => navigate('/candidato/login')}
                  >
                    Fazer Login
                  </Button>
                )}
              </div>

              {hasApplied && (
                <div className="mt-2 text-sm text-green-600 text-center">
                  ✓ Você já se candidatou a esta vaga
                </div>
              )}

              {!job.is_active && (
                <div className="mt-2 text-sm text-red-600 text-center">
                  ⚠ Esta vaga não está mais ativa
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Descrição da Vaga */}
              {job.description && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Descrição da Vaga
                  </h3>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {job.description}
                  </p>
                </div>
              )}

              {/* Responsabilidades */}
              {job.responsibilities && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    Responsabilidades
                  </h3>
                  <div className="text-muted-foreground whitespace-pre-line">
                    {job.responsibilities}
                  </div>
                </div>
              )}

              {/* Requisitos */}
              {job.requirements && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    Requisitos
                  </h3>
                  <div className="text-muted-foreground whitespace-pre-line">
                    {job.requirements}
                  </div>
                </div>
              )}

              {/* Benefícios */}
              {job.benefits && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-primary" />
                    Benefícios
                  </h3>
                  <div className="text-muted-foreground whitespace-pre-line">
                    {job.benefits}
                  </div>
                </div>
              )}

              {/* Informações da Empresa (se não for confidencial) */}
              {!job.is_company_hidden && job.company && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Sobre a Empresa
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Nome:</span>
                      <p className="font-medium">{job.company.company_name}</p>
                    </div>
                    {job.company.sector && (
                      <div>
                        <span className="text-sm text-muted-foreground">Setor:</span>
                        <p className="font-medium capitalize">{job.company.sector}</p>
                      </div>
                    )}
                    {job.company.company_size && (
                      <div>
                        <span className="text-sm text-muted-foreground">Porte:</span>
                        <p className="font-medium capitalize">
                          {job.company.company_size === 'small' ? 'Pequena' :
                           job.company.company_size === 'medium' ? 'Média' :
                           job.company.company_size === 'large' ? 'Grande' : job.company.company_size}
                        </p>
                      </div>
                    )}
                    {(job.company.city || job.company.state) && (
                      <div>
                        <span className="text-sm text-muted-foreground">Localização:</span>
                        <p className="font-medium">
                          {[job.company.city, job.company.state].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}
                    {job.company.website && (
                      <div className="md:col-span-2">
                        <span className="text-sm text-muted-foreground">Website:</span>
                        <p>
                          <a 
                            href={job.company.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <Globe className="w-4 h-4" />
                            {job.company.website}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Resumo de informações */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t">
                {/* Faixa Salarial */}
                {job.salary && (
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-600" />
                    <div className="text-sm text-muted-foreground">Faixa Salarial</div>
                    <div className="text-lg font-bold text-green-600">{job.salary}</div>
                  </div>
                )}
                
                {/* Tipo de Contratação */}
                {job.contract_type && (
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <FileText className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-sm text-muted-foreground">Contratação</div>
                    <div className="text-lg font-bold">{formatContract(job.contract_type)}</div>
                  </div>
                )}
                
                {/* Candidatos */}
                {job.applications_count !== undefined && (
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <Users className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                    <div className="text-sm text-muted-foreground">Candidatos</div>
                    <div className="text-lg font-bold">{job.applications_count}</div>
                  </div>
                )}
                
                {/* Data de Publicação */}
                {job.created_at && (
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <Calendar className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                    <div className="text-sm text-muted-foreground">Publicada em</div>
                    <div className="text-lg font-bold">
                      {new Date(job.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                )}
              </div>

              {/* Informações adicionais em linha */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-4 border-t">
                {job.work_modality && (
                  <div className="flex items-center gap-1">
                    {getModalityIcon(job.work_modality)}
                    <span>Modalidade: <strong>{formatModality(job.work_modality)}</strong></span>
                  </div>
                )}
                {job.seniority_level && (
                  <div className="flex items-center gap-1">
                    <GraduationCap className="w-4 h-4" />
                    <span>Nível: <strong>{formatSeniority(job.seniority_level)}</strong></span>
                  </div>
                )}
                {(job.area_info || job.area) && (
                  <div className="flex items-center gap-1">
                    <Tag className="w-4 h-4" />
                    <span>Área: <strong>{job.area_info?.name || job.area}</strong></span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="mt-6">
            <Button variant="outline" onClick={() => navigate('/vagas')}>
              ← Voltar para vagas
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
