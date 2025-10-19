import { Link } from 'react-router-dom'
import { Code2, Settings, Headphones, Users, TrendingUp, FileText, Cloud, Database, Shield, Briefcase, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNavigate } from 'react-router-dom'

const categories = [
  { 
    icon: Code2, 
    title: 'Desenvolvimento', 
    subtitle: 'Frontend, Backend, Full Stack', 
    vagas: '3.500+',
    color: 'bg-blue-500',
    jobs: ['React Developer', 'Java Developer', 'Python Developer', '+1 mais']
  },
  { 
    icon: Settings, 
    title: 'Consultoria & ERP', 
    subtitle: 'SAP, Oracle, Protheus', 
    vagas: '2.800+',
    color: 'bg-green-500',
    jobs: ['Consultor SAP', 'Analista Protheus', 'Oracle DBA', '+1 mais']
  },
  { 
    icon: Headphones, 
    title: 'Suporte & Infraestrutura', 
    subtitle: 'L1,L2,L3, SysAdmin', 
    vagas: '2.200+',
    color: 'bg-orange-500',
    jobs: ['Analista Suporte', 'SysAdmin', 'Network Admin', '+1 mais']
  },
  { 
    icon: Users, 
    title: 'Gestão & Liderança', 
    subtitle: 'Tech Lead, Gerentes', 
    vagas: '1.800+',
    color: 'bg-purple-500',
    jobs: ['Tech Lead', 'IT Manager', 'Scrum Master', '+1 mais']
  },
  { 
    icon: TrendingUp, 
    title: 'Vendas & Pré-Vendas', 
    subtitle: 'Sales Engineer, Account', 
    vagas: '1.500+',
    color: 'bg-red-500',
    jobs: ['Sales Engineer', 'Account Manager', 'Pre-Vendas', '+1 mais']
  },
  { 
    icon: FileText, 
    title: 'Administrativo', 
    subtitle: 'Contratos, Licenças', 
    vagas: '900+',
    color: 'bg-yellow-500',
    jobs: ['License Manager', 'Customer Success', 'Contract Admin', '+1 mais']
  },
  { 
    icon: Cloud, 
    title: 'DevOps & Cloud', 
    subtitle: 'AWS, Azure, Kubernetes', 
    vagas: '2.100+',
    color: 'bg-cyan-500',
    jobs: ['DevOps Engineer', 'Cloud Architect', 'SRE', '+1 mais']
  },
  { 
    icon: Database, 
    title: 'Dados & Analytics', 
    subtitle: 'Data Science, BI', 
    vagas: '1.600+',
    color: 'bg-indigo-500',
    jobs: ['Data Scientist', 'Data Engineer', 'BI Analyst', '+1 mais']
  },
  { 
    icon: Shield, 
    title: 'Segurança', 
    subtitle: 'Cybersecurity, InfoSec', 
    vagas: '800+',
    color: 'bg-pink-500',
    jobs: ['Security Analyst', 'Pentester', 'CISO', '+1 mais']
  },
]

export default function HomePage() {
  const navigate = useNavigate();
  
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
              <div className="text-xs text-white/70 ml-2">Software Careers</div>
            </Link>
            <nav className="hidden md:flex items-center gap-8 text-sm">
              <Link to="/vagas" className="hover:text-[#F7941D] transition-colors font-medium">Vagas</Link>
              <Link to="/empresas" className="hover:text-[#F7941D] transition-colors font-medium">Empresas</Link>
              <Link to="/areas" className="hover:text-[#F7941D] transition-colors font-medium">Áreas</Link>
              <Link to="/tecnologias" className="hover:text-[#F7941D] transition-colors font-medium">Tecnologias</Link>
              <Link to="/salarios" className="hover:text-[#F7941D] transition-colors font-medium">Salários</Link>
              <Link to="/conteudo" className="hover:text-[#F7941D] transition-colors font-medium">Conteúdo</Link>
            </nav>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => navigate('/empresa/publicar-vaga')}
                className="bg-[#F7941D] hover:bg-[#e8850d] text-white text-sm font-bold flex items-center gap-2 shadow-lg"
              >
                <Plus size={18} />
                Anunciar Vagas Grátis
              </Button>
              <Button onClick={() => navigate("/candidato/cadastro")} className="bg-white text-[#1F3B47] hover:bg-gray-100 text-sm font-medium">
                Cadastrar CV grátis
              </Button>
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 text-sm font-medium">
                Entrar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#1F3B47] to-[#2a5261] text-white py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Encontre sua próxima oportunidade<br />
              no setor de software
            </h1>
            <div className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
              <Input 
                placeholder="Cargo" 
                className="bg-white text-gray-900 flex-1 h-12 text-base border-0 shadow-lg"
              />
              <Input 
                placeholder="Cidade" 
                className="bg-white text-gray-900 flex-1 h-12 text-base border-0 shadow-lg"
              />
              <Button className="bg-[#F7941D] hover:bg-[#e8850d] h-12 px-8 text-base font-semibold shadow-lg">
                Buscar vagas
              </Button>
            </div>
            <div className="flex justify-center gap-16 text-center pt-12">
              <div className="space-y-2">
                <div className="text-4xl font-bold">15.000+</div>
                <div className="text-sm text-white/80 font-medium">Vagas ativas</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold">5.000+</div>
                <div className="text-sm text-white/80 font-medium">Empresas cadastradas</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold">100.000+</div>
                <div className="text-sm text-white/80 font-medium">Profissionais cadastrados</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <Link key={index} to="/vagas" className="group">
                <Card className="hover:shadow-2xl transition-all duration-300 border-2 hover:border-[#F7941D]/30 h-full">
                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-4">
                      <div className={`${category.color} p-4 rounded-xl text-white group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                        <category.icon className="w-7 h-7" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl font-bold group-hover:text-[#F7941D] transition-colors mb-2">
                          {category.title}
                        </CardTitle>
                        <p className="text-sm text-gray-600 font-medium">
                          {category.subtitle}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-[#F7941D] font-bold text-lg">
                      {category.vagas} vagas
                    </div>
                    <div className="space-y-2 pt-2 border-t">
                      {category.jobs.map((job, idx) => (
                        <div key={idx} className="flex items-center text-sm text-gray-700">
                          <span className="w-1.5 h-1.5 bg-[#F7941D] rounded-full mr-2"></span>
                          {job}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1F3B47] text-white py-12 mt-16">
        <div className="container mx-auto px-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="w-10 h-10 bg-[#F7941D] rounded-full flex items-center justify-center font-bold">
                P
              </div>
              <div className="text-2xl font-bold">
                PORTAL <span className="text-[#F7941D]">ERP</span> JOBS
              </div>
            </div>
            <p className="text-sm text-white/60">
              © 2025 Portal ERP Jobs. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

