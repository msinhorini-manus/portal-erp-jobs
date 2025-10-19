import { Link } from 'react-router-dom'
import { MapPin, Building2, Clock, DollarSign, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function JobDetailPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="text-2xl font-bold">
            PORTAL <span className="text-secondary">ERP</span> JOBS
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-4">Desenvolvedor Full Stack Sênior</CardTitle>
                  <div className="flex items-center gap-6 text-muted-foreground mb-4">
                    <span className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Tech Solutions Ltda
                    </span>
                    <span className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      São Paulo, SP
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Híbrido
                    </span>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <Badge variant="secondary">React</Badge>
                    <Badge variant="secondary">Node.js</Badge>
                    <Badge variant="secondary">PostgreSQL</Badge>
                    <Badge variant="secondary">AWS</Badge>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-secondary mb-1">85%</div>
                  <div className="text-sm text-muted-foreground">Match</div>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-4 border-t">
                <Button size="lg" variant="secondary" className="flex-1">
                  Candidatar-se
                </Button>
                <Button size="lg" variant="outline">
                  Salvar vaga
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-3">Descrição da Vaga</h3>
                <p className="text-muted-foreground">
                  Buscamos um Desenvolvedor Full Stack Sênior para integrar nosso time de tecnologia. 
                  O profissional será responsável pelo desenvolvimento de aplicações web escaláveis, 
                  trabalhando com tecnologias modernas e metodologias ágeis.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Requisitos</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• 5+ anos de experiência com desenvolvimento web</li>
                  <li>• Domínio de React e Node.js</li>
                  <li>• Experiência com bancos de dados relacionais (PostgreSQL)</li>
                  <li>• Conhecimento em AWS e arquitetura de microsserviços</li>
                  <li>• Inglês intermediário/avançado</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Benefícios</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Vale alimentação</li>
                  <li>• Plano de saúde e odontológico</li>
                  <li>• Vale transporte</li>
                  <li>• Auxílio home office</li>
                  <li>• Horário flexível</li>
                  <li>• Programa de treinamentos</li>
                </ul>
              </div>

              <div className="flex items-center justify-between pt-6 border-t">
                <div>
                  <div className="text-sm text-muted-foreground">Faixa Salarial</div>
                  <div className="text-2xl font-bold text-primary">R$ 8.000 - R$ 12.000</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Tipo de Contratação</div>
                  <div className="text-lg font-semibold">CLT</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Candidatos</div>
                  <div className="text-lg font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    45
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

