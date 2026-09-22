import { Metadata } from 'next'
import Link from 'next/link'
import { Calendar, Clock, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Blog & Conteúdo',
  description: 'Artigos, dicas de carreira e tendências do mercado de software e ERP. Mantenha-se atualizado com o Portal ERP Jobs.',
}

const articles = [
  {
    id: 1,
    title: 'Como se preparar para uma entrevista em consultoria SAP',
    excerpt: 'Dicas práticas para se destacar em processos seletivos de empresas que trabalham com SAP.',
    category: 'Carreira',
    date: '2026-05-01',
    readTime: '5 min',
  },
  {
    id: 2,
    title: 'O mercado de Protheus em 2026: tendências e oportunidades',
    excerpt: 'Análise das tendências do mercado TOTVS Protheus e as melhores oportunidades para profissionais.',
    category: 'Mercado',
    date: '2026-04-28',
    readTime: '8 min',
  },
  {
    id: 3,
    title: 'Guia completo: Como montar um currículo para área de ERP',
    excerpt: 'Passo a passo para criar um currículo que se destaque no mercado de software corporativo.',
    category: 'Carreira',
    date: '2026-04-25',
    readTime: '6 min',
  },
  {
    id: 4,
    title: 'DevOps e Cloud: habilidades mais demandadas em 2026',
    excerpt: 'Quais certificações e habilidades estão em alta para profissionais de infraestrutura.',
    category: 'Tecnologia',
    date: '2026-04-20',
    readTime: '7 min',
  },
  {
    id: 5,
    title: 'Transição de carreira: de suporte para desenvolvimento',
    excerpt: 'Histórias e dicas de profissionais que fizeram a transição com sucesso.',
    category: 'Carreira',
    date: '2026-04-15',
    readTime: '10 min',
  },
  {
    id: 6,
    title: 'Salários em TI: pesquisa salarial 2026',
    excerpt: 'Resultados da pesquisa salarial com mais de 5.000 profissionais de tecnologia.',
    category: 'Pesquisa',
    date: '2026-04-10',
    readTime: '12 min',
  },
]

export default function ContentPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-r from-portal-dark to-portal-dark-light text-white py-16">
        <div className="container mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Blog & Conteúdo</h1>
          <p className="text-xl text-white/90">
            Artigos, dicas de carreira e tendências do mercado
          </p>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/conteudo/${article.id}`}
              className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 group"
            >
              <div className="h-48 bg-gradient-to-br from-portal-dark to-portal-dark-light flex items-center justify-center">
                <span className="text-portal-orange text-4xl font-bold opacity-30">
                  {article.category.charAt(0)}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-portal-orange/10 text-portal-orange text-xs font-medium px-2.5 py-1 rounded">
                    {article.category}
                  </span>
                  <span className="text-gray-400 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {article.readTime}
                  </span>
                </div>
                <h3 className="font-bold text-portal-dark group-hover:text-portal-orange transition-colors mb-2 line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-gray-600 text-sm line-clamp-2">{article.excerpt}</p>
                <div className="mt-4 flex items-center text-portal-orange text-sm font-medium">
                  Ler artigo <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
