import { pageMetadata } from '@/lib/regional-seo.server'
import type { Metadata } from 'next'
import Link from '@/components/RegionalLink'
import {
  ArrowRight,
  Brain,
  CheckCircle,
  Cloud,
  Code2,
  Cpu,
  Database,
  FileText,
  GraduationCap,
  Headphones,
  Megaphone,
  Palette,
  Settings,
  Shield,
  Smartphone,
  Target,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'

import { HeroSearch } from '@/components/HeroSearch'
import { RecentJobs } from '@/components/RecentJobs'
import { PublicPlatformStats } from '@/components/PublicPlatformStats'
import { getAreas, getJobs, getDashboardStats } from '@/lib/api'
import { jobCountLabel } from '@/lib/public-counts'
import type { RecentJob } from '@/lib/recent-jobs'
import { requireRegionalBaseUrl } from '@/lib/site'
import { getSiteContext } from '@/lib/site-resolver.server'

const baseMetadata: Metadata = { alternates: { canonical: '/' } }

const iconMap: Record<string, typeof Code2> = {
  Code2,
  Code: Code2,
  Settings,
  Headphones,
  Cloud,
  Database,
  Shield,
  Users,
  Users2: Users,
  Smartphone,
  CheckCircle,
  Brain,
  Cpu,
  TrendingUp,
  FileText,
  Palette,
  Target,
  UserPlus,
  Megaphone,
  GraduationCap,
  Coins: TrendingUp,
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-600',
  green: 'bg-teal-600',
  orange: 'bg-portal-orange',
  cyan: 'bg-cyan-600',
  purple: 'bg-violet-600',
  red: 'bg-rose-600',
  pink: 'bg-pink-600',
  yellow: 'bg-amber-500',
  indigo: 'bg-indigo-600',
  teal: 'bg-teal-600',
  gray: 'bg-slate-600',
}

export default async function HomePage() {
  let areas: Array<{ id: number; name: string; description?: string; icon?: string; color?: string; job_count?: number }> = []
  let jobs: RecentJob[] = []
  let stats: unknown = null
  let areasUnavailable = false
  const { site } = await getSiteContext()
  const origin = requireRegionalBaseUrl(site)

  try { areas = await getAreas({ includeCounts: true }) } catch (error) { areasUnavailable = true; console.error('Failed to fetch areas:', error) }
  try { stats = await getDashboardStats({ cache: 'no-store' }) } catch { console.error('Failed to fetch public platform counts') }
  try {
    const jobsData = await getJobs({ per_page: '20' })
    jobs = Array.isArray(jobsData) ? jobsData : Array.isArray(jobsData?.jobs) ? jobsData.jobs : []
  } catch (error) { console.error('Failed to fetch jobs:', error) }

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${origin}/#organization`, name: 'Portal ERP Group', url: 'https://portalerp.com', logo: `${site.canonical_origin}/icon.png` },
      { '@type': 'WebSite', '@id': `${origin}/#website`, name: 'Portal ERP Jobs', url: origin, publisher: { '@id': `${origin}/#organization` }, inLanguage: site.locale, potentialAction: { '@type': 'SearchAction', target: `${origin}/vagas?q={search_term_string}`, 'query-input': 'required name=search_term_string' } },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <section className="overflow-hidden bg-[linear-gradient(135deg,#eff5f6_0%,#ffffff_52%,#fff7ec_100%)] py-8 sm:py-10">
        <div className="container mx-auto px-6 text-center">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-orange-700">
            Carreiras e talentos do ecossistema Portal ERP
          </p>
          <h1 className="mx-auto max-w-6xl font-display text-3xl font-extrabold leading-[1.1] tracking-[-0.045em] text-portal-dark sm:text-4xl lg:text-5xl">
            O mercado de tecnologia trabalha aqui.
          </h1>
          <p className="mx-auto mt-3 max-w-4xl text-base leading-7 text-slate-600 sm:text-lg">
            Encontre oportunidades, talentos especializados e contexto para avançar no mercado de software de gestão.
          </p>
          <div className="mx-auto mt-5 max-w-4xl text-left"><HeroSearch /></div>
        </div>
      </section>

      <PublicPlatformStats stats={stats} locale={site.locale} siteName={site.name} />

      <RecentJobs jobs={jobs} site={site} />

      <section className="bg-slate-50 py-16">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-portal-orange">Especialização que orienta</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-portal-dark sm:text-4xl">Explore por área de atuação</h2>
            <p className="mt-4 text-slate-600">Oportunidades organizadas para quem trabalha com tecnologia, gestão e transformação empresarial.</p>
          </div>

          {areasUnavailable && <p role="status" className="mt-8 text-center text-sm text-slate-500">Não foi possível carregar as áreas agora.</p>}

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {areas.slice(0, 9).map((area) => {
              const Icon = iconMap[area.icon || ''] || Code2
              const bgColor = colorMap[area.color || ''] || 'bg-blue-600'
              return (
                <Link
                  key={area.id}
                  href={`/vagas?area=${encodeURIComponent(area.name)}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-portal-orange/40 hover:shadow-lg"
                >
                  <div className="flex items-start gap-4">
                    <div className={`${bgColor} rounded-xl p-3`}><Icon className="h-6 w-6 text-white" /></div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-lg font-bold text-portal-dark transition group-hover:text-orange-700">{area.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{area.description}</p>
                      <p data-category-job-count={area.id} className="mt-3 text-sm font-bold text-portal-orange">{jobCountLabel(area.job_count, site.locale)} →</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {areas.length > 9 && (
            <div className="mt-9 text-center"><Link href="/areas" className="font-bold text-orange-700 hover:text-portal-orange-dark">Ver todas as {areas.length} áreas →</Link></div>
          )}
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-6">
          <div className="grid gap-7 lg:grid-cols-2">
            <article className="rounded-[1.75rem] border border-blue-100 border-l-8 border-l-blue-600 bg-white p-8 shadow-[0_18px_45px_rgba(15,37,48,0.10)]">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700">Para profissionais</p>
              <h2 className="mt-4 font-display text-3xl font-extrabold text-portal-dark">Construa uma carreira com contexto.</h2>
              <p className="mt-4 leading-7 text-slate-600">Vagas especializadas, currículo e inteligência de mercado para quem transforma empresas por meio da tecnologia.</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/candidato/cadastro" className="rounded-xl bg-blue-600 px-5 py-3 text-center font-bold text-white transition hover:bg-blue-700">Criar meu perfil</Link>
                <a href="https://portalerp.me/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 font-bold text-portal-dark hover:bg-slate-50">Conhecer o Portal ERP Pro <ArrowRight className="h-4 w-4" /></a>
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-orange-100 border-l-8 border-l-portal-orange bg-white p-8 shadow-[0_18px_45px_rgba(15,37,48,0.10)]">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-700">Para empresas</p>
              <h2 className="mt-4 font-display text-3xl font-extrabold text-portal-dark">Contrate onde o setor se conecta.</h2>
              <p className="mt-4 leading-7 text-slate-600">Publique vagas, fortaleça sua marca empregadora e encontre profissionais que conhecem o mercado de software.</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/empresa/cadastro" className="rounded-xl bg-portal-orange px-5 py-3 text-center font-bold text-white transition hover:bg-portal-orange-dark">Publicar vaga</Link>
                <a href="https://membro.portalerp.com.br/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 font-bold text-portal-dark hover:bg-slate-50">Programa de Membros <ArrowRight className="h-4 w-4" /></a>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  )
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ country: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const { country } = await params
  return pageMetadata(baseMetadata, '/', country, await searchParams)
}
