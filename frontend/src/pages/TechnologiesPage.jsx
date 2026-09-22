import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://jobs.portalerp.com.br/api';

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

export default function TechnologiesPage() {
  const [technologies, setTechnologies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  useEffect(() => {
    fetchTechnologies();
  }, []);

  const fetchTechnologies = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/config/technologies`);

      if (!response.ok) {
        throw new Error('Erro ao carregar tecnologias');
      }

      const data = await response.json();
      setTechnologies(data);
    } catch (err) {
      console.error('Erro ao carregar tecnologias:', err);
      setError(err.message);
      // Fallback para dados estáticos
      setTechnologies([
        { id: 1, name: 'React', category: 'Frontend', color: 'blue' },
        { id: 2, name: 'Node.js', category: 'Backend', color: 'green' },
        { id: 3, name: 'Python', category: 'Backend', color: 'yellow' },
        { id: 4, name: 'Java', category: 'Backend', color: 'orange' },
        { id: 5, name: 'PostgreSQL', category: 'Database', color: 'blue' },
        { id: 6, name: 'MongoDB', category: 'Database', color: 'green' },
        { id: 7, name: 'Docker', category: 'DevOps', color: 'blue' },
        { id: 8, name: 'Kubernetes', category: 'DevOps', color: 'blue' },
        { id: 9, name: 'AWS', category: 'Cloud', color: 'orange' },
        { id: 10, name: 'Azure', category: 'Cloud', color: 'blue' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getColorClass = (color) => {
    return colorMap[color] || 'bg-blue-500';
  };

  // Obter categorias únicas
  const categories = ['Todas', ...new Set(technologies.map(t => t.category).filter(Boolean))];

  // Filtrar tecnologias por categoria
  const filteredTechnologies = selectedCategory === 'Todas'
    ? technologies
    : technologies.filter(t => t.category === selectedCategory);

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
                  Portal <span className="text-[#F7941D]">ERP</span> Jobs
                </div>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/vagas" className="hover:text-[#F7941D] transition-colors font-medium">Vagas</Link>
              <Link to="/empresas" className="hover:text-[#F7941D] transition-colors font-medium">Empresas</Link>
              <Link to="/areas" className="hover:text-[#F7941D] transition-colors font-medium">Áreas</Link>
              <Link to="/tecnologias" className="text-[#F7941D] font-medium">Tecnologias</Link>
              <Link to="/salarios" className="hover:text-[#F7941D] transition-colors font-medium">Salários</Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-r from-[#1F3B47] to-[#2C5F7F] text-white py-16">
        <div className="container mx-auto px-6">
          <h1 className="text-5xl font-bold mb-4">Tecnologias</h1>
          <p className="text-xl text-white/90 mb-6">Encontre vagas por tecnologia</p>
          <div className="flex items-center gap-4 text-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#F7941D] rounded-full"></div>
              <span>{technologies.length} tecnologias disponíveis</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        {/* Filtro por categoria */}
        <div className="mb-8 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-[#F7941D] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#F7941D]" />
            <span className="ml-2 text-gray-600">Carregando tecnologias...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchTechnologies}
              className="text-[#F7941D] hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : filteredTechnologies.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhuma tecnologia encontrada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredTechnologies.map((tech) => (
              <Link key={tech.id} to={`/vagas?tech=${encodeURIComponent(tech.name)}`} className="block">
                <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all p-6 border-2 border-transparent hover:border-[#F7941D]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`${getColorClass(tech.color)} w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg`}>
                      {tech.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-[#1F3B47]">{tech.name}</h3>
                      <p className="text-sm text-gray-600">{tech.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <div className="text-xl font-bold text-[#F7941D]">
                        {tech.job_count ? tech.job_count.toLocaleString('pt-BR') : '-'}
                      </div>
                      <div className="text-xs text-gray-600">vagas</div>
                    </div>
                    <button className="px-3 py-1 bg-[#F7941D] hover:bg-[#E67E22] text-white rounded text-sm font-semibold">
                      Ver
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <footer className="bg-[#1F3B47] text-white py-8 mt-12">
        <div className="container mx-auto px-6 text-center">
          <p className="text-white/80">© 2026 Portal ERP Jobs. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
