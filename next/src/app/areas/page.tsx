import { Metadata } from 'next'
import Link from 'next/link'
import { getAreas } from '@/lib/api'
import { Code2, Settings, Headphones, Cloud, Database, Shield, Users, Smartphone, CheckCircle, Brain, Cpu, TrendingUp, FileText, Palette, Target, UserPlus, Megaphone, GraduationCap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Áreas de Atuação',
  description: 'Explore vagas por área de especialização no setor de software e ERP. Desenvolvimento, Consultoria, DevOps, Dados, Segurança e mais.',
}

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

export default async function AreasPage() {
  let areas: any[] = []

  try {
    areas = await getAreas()
  } catch (e) {
    console.error('Failed to fetch areas:', e)
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-r from-portal-dark to-portal-dark-light text-white py-16">
        <div className="container mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Áreas de Atuação</h1>
          <p className="text-xl text-white/90 mb-4">
            Explore vagas por área de especialização
          </p>
          <div className="flex items-center gap-2 text-lg">
            <div className="w-2 h-2 bg-portal-orange rounded-full"></div>
            <span>{areas.length} áreas disponíveis</span>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {areas.map((area: any) => {
            const Icon = iconMap[area.icon] || Code2
            const bgColor = colorMap[area.color] || 'bg-blue-500'
            return (
              <Link
                key={area.id}
                href={`/vagas?area=${encodeURIComponent(area.name)}`}
                className="block"
              >
                <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 p-6 border-2 border-transparent hover:border-portal-orange">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`${bgColor} p-3 rounded-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-xl text-portal-dark mb-1">{area.name}</h3>
                      <p className="text-gray-600 text-sm">{area.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-portal-orange font-semibold">
                      {area.job_count ? `${area.job_count} vagas` : 'Ver vagas'}
                    </span>
                    <span className="text-gray-500 text-sm hover:text-portal-orange">Ver Vagas →</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </>
  )
}
