import { Link } from 'react-router-dom'
import { MapPin, Mail, Phone, Linkedin, Github, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function CandidateProfilePage() {
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
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-3xl font-bold">
                  CS
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">CARLOS OLIVEIRA</CardTitle>
                  <p className="text-lg text-muted-foreground mb-4">Senior Full Stack Developer</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      São Paulo, SP
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      cartes.oliveira@email.com
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      +58 11 98765-4321
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="secondary">ENTRAR EM CONTATO</Button>
                    <Button variant="outline">SALVAR</Button>
                    <Button variant="outline">CURRÍCULO</Button>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-secondary mb-1">92%</div>
                  <div className="text-sm text-muted-foreground">Match</div>
                  <div className="mt-4 space-y-2">
                    <div className="text-sm">
                      <div className="font-semibold">Rarável</div>
                      <div className="text-muted-foreground">Disponível</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-semibold">Disponível</div>
                      <div className="text-muted-foreground">R$ 12.000</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">RESUMO PROFISSIONAL</h3>
                <p className="text-muted-foreground">
                  Com de 9 anos de experiência em nível desacolvldar m. Sempre proficiente em 
                  exemplos tectinológicas, de te tologias com Compacti ado com React, Node.js, 
                  implementação de problemas-de tempo e teamwork em áreas agilêis.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3">TECNOLOGIAS</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="w-20 text-sm">React</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{width: '90%'}}></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-20 text-sm">Node.js</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{width: '85%'}}></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-20 text-sm">Python</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{width: '80%'}}></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-20 text-sm">AWS</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{width: '75%'}}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">EXPERIÊNCIA PROFISSIONAL</h3>
                <div className="space-y-4">
                  <div>
                    <div className="font-semibold">Senior Full Stack Empregavel</div>
                    <div className="text-sm text-muted-foreground">Empresa A, Senior • Ago 2020 - jul./20</div>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <li>• Desenvolvimento e manteromentor don web escaláveis ns aplicações,</li>
                      <li>• Colaborar com tronteohó e alilietros nas soluções de eticlo. REST-APIs e microservices arquitetoniça.</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold">Full Stack Devogavel</div>
                    <div className="text-sm text-muted-foreground">Empresa D, Senior • Jun./es 20205 - jul.2020</div>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <li>• Desenvolvilm-acnto de applicativos e tomar scirits atuaras de Empresa</li>
                      <li>• Otimizou ó performance de aplicações existentes. ichnmg7rando</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">EDUCAÇÃO</h3>
                <div>
                  <div className="font-semibold">Baceluurs em em ca Computados</div>
                  <div className="text-sm text-muted-foreground">Universidade C</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">CERTIFICACOES</h3>
                <div className="text-sm">Certificação em Desenvolvimento Web</div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">PROJETOS</h3>
                <div className="text-sm">Sistema de yerenciamento de tarefas</div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">IDIOMAS</h3>
                <div className="text-sm">Inglês (avançado)</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

