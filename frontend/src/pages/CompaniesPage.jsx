import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, MapPin, Users, Briefcase, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

// Dados de exemplo de empresas
const companies = [
  {
    id: 1,
    name: 'TechSolutions Brasil',
    logo: 'https://via.placeholder.com/80',
    sector: 'Tecnologia',
    size: '51-200',
    location: 'São Paulo, SP',
    description: 'Empresa de desenvolvimento de software especializada em soluções empresariais',
    openJobs: 12,
    technologies: ['React', 'Node.js', 'Python', 'AWS']
  },
  {
    id: 2,
    name: 'DataCorp Analytics',
    logo: 'https://via.placeholder.com/80',
    sector: 'Dados & Analytics',
    size: '201-500',
    location: 'Rio de Janeiro, RJ',
    description: 'Especialistas em Big Data e Business Intelligence',
    openJobs: 8,
    technologies: ['Python', 'SQL', 'Tableau', 'Power BI']
  },
  {
    id: 3,
    name: 'CloudFirst Consulting',
    logo: 'https://via.placeholder.com/80',
    sector: 'Consultoria',
    size: '501-1000',
    location: 'Belo Horizonte, MG',
    description: 'Consultoria em transformação digital e cloud computing',
    openJobs: 15,
    technologies: ['AWS', 'Azure', 'Kubernetes', 'Docker']
  },
  {
    id: 4,
    name: 'SAP Brasil Ltda',
    logo: 'https://via.placeholder.com/80',
    sector: 'ERP',
    size: '1000+',
    location: 'São Paulo, SP',
    description: 'Líder mundial em software empresarial',
    openJobs: 25,
    technologies: ['SAP', 'ABAP', 'Fiori', 'HANA']
  },
  {
    id: 5,
    name: 'DevOps Masters',
    logo: 'https://via.placeholder.com/80',
    sector: 'DevOps',
    size: '11-50',
    location: 'Florianópolis, SC',
    description: 'Especialistas em automação e infraestrutura como código',
    openJobs: 6,
    technologies: ['Jenkins', 'Terraform', 'Ansible', 'GitLab']
  },
  {
    id: 6,
    name: 'Security First',
    logo: 'https://via.placeholder.com/80',
    sector: 'Segurança',
    size: '51-200',
    location: 'Brasília, DF',
    description: 'Cybersecurity e proteção de dados',
    openJobs: 4,
    technologies: ['Firewall', 'SIEM', 'Penetration Testing', 'ISO 27001']
  }
]

const sectors = ['Todos', 'Tecnologia', 'Consultoria', 'ERP', 'DevOps', 'Segurança', 'Dados & Analytics']
const sizes = ['Todos', '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']

export default function CompaniesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSector, setSelectedSector] = useState('Todos')
  const [selectedSize, setSelectedSize] = useState('Todos')

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSector = selectedSector === 'Todos' || company.sector === selectedSector
    const matchesSize = selectedSize === 'Todos' || company.size === selectedSize
    
    return matchesSearch && matchesSector && matchesSize
  })

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
              <Link to="/areas" className="hover:text-[#F7941D] transition-colors font-medium">Áreas</Link>
              <Link to="/tecnologias" className="hover:text-[#F7941D] transition-colors font-medium">Tecnologias</Link>
              <Link to="/salarios" className="hover:text-[#F7941D] transition-colors font-medium">Salários</Link>
            </nav>
            <div className="flex items-center gap-4">
              <Link to="/candidato/login">
                <Button variant="ghost" className="text-white hover:text-[#F7941D]">Login</Button>
              </Link>
              <Link to="/candidato/cadastro">
                <Button className="bg-[#F7941D] hover:bg-[#E67E22] text-white">Cadastrar CV</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#1F3B47] to-[#2C5F7C] text-white py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Empresas <span className="text-[#F7941D]">Parceiras</span>
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Conheça as empresas que estão contratando profissionais de tecnologia
            </p>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#F7941D]" />
                <span>{companies.length} empresas cadastradas</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#F7941D]" />
                <span>{companies.reduce((sum, c) => sum + c.openJobs, 0)} vagas abertas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Buscar empresas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </div>
            <div>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="w-full h-12 px-4 border rounded-md focus:border-[#F7941D] focus:outline-none"
              >
                {sectors.map(sector => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="w-full h-12 px-4 border rounded-md focus:border-[#F7941D] focus:outline-none"
              >
                {sizes.map(size => (
                  <option key={size} value={size}>{size === 'Todos' ? 'Todos os tamanhos' : `${size} funcionários`}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Companies List */}
      <div className="container mx-auto px-6 py-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#1F3B47]">
            {filteredCompanies.length} {filteredCompanies.length === 1 ? 'empresa encontrada' : 'empresas encontradas'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map(company => (
            <Card key={company.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-[#1F3B47] mb-1">{company.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{company.location}</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{company.description}</p>

                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{company.size}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#F7941D] font-semibold">
                    <Briefcase className="w-4 h-4" />
                    <span>{company.openJobs} vagas</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {company.technologies.slice(0, 3).map((tech, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                      {tech}
                    </span>
                  ))}
                  {company.technologies.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      +{company.technologies.length - 3}
                    </span>
                  )}
                </div>

                <Link to={`/empresas/${company.id}`}>
                  <Button className="w-full bg-[#F7941D] hover:bg-[#E67E22] text-white">
                    Ver Perfil e Vagas
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCompanies.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Nenhuma empresa encontrada</h3>
            <p className="text-gray-500">Tente ajustar os filtros de busca</p>
          </div>
        )}
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

