import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, TrendingUp, Award, Users, Search, Calendar, Clock, ArrowRight, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const categories = [
  {
    name: 'Carreira',
    slug: 'carreira',
    icon: TrendingUp,
    color: 'bg-blue-500',
    articles: 45
  },
  {
    name: 'Tecnologia',
    slug: 'tecnologia',
    icon: BookOpen,
    color: 'bg-purple-500',
    articles: 38
  },
  {
    name: 'Certificações',
    slug: 'certificacoes',
    icon: Award,
    color: 'bg-green-500',
    articles: 22
  },
  {
    name: 'Entrevistas',
    slug: 'entrevistas',
    icon: Users,
    color: 'bg-orange-500',
    articles: 15
  }
]

const featuredArticles = [
  {
    id: 1,
    title: 'Como se Tornar um Consultor SAP de Sucesso em 2025',
    excerpt: 'Descubra o caminho completo para se tornar um consultor SAP altamente valorizado no mercado, desde as certificações necessárias até as melhores práticas.',
    category: 'Carreira',
    author: 'Maria Silva',
    date: '2025-01-10',
    readTime: '8 min',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
    tags: ['SAP', 'Carreira', 'Consultoria']
  },
  {
    id: 2,
    title: 'Top 10 Tecnologias Mais Demandadas em 2025',
    excerpt: 'Análise completa das tecnologias que estão dominando o mercado de trabalho e como você pode se preparar para aproveitar essas oportunidades.',
    category: 'Tecnologia',
    author: 'João Santos',
    date: '2025-01-08',
    readTime: '12 min',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
    tags: ['Tecnologia', 'Tendências', 'Mercado']
  },
  {
    id: 3,
    title: 'Guia Completo de Certificações para Desenvolvedores',
    excerpt: 'Um guia detalhado sobre as principais certificações para desenvolvedores, seus custos, benefícios e como se preparar para cada uma delas.',
    category: 'Certificações',
    author: 'Ana Costa',
    date: '2025-01-05',
    readTime: '15 min',
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800',
    tags: ['Certificações', 'Desenvolvimento', 'Carreira']
  }
]

const recentArticles = [
  {
    id: 4,
    title: 'Como Negociar Salário em Entrevistas de TI',
    excerpt: 'Estratégias comprovadas para negociar seu salário e benefícios em processos seletivos de tecnologia.',
    category: 'Carreira',
    author: 'Pedro Lima',
    date: '2025-01-12',
    readTime: '6 min',
    tags: ['Salário', 'Entrevista', 'Negociação']
  },
  {
    id: 5,
    title: 'React vs Vue vs Angular: Qual Escolher em 2025?',
    excerpt: 'Comparação detalhada dos principais frameworks JavaScript e quando usar cada um deles.',
    category: 'Tecnologia',
    author: 'Carlos Mendes',
    date: '2025-01-11',
    readTime: '10 min',
    tags: ['React', 'Vue', 'Angular', 'Frontend']
  },
  {
    id: 6,
    title: 'DevOps: O Caminho do Desenvolvedor ao Engenheiro',
    excerpt: 'Roadmap completo para desenvolvedores que querem migrar para a área de DevOps.',
    category: 'Carreira',
    author: 'Roberto Silva',
    date: '2025-01-09',
    readTime: '9 min',
    tags: ['DevOps', 'Carreira', 'Transição']
  },
  {
    id: 7,
    title: 'Certificação AWS: Vale a Pena em 2025?',
    excerpt: 'Análise completa sobre o ROI das certificações AWS e como elas podem impulsionar sua carreira.',
    category: 'Certificações',
    author: 'Fernanda Oliveira',
    date: '2025-01-07',
    readTime: '7 min',
    tags: ['AWS', 'Cloud', 'Certificação']
  },
  {
    id: 8,
    title: 'Soft Skills Essenciais para Desenvolvedores Sênior',
    excerpt: 'As habilidades comportamentais que diferenciam desenvolvedores sênior de sucesso.',
    category: 'Carreira',
    author: 'Lucas Ferreira',
    date: '2025-01-06',
    readTime: '8 min',
    tags: ['Soft Skills', 'Liderança', 'Sênior']
  },
  {
    id: 9,
    title: 'Python para Data Science: Guia Completo',
    excerpt: 'Tudo que você precisa saber para começar sua jornada em Data Science com Python.',
    category: 'Tecnologia',
    author: 'Amanda Souza',
    date: '2025-01-04',
    readTime: '14 min',
    tags: ['Python', 'Data Science', 'Machine Learning']
  }
]

