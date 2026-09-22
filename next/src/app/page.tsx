import Link from 'next/link'
import { getAreas, getDashboardStats, getJobs } from '@/lib/api'
import { Search, MapPin, Code2, Settings, Headphones, Cloud, Database, Shield, Users, Smartphone, CheckCircle, Brain, Cpu, TrendingUp, FileText, Palette, Target, UserPlus, Megaphone, GraduationCap } from 'lucide-react'
import { HeroSearch } from '@/components/HeroSearch'

const iconMap: Record<string, any> = {
  Code2, Code: Code2, Settings, Headphones, Cloud, Database, Shield, Users, Users2: Users,
  Smartphone, CheckCircle, Brain, Cpu, TrendingUp, FileText, Palette, Target,
  UserPlus, Megaphone, GraduationCap, Coins: TrendingUp,
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  cyan: 'bg-cyan-500',
  purple: 'bg-purple-500',
  red: 'bg-red-500',
  pink: 'bg-pink-500',
  yellow: 'bg-yellow-500',
  indigo: 'bg-indigo-500',
  teal: 'bg-teal-500',
  gray: 'bg-gray-500',
}

export default async function HomePage() {
  let areas: any[] = []
  let jobs: any[] = []
  let stats: { active_jobs?: number; total_companies?: number; total_candidates?: number } = {}

  try {
    areas = await getAreas()
  } catch (e) {
    console.error('Failed to fetch areas:', e)
  }

  try {
    const jobsData = await getJobs()
    jobs = Array.isArray(jobsData) ? jobsData : jobsData?.jobs || []
  } catch (e) {
    console.error('Failed to fetch jobs:', e)
  }

  try {
    stats = await getDashboardStats()
  } catch (e) {
    console.error('Failed to fetch dashboard stats:', e)
  }

  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-portal-dark via-portal-dark-light to-portal-dark text-white py-20">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Encontre sua próxima<br />
            <span className="text-portal-orange">oportunidade</span><br />
            no setor de software
          </h1>
          <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
            Vagas especializadas em ERP, desenvolvimento, consultoria e tecnologia
          </p>

          {/* Search Bar */}
          <HeroSearch />

          {/* Stats */}
          <div className="flex justify-center gap-12 mt-10">
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.active_jobs ?? jobs.length}+</div>
              <div className="text-white/70 text-sm">Vagas ativas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.total_companies ?? 0}+</div>
              <div className="text-white/70 text-sm">Empresas cadastradas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.total_candidates ?? 0}+</div>
              <div className="text-white/70 text-sm">Profissionais cadastrados</div>
            </div>
          </div>
        </div>
      </section>

      {/* Areas Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-3 text-portal-dark">
            Explore por Área de Atuação
          </h2>
          <p className="text-gray-600 text-center mb-10">
            Encontre oportunidades nas principais áreas do mercado de software e tecnologia
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {areas.slice(0, 9).map((area: any) => {
              const Icon = iconMap[area.icon] || Code2
              const bgColor = colorMap[area.color] || 'bg-blue-500'
              return (
                <Link
                  key={area.id}
                  href={`/vagas?area=${encodeURIComponent(area.name)}`}
                  className="bg-white rounded-xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-portal-orange/30 group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`${bgColor} p-3 rounded-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-portal-dark group-hover:text-portal-orange transition-colors">
                        {area.name}
                      </h3>
                      <p className="text-gray-500 text-sm">{area.description}</p>
                    </div>
                  </div>
                  <div className="mt-3 text-portal-orange text-sm font-medium">
                    {area.job_count ? `${area.job_count} vagas` : 'Ver vagas'} →
                  </div>
                </Link>
              )
            })}
          </div>

          {areas.length > 9 && (
            <div className="text-center mt-8">
              <Link
                href="/areas"
                className="text-portal-orange hover:text-portal-orange-dark font-medium"
              >
                Ver todas as {areas.length} áreas →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Para Profissionais */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-3">Para Profissionais</h3>
              <p className="text-white/90 mb-6">
                Cadastre seu currículo gratuitamente e seja encontrado pelas melhores empresas do setor de software.
              </p>
              <div className="flex gap-3">
                <Link
                  href="/candidato/cadastro"
                  className="bg-white text-blue-700 px-5 py-2.5 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                >
                  Cadastrar Currículo
                </Link>
                <Link
                  href="/vagas"
                  className="border border-white/50 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-white/10 transition-colors"
                >
                  Ver Vagas
                </Link>
              </div>
            </div>

            {/* Para Empresas */}
            <div className="bg-gradient-to-br from-portal-orange to-orange-600 rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-3">Para Empresas</h3>
              <p className="text-white/90 mb-6">
                Publique suas vagas gratuitamente e encontre os melhores talentos do mercado de software.
              </p>
              <div className="flex gap-3">
                <Link
                  href="/empresa/cadastro"
                  className="bg-white text-orange-700 px-5 py-2.5 rounded-lg font-medium hover:bg-orange-50 transition-colors"
                >
                  Publicar Vaga
                </Link>
                <Link
                  href="/empresa/cadastro"
                  className="border border-white/50 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-white/10 transition-colors"
                >
                  Cadastrar Empresa
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
