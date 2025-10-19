import { Link } from 'react-router-dom'
import { MapPin, Building2, Clock, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

const mockJobs = [
  { id: 1, title: 'Desenvolvedor ABAP', company: 'Empresa A', location: 'São Paulo, SP', match: 82, level: 'Pleno', salary: 'R$ 8.000 - 10.000', tags: ['SAP', 'ABAP', 'Fiori'], type: 'Pleno' },
  { id: 2, title: 'Consultor Funcional SAP', company: 'Empresa B', location: 'São Paulo, SD', match: 84, level: 'Júnior', salary: 'R$ 5.000 - 7.000', tags: ['SAP', 'MM', 'SD'], type: 'Júnior' },
  { id: 3, title: 'Analista de Sistemas', company: 'Empresa C', location: 'Rio de Janeiro, RJ', match: 82, level: 'Presencial', salary: 'R$ 4.500 - 6.500', tags: ['ERP', 'SQL', 'Python'], type: 'Presencial' },
  { id: 4, title: 'Coordenador de Projetos', company: 'Empresa D', location: 'São Paulo, SP', match: 88, level: 'Sênior', salary: 'R$ 10.000 - 12.000', tags: ['SAP', 'ERP', 'PMO'], type: 'Sênior' },
]

export default function JobSearchPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1F3B47] text-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-10 h-10 bg-[#F7941D] rounded-full flex items-center justify-center font-bold text-white">
                  P
                </div>
                <div className="text-xl font-bold">
                  PORTAL <span className="text-[#F7941D]">ERP</span> JOBS
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <Button className="bg-[#F7941D] hover:bg-[#e8850d] text-white text-sm font-medium">
                Cadastrar CV grátis
              </Button>
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 text-sm font-medium">
                Entrar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="flex gap-8">
          <aside className="w-80 space-y-6">
            <Card className="border-2 shadow-lg">
              <div className="bg-[#1F3B47] text-white rounded-t-lg p-4">
                <h2 className="text-lg font-bold">Filtros Avançados</h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Palavras-chave</label>
                  <Input 
                    type="text" 
                    placeholder="Ex: SAP, Python" 
                    className="w-full border-2 focus:border-[#F7941D]"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Localização</label>
                  <Input 
                    type="text" 
                    placeholder="Cidade" 
                    className="w-full border-2 focus:border-[#F7941D]"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Área de Atuação</label>
                  <select className="w-full px-3 py-2 border-2 rounded-md focus:border-[#F7941D] focus:outline-none">
                    <option>Todas</option>
                    <option>Desenvolvimento</option>
                    <option>Consultoria</option>
                    <option>Suporte</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Nível de Experiência</label>
                  <select className="w-full px-3 py-2 border-2 rounded-md focus:border-[#F7941D] focus:outline-none">
                    <option>Todos</option>
                    <option>Júnior</option>
                    <option>Pleno</option>
                    <option>Sênior</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Modalidade de Trabalho</label>
                  <select className="w-full px-3 py-2 border-2 rounded-md focus:border-[#F7941D] focus:outline-none">
                    <option>Todas</option>
                    <option>Remoto</option>
                    <option>Híbrido</option>
                    <option>Presencial</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Faixa Salarial</label>
                  <select className="w-full px-3 py-2 border-2 rounded-md focus:border-[#F7941D] focus:outline-none">
                    <option>Todas</option>
                    <option>Até R$ 5.000</option>
                    <option>R$ 5.000 - R$ 8.000</option>
                    <option>R$ 8.000 - R$ 12.000</option>
                    <option>Acima de R$ 12.000</option>
                  </select>
                </div>
                <Button className="w-full bg-[#1F3B47] hover:bg-[#2a5261] text-white font-semibold h-11">
                  Candidatar-se
                </Button>
              </div>
            </Card>
          </aside>

          <main className="flex-1">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-[#1F3B47] mb-2">PESQUISA DE VAGAS</h1>
              <p className="text-gray-600">Encontradas <span className="font-bold text-[#F7941D]">4 vagas</span></p>
            </div>

            <div className="space-y-4">
              {mockJobs.map((job) => (
                <Link key={job.id} to={`/vagas/${job.id}`}>
                  <Card className="hover:shadow-2xl transition-all duration-300 border-2 hover:border-[#F7941D]/50 bg-gradient-to-r from-white to-gray-50">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-[#1F3B47] mb-3 hover:text-[#F7941D] transition-colors">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                            <span className="flex items-center gap-2 font-medium">
                              <Building2 className="w-4 h-4" />
                              {job.company}
                            </span>
                            <span className="flex items-center gap-2 font-medium">
                              <MapPin className="w-4 h-4" />
                              {job.location}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {job.tags.map((tag, idx) => (
                              <Badge 
                                key={idx} 
                                className="bg-[#F7941D] hover:bg-[#e8850d] text-white font-semibold px-3 py-1"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <span className="flex items-center gap-2 text-gray-700 font-medium">
                              <Clock className="w-4 h-4" />
                              {job.type}
                            </span>
                            <span className="flex items-center gap-2 text-gray-700 font-medium">
                              <DollarSign className="w-4 h-4" />
                              {job.salary}
                            </span>
                          </div>
                        </div>
                        <div className="text-center ml-6">
                          <div className="text-5xl font-bold text-[#F7941D] mb-1">
                            {job.match}%
                          </div>
                          <div className="text-sm text-gray-600 font-medium">Match</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

