import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Code2, Settings, Headphones, Users, TrendingUp, FileText, Cloud, Database, Shield, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Mapeamento de categorias com ícones e cores
const categoryConfig = {
  'Desenvolvimento': { icon: Code2, color: 'bg-blue-500', subtitle: 'Frontend, Backend, Full Stack' },
  'Consultoria & ERP': { icon: Settings, color: 'bg-green-500', subtitle: 'SAP, Oracle, Protheus' },
  'Suporte & Infraestrutura': { icon: Headphones, color: 'bg-orange-500', subtitle: 'L1,L2,L3, SysAdmin' },
  'Gestão & Liderança': { icon: Users, color: 'bg-purple-500', subtitle: 'Tech Lead, Gerentes' },
  'Vendas & Pré-Vendas': { icon: TrendingUp, color: 'bg-red-500', subtitle: 'Sales Engineer, Account' },
  'Administrativo': { icon: FileText, color: 'bg-yellow-500', subtitle: 'Contratos, Licenças' },
  'DevOps & Cloud': { icon: Cloud, color: 'bg-cyan-500', subtitle: 'AWS, Azure, Kubernetes' },
  'Dados & Analytics': { icon: Database, color: 'bg-indigo-500', subtitle: 'Data Science, BI' },
  'Segurança': { icon: Shield, color: 'bg-pink-500', subtitle: 'Cybersecurity, InfoSec' }
};

export default function HomePage() {
  const navigate = useNavigate();

  // Estados para dados reais da API
  const [stats, setStats] = useState({
    active_jobs: 0,
    total_companies: 0,
    total_candidates: 0
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLocation, setSearchLocation] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar estatísticas e categorias em paralelo para melhor performance
      const [statsResponse, categoriesResponse] = await Promise.all([
        fetch(`${API_URL}/stats/dashboard`),
        fetch(`${API_URL}/stats/categories`)
      ]);

      // Processar estatísticas
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Processar categorias
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();

        // Extrair o array de categorias do objeto retornado
        const categoriesArray = categoriesData.categories || categoriesData || [];

        // Combinar dados da API com configuração de UI
        const categoriesWithConfig = categoriesArray.map(cat => {
          const config = categoryConfig[cat.category] || {
            icon: Briefcase,
            color: 'bg-gray-500',
            subtitle: ''
          };

          return {
            ...cat,
            ...config,
            vagas: cat.jobs_count > 0 ? `${cat.jobs_count}+` : '0',
            jobs: cat.top_jobs || []
          };
        });

        setCategories(categoriesWithConfig);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Formatar números para exibição
  const formatNumber = (num) => {
    if (num >= 1000) {
      return `${Math.floor(num / 1000)}.${Math.floor((num % 1000) / 100)}00+`;
    }
    return `${num}+`;
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (searchLocation) params.set('location', searchLocation);
    navigate(`/vagas?${params.toString()}`);
  };

  return (
    <>
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
                placeholder="Cargo, tecnologia ou empresa"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-white text-gray-900 flex-1 h-12 text-base border-0 shadow-lg"
              />
              <Input
                placeholder="Cidade ou estado"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-white text-gray-900 flex-1 h-12 text-base border-0 shadow-lg"
              />
              <Button
                onClick={handleSearch}
                className="bg-[#F7941D] hover:bg-[#e8850d] h-12 px-8 text-base font-semibold shadow-lg"
              >
                Buscar vagas
              </Button>
            </div>
            <div className="flex justify-center gap-16 text-center pt-12">
              <div className="space-y-2">
                <div className="text-4xl font-bold">
                  {loading ? '...' : formatNumber(stats.active_jobs)}
                </div>
                <div className="text-sm text-white/80 font-medium">Vagas ativas</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold">
                  {loading ? '...' : formatNumber(stats.total_companies)}
                </div>
                <div className="text-sm text-white/80 font-medium">Empresas cadastradas</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold">
                  {loading ? '...' : formatNumber(stats.total_candidates)}
                </div>
                <div className="text-sm text-white/80 font-medium">Profissionais cadastrados</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Explore por Área de Atuação</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Encontre oportunidades nas principais áreas do mercado de software e tecnologia
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-2xl font-semibold text-gray-600">Carregando categorias...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category, index) => (
                <Link key={index} to={`/vagas?area=${encodeURIComponent(category.category)}`} className="group">
                  <Card className="hover:shadow-2xl transition-all duration-300 border-2 hover:border-[#F7941D]/30 h-full">
                    <CardHeader className="pb-4">
                      <div className="flex items-start gap-4">
                        <div className={`${category.color} p-4 rounded-xl text-white group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                          <category.icon className="w-7 h-7" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-xl font-bold group-hover:text-[#F7941D] transition-colors mb-2">
                            {category.category}
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
                      {category.jobs && category.jobs.length > 0 && (
                        <div className="space-y-2 pt-2 border-t">
                          {category.jobs.map((job, idx) => (
                            <div key={idx} className="flex items-center text-sm text-gray-700">
                              <span className="w-1.5 h-1.5 bg-[#F7941D] rounded-full mr-2"></span>
                              {job}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Para Candidatos */}
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">Para Profissionais</h3>
                <p className="mb-6 text-white/90">
                  Cadastre seu currículo gratuitamente e seja encontrado pelas melhores empresas do setor de software.
                </p>
                <div className="flex gap-4">
                  <Button
                    onClick={() => navigate('/candidato/cadastro')}
                    className="bg-white text-blue-600 hover:bg-gray-100"
                  >
                    Cadastrar Currículo
                  </Button>
                  <Button
                    onClick={() => navigate('/vagas')}
                    className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-blue-600 font-semibold"
                  >
                    Ver Vagas
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Para Empresas */}
            <Card className="bg-gradient-to-br from-[#F7941D] to-orange-600 text-white border-0">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">Para Empresas</h3>
                <p className="mb-6 text-white/90">
                  Publique suas vagas gratuitamente e encontre os melhores talentos do mercado de software.
                </p>
                <div className="flex gap-4">
                  <Button
                    onClick={() => navigate('/empresa/publicar-vaga')}
                    className="bg-white text-orange-600 hover:bg-gray-100"
                  >
                    Publicar Vaga
                  </Button>
                  <Button
                    onClick={() => navigate('/empresa/cadastro')}
                    className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-orange-600 font-semibold"
                  >
                    Cadastrar Empresa
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  )
}
