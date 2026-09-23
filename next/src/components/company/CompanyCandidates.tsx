'use client'

import Link from 'next/link'
import { Search, UserRoundSearch } from 'lucide-react'
import { useEffect, useState } from 'react'

import { companyFetch, companyPath } from '@/lib/company-client'
import { CompanyApplication, CompanyJob, Paginated } from '@/lib/company-types'

const LABELS: Record<string, string> = { applied: 'Recebida', reviewing: 'Em análise', interview: 'Entrevista', accepted: 'Aceita', rejected: 'Rejeitada', withdrawn: 'Retirada' }
const NEXT: Record<string, string[]> = { applied: ['reviewing', 'rejected', 'withdrawn'], reviewing: ['interview', 'accepted', 'rejected', 'withdrawn'], interview: ['accepted', 'rejected', 'withdrawn'] }

type ApplicationResponse = Paginated<{ applications: CompanyApplication[] }>

export function CompanyCandidates() {
  const [data, setData] = useState<ApplicationResponse | null>(null)
  const [jobs, setJobs] = useState<CompanyJob[]>([])
  const [status, setStatus] = useState('')
  const [jobId, setJobId] = useState('')
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    const query = new URLSearchParams({ page: String(page), per_page: '20' })
    if (status) query.set('status', status)
    if (jobId) query.set('job_id', jobId)
    const response = await companyFetch<ApplicationResponse>(companyPath('applications', query))
    setData(response)
  }
  useEffect(() => { companyFetch<{ jobs: CompanyJob[] }>(companyPath('jobs', new URLSearchParams({ page: '1', per_page: '100' }))).then(value => setJobs(value.jobs || [])).catch(() => undefined) }, [])
  useEffect(() => { load().catch(reason => setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o ATS.')) }, [page, status, jobId])

  async function transition(application: CompanyApplication, nextStatus: string) {
    if (!nextStatus) return
    const reason = ['rejected', 'withdrawn'].includes(nextStatus) ? window.prompt('Motivo opcional para o histórico:') : null
    setBusy(application.id); setError(''); setMessage('')
    try {
      const result = await companyFetch<{ message?: string }>(companyPath(`applications/${application.id}`), { method: 'PUT', body: JSON.stringify({ status: nextStatus, reason: reason || undefined }) })
      setMessage(result.message || 'Status atualizado.'); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a candidatura.') } finally { setBusy(null) }
  }

  return <div className="space-y-6"><div><p className="text-sm font-semibold text-orange-600">ATS regional</p><h2 className="text-3xl font-bold text-slate-950">Candidaturas</h2><p className="mt-1 text-slate-600">Listagem agregada das candidaturas recebidas pelas vagas da empresa.</p></div>{error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}{message && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">{message}</div>}<div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"><select value={jobId} onChange={event => { setJobId(event.target.value); setPage(1) }} className="rounded-lg border border-slate-300 px-4 py-2.5"><option value="">Todas as vagas</option>{jobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}</select><select value={status} onChange={event => { setStatus(event.target.value); setPage(1) }} className="rounded-lg border border-slate-300 px-4 py-2.5"><option value="">Todos os status</option>{Object.entries(LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>{!data ? <p className="py-16 text-center text-slate-600">Carregando candidaturas...</p> : data.applications.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-12 text-center"><UserRoundSearch className="mx-auto h-10 w-10 text-slate-400" /><p className="mt-3 text-slate-600">Nenhuma candidatura encontrada.</p></div> : <div className="grid gap-4">{data.applications.map(application => { const candidate = application.candidate; const name = candidate?.full_name || [candidate?.first_name, candidate?.last_name].filter(Boolean).join(' ') || `Candidato #${application.candidate_id}`; return <article key={application.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Link href={`/empresa/candidatos/${application.candidate_id}`} className="text-xl font-bold text-slate-950 hover:text-orange-600">{name}</Link><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{LABELS[application.status] || application.status}</span></div><p className="mt-1 text-sm text-slate-600">{candidate?.current_title || 'Cargo não informado'} · {candidate?.city || 'Local não informado'}{candidate?.state ? `, ${candidate.state}` : ''}</p><p className="mt-3 font-medium text-slate-800">{application.job?.title || `Vaga #${application.job_id}`}</p><p className="text-xs text-slate-500">Recebida {application.applied_at ? new Date(application.applied_at).toLocaleDateString('pt-BR') : 'em data não informada'}</p></div><div className="flex min-w-52 flex-col gap-2"><Link href={`/empresa/candidatos/${application.candidate_id}`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"><Search className="h-4 w-4" /> Ver perfil</Link>{(NEXT[application.status] || []).length > 0 && <select disabled={busy === application.id} defaultValue="" onChange={event => { void transition(application, event.target.value); event.currentTarget.value = '' }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="" disabled>Alterar status</option>{NEXT[application.status].map(value => <option key={value} value={value}>{LABELS[value]}</option>)}</select>}</div></div></article> })}</div>}{data && data.pages > 1 && <div className="flex items-center justify-center gap-3"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Anterior</button><span className="text-sm text-slate-600">Página {data.current_page} de {data.pages}</span><button disabled={page >= data.pages} onClick={() => setPage(value => value + 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Próxima</button></div>}<div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600"><strong>Busca proativa:</strong> perfis opt-in são acessíveis pelo endpoint empresarial autenticado; este ATS prioriza candidaturas recebidas e nunca usa o diretório público como CRM.</div></div>
}