const popularTags = [
  'SAP', 'React', 'Python', 'AWS', 'DevOps', 'Carreira', 'Salário', 
  'Entrevista', 'Certificação', 'Node.js', 'Java', 'Cloud', 'Agile'
]

export default function ContentPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)

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
              <Link to="/areas" className="hover:text-[#F7941D] transition-colors font-medium">Áreas</Link>
              <Link to="/tecnologias" className="hover:text-[#F7941D] transition-colors font-medium">Tecnologias</Link>
              <Link to="/salarios" className="hover:text-[#F7941D] transition-colors font-medium">Salários</Link>
              <Link to="/conteudo" className="text-[#F7941D] font-medium">Conteúdo</Link>
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
              Centro de <span className="text-[#F7941D]">Conteúdo</span>
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Artigos, guias e recursos para impulsionar sua carreira em tecnologia
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar artigos, guias, tutoriais..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg bg-white text-gray-900"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {categories.map((category, index) => {
            const Icon = category.icon
            return (
              <Card 
                key={index}
                className={`hover:shadow-lg transition-all cursor-pointer ${selectedCategory === category.slug ? 'ring-2 ring-[#F7941D]' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === category.slug ? null : category.slug)}
              >
                <CardContent className="p-6">
                  <div className={`w-12 h-12 ${category.color} rounded-lg flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-[#1F3B47] mb-2">{category.name}</h3>
                  <p className="text-gray-600 text-sm">{category.articles} artigos</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Featured Articles */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-[#1F3B47] mb-6">Artigos em Destaque</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {featuredArticles.map((article) => (
              <Card key={article.id} className="hover:shadow-xl transition-shadow overflow-hidden">
                <div className="h-48 overflow-hidden">
                  <img 
                    src={article.image} 
                    alt={article.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 bg-[#F7941D] text-white text-xs font-semibold rounded-full">
                      {article.category}
                    </span>
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{article.readTime}</span>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-xl text-[#1F3B47] mb-3 hover:text-[#F7941D] transition-colors cursor-pointer">
                    {article.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {article.excerpt}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {article.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold">{article.author.charAt(0)}</span>
                      </div>
                      <div className="text-sm">
                        <div className="font-semibold text-gray-700">{article.author}</div>
                        <div className="text-gray-500 text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(article.date).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    <Link to={`/conteudo/${article.id}`}>
                      <Button size="sm" className="bg-[#F7941D] hover:bg-[#E67E22] text-white">
                        Ler <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Articles */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-[#1F3B47] mb-6">Artigos Recentes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentArticles.map((article) => (
              <Card key={article.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-semibold rounded-full">
                      {article.category}
                    </span>
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{article.readTime}</span>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-lg text-[#1F3B47] mb-2 hover:text-[#F7941D] transition-colors cursor-pointer">
                    {article.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-4 text-sm line-clamp-2">
                    {article.excerpt}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {article.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      {article.author}
                    </div>
                    <Link to={`/conteudo/${article.id}`}>
                      <Button size="sm" variant="outline" className="text-[#F7941D] border-[#F7941D] hover:bg-[#F7941D] hover:text-white">
                        Ler mais
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Popular Tags */}
        <div>
          <h2 className="text-2xl font-bold text-[#1F3B47] mb-6">Tags Populares</h2>
          <div className="flex flex-wrap gap-3">
            {popularTags.map((tag, index) => (
              <button
                key={index}
                className="px-4 py-2 bg-white border-2 border-gray-200 rounded-full hover:border-[#F7941D] hover:text-[#F7941D] transition-colors font-medium flex items-center gap-2"
              >
                <Tag className="w-4 h-4" />
                {tag}
              </button>
            ))}
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

