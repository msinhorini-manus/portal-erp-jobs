'use client'

import Link from 'next/link'
import { BriefcaseBusiness, CirclePause, Gauge, Plus, UserRoundCheck } from 'lucide-react'
import { useEffect, useState } from 'react'

import { companyFetch, companyPath, CompanyStatus, statusLabel } from '@/lib/company-client'

type Stats = { total_jobs: number; active_jobs: number; paused_jobs: number; total_applications: number; conversion_rate: number; company_name: string; site_status: CompanyStatus; max_active_jobs: number }
type Job = { id: number; title: string; is_active: boolean; applications_count?: number; created_at?: string }

export function CompanyDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      companyFetch<Stats>(companyPath('dashboard')),
      companyFetch<{ jobs: Job[] }>(companyPath('jobs', new URLSearchParams({ page: '1', per_page: '5' }))),
    ]).then(([metrics, list]) => { setStats(metrics); setJobs(list.jobs || []) }).catch(reason => setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o painel.')).finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="py-16 text-center text-slate-600">Carregando visão geral...</p>
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">{error}</div>
  const approved = stats?.site_status === 'approved'
  const cards = [
    { label: 'Vagas cadastradas', value: stats?.total_jobs || 0, icon: BriefcaseBusiness, color: 'text-blue-600' },
    { label: 'Vagas ativas', value: `${stats?.active_jobs || 0}/${stats?.max_active_jobs || 0}`, icon: Gauge, color: 'text-green-600' },
    { label: 'Vagas pausadas', value: stats?.paused_jobs || 0, icon: CirclePause, color: 'text-amber-600' },
    { label: 'Candidaturas', value: stats?.total_applications || 0, icon: UserRoundCheck, color: 'text-purple-600' },
  ]
  return <div className="space-y-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-orange-600">Visão geral regional</p><h2 className="text-3xl font-bold text-slate-950">{stats?.company_name || 'Sua empresa'}</h2><p className="mt-1 text-slate-600">Acompanhe vagas e candidaturas do site atual.</p></div>{approved ? <Link href="/empresa/vagas/nova" className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600"><Plus className="h-4 w-4" /> Publicar vaga</Link> : <span className="rounded-lg bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-600">Publicação indisponível</span>}</div><div className={`rounded-xl border p-4 ${approved ? 'border-green-200 bg-green-50 text-green-800' : stats?.site_status === 'pending' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-800'}`}><strong>Status neste site: {statusLabel(stats?.site_status)}.</strong> {approved ? 'Sua empresa pode publicar vagas e acessar o ATS.' : 'Você pode consultar o painel e editar o perfil, mas vagas e candidatos dependem de aprovação regional.'}</div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(card => <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-600">{card.label}</p><card.icon className={`h-6 w-6 ${card.color}`} /></div><p className="mt-3 text-3xl font-bold text-slate-950">{card.value}</p></article>)}</div><div className="rounded-xl border border-slate-200 bg-white p-6"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-xl font-bold">Vagas recentes</h3><p className="text-sm text-slate-600">Visualizações ainda não possuem rastreamento confiável e não são exibidas.</p></div><Link href="/empresa/vagas" className="text-sm font-semibold text-orange-600 hover:underline">Ver todas</Link></div>{jobs.length === 0 ? <p className="rounded-lg bg-slate-50 p-8 text-center text-slate-600">Nenhuma vaga cadastrada.</p> : <div className="divide-y divide-slate-100">{jobs.map(job => <div key={job.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"><div><Link href={`/empresa/vagas/${job.id}/editar`} className="font-bold text-slate-900 hover:text-orange-600">{job.title}</Link><p className="text-sm text-slate-500">{job.created_at ? new Date(job.created_at).toLocaleDateString('pt-BR') : 'Data não informada'} · {job.applications_count || 0} candidatura(s)</p></div><span className={`self-start rounded-full px-3 py-1 text-xs font-semibold ${job.is_active ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{job.is_active ? 'Ativa' : 'Pausada'}</span></div>)}</div>}</div></div>
}
