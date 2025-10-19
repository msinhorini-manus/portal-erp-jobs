import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapPin, Users, Globe, Building, Briefcase, ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const companies = {
  '1': {
    id: 1,
    name: 'Tech Solutions Brasil',
    logo: 'https://ui-avatars.com/api/?name=Tech+Solutions&background=F7941D&color=fff&size=200',
    sector: 'Tecnologia',
    size: '51-200 funcionários',
    location: 'São Paulo, SP',
    website: 'www.techsolutions.com.br',
    description: 'Empresa líder em soluções de software empresarial, especializada em implementação de sistemas ERP e desenvolvimento de aplicações customizadas.',
    about: `A Tech Solutions Brasil é uma empresa de tecnologia com mais de 15 anos de experiência no mercado. Somos especializados em soluções SAP, desenvolvimento de software customizado e consultoria em transformação digital.

Nossa missão é ajudar empresas a alcançarem seus objetivos através da tecnologia, oferecendo soluções inovadoras e um time altamente qualificado.

Trabalhamos com clientes de diversos setores, incluindo varejo, manufatura, serviços financeiros e saúde.`,
    benefits: [
      'Vale refeição',
      'Vale transporte',
      'Plano de saúde',
      'Plano odontológico',
      'Gympass',
      'Day off de aniversário',
      'Home office flexível',
      'Auxílio educação'
    ],
    culture: [
      'Ambiente colaborativo',
      'Foco em inovação',
      'Desenvolvimento contínuo',
      'Work-life balance',
      'Diversidade e inclusão'
    ],
    openJobs: [
      {
        id: 1,
        title: 'Desenvolvedor Full Stack Sênior',
        location: 'São Paulo, SP',
        type: 'CLT',
        modality: 'Híbrido',
        salary: 'R$ 12.000 - R$ 18.000',
        level: 'Sênior',
        postedAt: '2025-01-10'
      },
      {
        id: 2,
        title: 'Consultor SAP FICO',
        location: 'São Paulo, SP',
        type: 'CLT',
        modality: 'Presencial',
        salary: 'R$ 15.000 - R$ 22.000',
        level: 'Pleno/Sênior',
        postedAt: '2025-01-08'
      },
      {
        id: 3,
        title: 'DevOps Engineer',
        location: 'Remoto',
        type: 'CLT',
        modality: 'Remoto',
        salary: 'R$ 10.000 - R$ 16.000',
        level: 'Pleno',
        postedAt: '2025-01-05'
      }
    ]
  }
}

export default function CompanyDetailPage() {
  const { id } = useParams()
  const company = companies[id] || companies['1']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1F3B47] text-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-10 h-10 bg-[#F7941D] rounded-full flex items-center justify-center font-bold text-white">
                  P
                </div>
                <div className="text-xl font-bold">
                  Portal <span className="text-[#F7941D]">ERP</span> Jobs
                </div>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/vagas" className="hover:text-[#F7941D] transition-colors font-medium">Vagas</Link>
              <Link to="/empresas" className="text-[#F7941D] font-medium">Empresas</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Back Button */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <Link to="/empresas" className="flex items-center gap-2 text-gray-600 hover:text-[#F7941D] transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Voltar para Empresas</span>
          </Link>
        </div>
      </div>

      {/* Company Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <img 
              src={company.logo} 
              alt={company.name}
              className="w-32 h-32 rounded-lg shadow-md"
            />
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-[#1F3B47] mb-4">{company.name}</h1>
              <div className="flex flex-wrap gap-4 text-gray-600 mb-6">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-[#F7941D]" />
                  <span>{company.sector}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#F7941D]" />
                  <span>{company.size}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#F7941D]" />
                  <span>{company.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#F7941D]" />
                  <a href={`https://${company.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#F7941D] transition-colors">
                    {company.website}
                  </a>
                </div>
              </div>
              <p className="text-lg text-gray-700">{company.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-[#1F3B47] mb-4">Sobre a Empresa</h2>
                <div className="prose max-w-none text-gray-700 whitespace-pre-line">
                  {company.about}
                </div>
              </CardContent>
            </Card>

            {/* Open Jobs */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[#1F3B47]">
                    Vagas Abertas ({company.openJobs.length})
                  </h2>
                </div>
                <div className="space-y-4">
                  {company.openJobs.map((job) => (
                    <Card key={job.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-xl text-[#1F3B47] mb-2">{job.title}</h3>
                            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>{job.location}</span>
                              </div>
                              <span>•</span>
                              <span>{job.modality}</span>
                              <span>•</span>
                              <span>{job.level}</span>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                            {job.type}
                          </span>
                        </div>
                        <div className="mb-4">
                          <div className="text-sm text-gray-600 mb-1">Faixa salarial:</div>
                          <div className="text-lg font-bold text-[#F7941D]">{job.salary}</div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t">
                          <span className="text-sm text-gray-500">
                            Publicada em {new Date(job.postedAt).toLocaleDateString('pt-BR')}
                          </span>
                          <Link to={`/vagas/${job.id}`}>
                            <Button className="bg-[#F7941D] hover:bg-[#E67E22] text-white">
                              Ver Detalhes
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Benefits */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-[#1F3B47] mb-4">Benefícios</h3>
                <ul className="space-y-2">
                  {company.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-2 text-gray-700">
                      <div className="w-2 h-2 bg-[#F7941D] rounded-full"></div>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Culture */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-[#1F3B47] mb-4">Cultura</h3>
                <ul className="space-y-2">
                  {company.culture.map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-gray-700">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-[#1F3B47] mb-4">Estatísticas</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Vagas abertas</div>
                    <div className="text-2xl font-bold text-[#F7941D]">{company.openJobs.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Setor</div>
                    <div className="text-lg font-semibold text-gray-700">{company.sector}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Tamanho</div>
                    <div className="text-lg font-semibold text-gray-700">{company.size}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#1F3B47] text-white py-8 mt-12">
        <div className="container mx-auto px-6 text-center">
          <p className="text-white/80">© 2025 Portal ERP Jobs. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}

