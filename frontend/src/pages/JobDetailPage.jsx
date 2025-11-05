import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { MapPin, Building2, Clock, DollarSign, Users, Briefcase, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'
import { jobAPI, applicationAPI } from '@/services/api'

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
                  <div className="flex items-center gap-6 text-muted-foreground mb-4 flex-wrap">
                    <span className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      {job.company_name || 'Empresa Confidencial'}
                    </span>
                    {job.location && (
                      <span className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        {job.location}
                      </span>
                    )}
                    {job.modality && (
                      <span className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        {job.modality}
                      </span>
                    )}
                    {job.level && (
                      <span className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5" />
                        {job.level}
                      </span>
                    )}
                  </div>
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
              {job.description && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Descrição da Vaga</h3>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {job.description}
                  </p>
                </div>
              )}

              {job.requirements && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Requisitos</h3>
                  <div className="text-muted-foreground whitespace-pre-line">
                    {job.requirements}
                  </div>
                </div>
              )}

              {job.benefits && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Benefícios</h3>
                  <div className="text-muted-foreground whitespace-pre-line">
                    {job.benefits}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-6 border-t flex-wrap gap-4">
                {job.salary && (
                  <div>
                    <div className="text-sm text-muted-foreground">Faixa Salarial</div>
                    <div className="text-2xl font-bold text-primary">{job.salary}</div>
                  </div>
                )}
                {job.contract_type && (
                  <div>
                    <div className="text-sm text-muted-foreground">Tipo de Contratação</div>
                    <div className="text-lg font-semibold">{job.contract_type}</div>
                  </div>
                )}
                {job.applications_count !== undefined && (
                  <div>
                    <div className="text-sm text-muted-foreground">Candidatos</div>
                    <div className="text-lg font-semibold flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {job.applications_count}
                    </div>
                  </div>
                )}
                {job.created_at && (
                  <div>
                    <div className="text-sm text-muted-foreground">Publicada em</div>
                    <div className="text-lg font-semibold flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      {new Date(job.created_at).toLocaleDateString('pt-BR')}
                    </div>
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

