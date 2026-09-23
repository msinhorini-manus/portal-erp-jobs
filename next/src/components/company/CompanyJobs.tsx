'use client'

import Link from 'next/link'
import { Edit, Pause, Play, Plus, Search, Trash2, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'

import { companyFetch, companyPath, CompanyStatus, statusLabel } from '@/lib/company-client'
import { CompanyJob, Paginated } from '@/lib/company-types'

type JobResponse = Paginated<{ jobs: CompanyJob[] }> & { site_status: CompanyStatus; max_active_jobs: number }

export function CompanyJobs() {
  const [data, setData] = useState<JobResponse | null>(null)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    const query = new URLSearchParams({ page: String(page), per_page: '20' })
    if (status) query.set('status', status)
    const response = await companyFetch<JobResponse>(companyPath('jobs', query))
    setData(response)
  }
  useEffect(() => { load().catch(reason => setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as vagas.')) }, [page, status])

  function notify(text: string, kind: 'success' | 'error' = 'success') { if (kind === 'success') { setMessage(text); setError('') } else { setError(text); setMessage('') } }
  async function toggle(id: number) {
    setBusy(id)
    try { const result = await companyFetch<{ message?: string }>(companyPath(`jobs/${id}/toggle-status`), { method: 'PATCH', body: '{}' }); notify(result.message || 'Status atualizado.'); await load() }
    catch (reason) { notify(reason instanceof Error ? reason.message : 'Não foi possível alterar a vaga.', 'error') } finally { setBusy(null) }
  }
  async function remove(id: number, title: string) {
    if (!window.confirm(`Excluir definitivamente a vaga “${title}”?`)) return
    setBusy(id)
    try { const result = await companyFetch<{ message?: string }>(companyPath(`jobs/${id}`), { method: 'DELETE', body: '{}' }); notify(result.message || 'Vaga excluída.'); await load() }
    catch (reason) { notify(reason instanceof Error ? reason.message : 'Não foi possível excluir a vaga.', 'error') } finally { setBusy(null) }
  }

  const jobs = (data?.jobs || []).filter(job => job.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  const approved = data?.site_status === 'approved'
  return <div className="space-y-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-orange-600">CRUD de vagas</p><h2 className="text-3xl font-bold text-slate-950">Minhas vagas</h2><p className="mt-1 text-slate-600">{data?.total ?? '—'} vagas · limite de {data?.max_active_jobs ?? '—'} ativas neste site.</p></div>{approved ? <Link href="/empresa/vagas/nova" className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white"><Plus className="h-4 w-4" /> Nova vaga</Link> : <span className="rounded-lg bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-800">Status {statusLabel(data?.site_status)}: publicação bloqueada</span>}</div>{error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}{message && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">{message}</div>}<div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_auto]"><label className="relative"><Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3" placeholder="Buscar nas vagas desta página" /></label><select value={status} onChange={event => { setStatus(event.target.value); setPage(1) }} className="rounded-lg border border-slate-300 px-4 py-2.5"><option value="">Todos os status</option><option value="active">Ativas</option><option value="paused">Pausadas</option></select></div><div className="space-y-4">{!data ? <p className="py-16 text-center text-slate-600">Carregando vagas...</p> : jobs.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600">Nenhuma vaga encontrada.</div> : jobs.map(job => <article key={job.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-bold text-slate-950">{job.title}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${job.is_active ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{job.is_active ? 'Ativa' : 'Pausada'}</span></div><p className="mt-2 text-sm text-slate-600">{job.area || 'Área não informada'} · {job.location || [job.city, job.state].filter(Boolean).join(', ') || 'Local a definir'} · {job.salary || 'Salário a combinar'}</p><p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-700"><UsersRound className="h-4 w-4 text-orange-500" /> {job.applications_count || 0} candidatura(s)</p></div><div className="flex flex-wrap gap-2"><Link href={`/empresa/vagas/${job.id}/editar`} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"><Edit className="h-4 w-4" /> Editar</Link><button disabled={busy === job.id || !approved} onClick={() => toggle(job.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">{job.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{job.is_active ? 'Pausar' : 'Ativar'}</button><button disabled={busy === job.id || !approved} onClick={() => remove(job.id, job.title)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Excluir</button></div></div></article>)}</div>{data && data.pages > 1 && <div className="flex items-center justify-center gap-3"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Anterior</button><span className="text-sm text-slate-600">Página {data.current_page} de {data.pages}</span><button disabled={page >= data.pages} onClick={() => setPage(value => value + 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Próxima</button></div>}</div>
}
