import { Link } from 'react-router-dom'
import { MapPin, Linkedin, Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

const mockCandidates = [
  { id: 1, name: 'Maria Oliveira', title: 'Desenvolvedora Front-End', location: 'São Paulo', match: 82, tags: ['React', 'Node.js', 'C#'], salary: 'R$ 8.000' },
  { id: 2, name: 'João Souza', title: 'Analista de Sistemas', location: 'Rio de Janeiro', match: 75, tags: ['React', 'C#'], salary: 'R$ 8.000' },
  { id: 3, name: 'Ana Santos', title: 'Cientista de Dados', location: 'Belo Horizonte', match: 89, tags: ['Scientific', 'AI', 'Python'], salary: 'R$ 8.000' },
  { id: 4, name: 'Pedro Ribeiro', title: 'Engenheiro de Software', location: 'Curitiba', match: 78, tags: ['Java', 'SQL', '.NET'], salary: 'R$ 8.000' },
]

export default function CompanySearchPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1F3B47] text-white shadow-md">
        <div className="container mx-auto px-6 py-4">
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
                    placeholder="Ex: React, Python" 
                    className="w-full border-2 focus:border-[#F7941D]"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Localidade</label>
                  <Input 
                    type="text" 
                    placeholder="Cidade" 
                    className="w-full border-2 focus:border-[#F7941D]"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Área de Atuação</label>
                  <select className="w-full px-3 py-2 border-2 rounded-md focus:border-[#F7941D] focus:outline-none">
                    <option>Nível de Experiência</option>
                    <option>Júnior</option>
                    <option>Pleno</option>
                    <option>Sênior</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Modalidade de Trabalho</label>
                  <select className="w-full px-3 py-2 border-2 rounded-md focus:border-[#F7941D] focus:outline-none">
                    <option>Faixa Salarial</option>
                    <option>Até R$ 5.000</option>
                    <option>R$ 5.000 - R$ 8.000</option>
                    <option>R$ 8.000 - R$ 12.000</option>
                    <option>Acima de R$ 12.000</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Tecnologias</label>
                  <select className="w-full px-3 py-2 border-2 rounded-md focus:border-[#F7941D] focus:outline-none">
                    <option>Tecnologias</option>
                    <option>React</option>
                    <option>Python</option>
                    <option>Java</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">Disponibilidade</label>
                  <select className="w-full px-3 py-2 border-2 rounded-md focus:border-[#F7941D] focus:outline-none">
                    <option>Disponibilidade</option>
                    <option>Imediata</option>
                    <option>30 dias</option>
                    <option>60 dias</option>
                  </select>
                </div>
              </div>
            </Card>
          </aside>

          <main className="flex-1">
            <h1 className="text-3xl font-bold mb-6 text-[#1F3B47]">Busca de Candidatos</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mockCandidates.map((candidate) => (
                <Link key={candidate.id} to={`/candidato/${candidate.id}`}>
                  <Card className="hover:shadow-2xl transition-all duration-300 border-2 hover:border-[#F7941D]/50 h-full">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-16 h-16 bg-[#1F3B47] rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                          {candidate.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-[#1F3B47] mb-1 hover:text-[#F7941D] transition-colors truncate">
                            {candidate.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2 font-medium">{candidate.title}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {candidate.location}
                          </p>
                        </div>
                        <div className="text-center flex-shrink-0">
                          <div className="text-3xl font-bold text-[#F7941D]">{candidate.match}%</div>
                          <div className="text-xs text-gray-600 font-medium">Match</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {candidate.tags.map((tag, idx) => (
                          <Badge key={idx} className="bg-[#F7941D] hover:bg-[#e8850d] text-white font-semibold">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" className="hover:bg-[#F7941D]/10">
                            <Linkedin className="w-4 h-4 text-[#0077B5]" />
                          </Button>
                          <Button size="sm" variant="ghost" className="hover:bg-[#F7941D]/10">
                            <Github className="w-4 h-4 text-[#333]" />
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-[#F7941D] hover:bg-[#e8850d] text-white font-semibold">
                            Contactar
                          </Button>
                          <Button size="sm" variant="outline" className="border-[#1F3B47] text-[#1F3B47] hover:bg-[#1F3B47] hover:text-white font-semibold">
                            Salvar
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Pretensão salarial:</span>
                          <span className="font-bold text-[#1F3B47]">{candidate.salary}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Disponibilidade:</span>
                          <span className="font-semibold text-green-600">Imediata</span>
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

