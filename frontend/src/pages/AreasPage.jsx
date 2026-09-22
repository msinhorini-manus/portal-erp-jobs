import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Code2, Settings, Headphones, Users, TrendingUp, FileText, Cloud, Database, Shield, Brain, Smartphone, CheckCircle, Loader2 } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://jobs.portalerp.com.br/api';

// Mapeamento de nomes de ícones para componentes
const iconMap = {
  'Code': Code2,
  'Code2': Code2,
  'Settings': Settings,
  'Users': Users,
  'Users2': Users,
  'Headphones': Headphones,
  'TrendingUp': TrendingUp,
  'FileText': FileText,
  'Cloud': Cloud,
  'Database': Database,
  'Shield': Shield,
  'Brain': Brain,
  'Smartphone': Smartphone,
  'CheckCircle': CheckCircle
};

// Mapeamento de cores
const colorMap = {
  'blue': 'bg-blue-500',
  'green': 'bg-green-500',
  'orange': 'bg-orange-500',
  'purple': 'bg-purple-500',
  'pink': 'bg-pink-500',
  'yellow': 'bg-yellow-500',
  'cyan': 'bg-cyan-500',
  'indigo': 'bg-indigo-500',
  'red': 'bg-red-500'
};

export default function AreasPage() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/config/areas`);

      if (!response.ok) {
        throw new Error('Erro ao carregar áreas');
      }

      const data = await response.json();
      setAreas(data);
    } catch (err) {
      console.error('Erro ao carregar áreas:', err);
      setError(err.message);
      // Fallback para dados estáticos em caso de erro
      setAreas([
        { id: 1, icon: 'Code2', name: 'Desenvolvimento', description: 'Frontend, Backend, Full Stack', color: 'blue' },
        { id: 2, icon: 'Settings', name: 'Consultoria & ERP', description: 'SAP, Oracle, Protheus', color: 'green' },
        { id: 3, icon: 'Headphones', name: 'Suporte & Infraestrutura', description: 'L1, L2, L3, SysAdmin', color: 'orange' },
        { id: 4, icon: 'Cloud', name: 'DevOps & Cloud', description: 'AWS, Azure, Kubernetes', color: 'cyan' },
        { id: 5, icon: 'Database', name: 'Dados & Analytics', description: 'Data Science, BI', color: 'purple' },
        { id: 6, icon: 'Shield', name: 'Segurança', description: 'Cybersecurity, InfoSec', color: 'red' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName) => {
    return iconMap[iconName] || Code2;
  };

  const getColorClass = (color) => {
    return colorMap[color] || 'bg-blue-500';
  };

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
              <Link to="/empresas" className="hover:text-[#F7941D] transition-colors font-medium">Empresas</Link>
              <Link to="/areas" className="text-[#F7941D] font-medium">Áreas</Link>
              <Link to="/tecnologias" className="hover:text-[#F7941D] transition-colors font-medium">Tecnologias</Link>
              <Link to="/salarios" className="hover:text-[#F7941D] transition-colors font-medium">Salários</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-[#1F3B47] to-[#2C5F7F] text-white py-16">
        <div className="container mx-auto px-6">
          <h1 className="text-5xl font-bold mb-4">Áreas de Atuação</h1>
          <p className="text-xl text-white/90 mb-6">
            Explore vagas por área de especialização
          </p>
          <div className="flex items-center gap-4 text-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#F7941D] rounded-full"></div>
              <span>{areas.length} áreas disponíveis</span>
            </div>
          </div>
        </div>
      </div>

      {/* Areas Grid */}
      <div className="container mx-auto px-6 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#F7941D]" />
            <span className="ml-2 text-gray-600">Carregando áreas...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchAreas}
              className="text-[#F7941D] hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : areas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhuma área cadastrada ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {areas.map((area) => {
              const Icon = getIcon(area.icon);
              return (
                <Link
                  key={area.id}
                  to={`/vagas?area=${encodeURIComponent(area.name)}`}
                  className="block"
                >
                  <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 p-6 border-2 border-transparent hover:border-[#F7941D]">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`${getColorClass(area.color)} p-3 rounded-lg`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-xl text-[#1F3B47] mb-1">{area.name}</h3>
                        <p className="text-gray-600 text-sm">{area.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#F7941D] font-semibold">
                        {area.job_count ? `${area.job_count.toLocaleString('pt-BR')} vagas` : 'Ver vagas'}
                      </span>
                      <span className="text-gray-500 text-sm hover:text-[#F7941D]">Ver Vagas →</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-[#1F3B47] text-white py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-white/60">© 2026 Portal ERP Jobs. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
