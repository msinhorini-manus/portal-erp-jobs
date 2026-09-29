import Link from 'next/link'
import {
  ArrowRight,
  Brain,
  BriefcaseBusiness,
  CheckCircle,
  Cloud,
  Code2,
  Cpu,
  Database,
  FileText,
  GraduationCap,
  Headphones,
  MapPin,
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
import { getAreas, getDashboardStats, getJobs } from '@/lib/api'

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

type Job = {
  id: number
  title?: string
  company_name?: string
  location?: string
  city?: string
  state?: string
  work_modality?: string
}

export default async function HomePage() {
  let areas: Array<{ id: number; name: string; description?: string; icon?: string; color?: string; job_count?: number }> = []
  let jobs: Job[] = []
  let stats: { active_jobs?: number; total_companies?: number; total_candidates?: number } = {}

  try { areas = await getAreas() } catch (error) { console.error('Failed to fetch areas:', error) }
  try {
    const jobsData = await getJobs()
    jobs = Array.isArray(jobsData) ? jobsData : jobsData?.jobs || []
  } catch (error) { console.error('Failed to fetch jobs:', error) }
  try { stats = await getDashboardStats() } catch (error) { console.error('Failed to fetch dashboard stats:', error) }

  const featuredJobs = jobs.slice(0, 2)

  return (
    <>
      <section className="overflow-hidden bg-[linear-gradient(135deg,#eff5f6_0%,#ffffff_52%,#fff7ec_100%)] py-16 sm:py-20 lg:py-24">
        <div className="container mx-auto grid items-center gap-12 px-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <p className="mb-5 text-xs font-extrabold uppercase tracking-[0.18em] text-orange-700 sm:text-sm">
              Carreiras e talentos do ecossistema Portal ERP
            </p>
            <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.045em] text-portal-dark sm:text-5xl lg:text-6xl">
              O mercado de software trabalha aqui.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Encontre oportunidades, talentos especializados e contexto para avançar no mercado de software de gestão.
            </p>
            <div className="mt-8 max-w-3xl"><HeroSearch /></div>

            <div className="mt-7 grid grid-cols-3 gap-3 sm:max-w-2xl sm:gap-6">
              <div><strong className="block font-display text-2xl text-portal-dark">{stats.active_jobs ?? jobs.length}+</strong><span className="text-xs text-slate-600 sm:text-sm">Vagas ativas</span></div>
              <div><strong className="block font-display text-2xl text-portal-dark">{stats.total_companies ?? 0}+</strong><span className="text-xs text-slate-600 sm:text-sm">Empresas</span></div>
              <div><strong className="block font-display text-2xl text-portal-dark">{stats.total_candidates ?? 0}+</strong><span className="text-xs text-slate-600 sm:text-sm">Profissionais</span></div>
            </div>
          </div>

          <aside className="rounded-[2rem] bg-portal-dark p-6 text-white shadow-[0_24px_60px_rgba(15,37,48,0.22)] sm:p-8" aria-label="Vagas em destaque">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-300">Vagas em destaque</p>
              <BriefcaseBusiness className="h-6 w-6 text-portal-orange" />
            </div>
            <div className="mt-6 space-y-4">
              {featuredJobs.length > 0 ? featuredJobs.map((job) => {
                const location = job.location || [job.city, job.state].filter(Boolean).join(', ') || 'Local a definir'
                return (
                  <Link key={job.id} href={`/vagas/${job.id}`} className="block rounded-2xl border border-white/5 bg-white/[0.06] p-5 transition hover:border-portal-orange/50 hover:bg-white/10">
                    <h2 className="font-display text-xl font-bold text-white">{job.title || 'Oportunidade no mercado de software'}</h2>
                    <p className="mt-2 text-sm text-white/65">{job.company_name || 'Empresa do ecossistema'}</p>
                    <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-teal-300"><MapPin className="h-4 w-4" />{location}</p>
                  </Link>
                )
              }) : (
                <div className="rounded-2xl border border-white/5 bg-white/[0.06] p-6 text-white/70">Novas oportunidades serão publicadas aqui.</div>
              )}
            </div>
            <Link href="/vagas" className="mt-6 inline-flex items-center gap-2 font-bold text-orange-300 hover:text-white">
              Ver todas as vagas <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-portal-orange">Especialização que orienta</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-portal-dark sm:text-4xl">Explore por área de atuação</h2>
            <p className="mt-4 text-slate-600">Oportunidades organizadas para quem trabalha com tecnologia, gestão e transformação empresarial.</p>
          </div>

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
                      <p className="mt-3 text-sm font-bold text-portal-orange">{area.job_count ? `${area.job_count} vagas` : 'Ver vagas'} →</p>
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
