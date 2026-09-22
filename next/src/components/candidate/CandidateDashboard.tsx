'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, FileText, LogOut, Search, Settings, UserRoundCheck } from 'lucide-react'

import { authPath, candidateFetch, candidatePath, CandidateSession, clearLegacyCandidateSession } from '@/lib/candidate-client'

type Job = {
  id: number
  title: string
  company_name?: string
  location?: string
  city?: string
  state?: string
  salary?: string
  contract_type?: string
  work_modality?: string
  description?: string
  skills?: Array<string | { name?: string }>
  created_at?: string
}

type Application = {
  id: number
  job_id: number
  status: string
  applied_at?: string
  job?: Job
}

type Profile = {
  id: number
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone?: string
  current_title?: string
  curriculo_publico?: boolean
  site_membership?: { is_discoverable: boolean }
}

type Resume = {
  candidate?: Profile
  experiences?: unknown[]
  educations?: unknown[]
  skills?: unknown[]
  certifications?: unknown[]
  projects?: unknown[]
  languages?: unknown[]
}

const STATUS: Record<string, { label: string; className: string }> = {
  applied: { label: 'Enviada', className: 'bg-amber-100 text-amber-800' },
  reviewing: { label: 'Em análise', className: 'bg-blue-100 text-blue-800' },
  interview: { label: 'Entrevista', className: 'bg-purple-100 text-purple-800' },
  accepted: { label: 'Aceita', className: 'bg-green-100 text-green-800' },
  rejected: { label: 'Não selecionada', className: 'bg-red-100 text-red-800' },
  withdrawn: { label: 'Retirada', className: 'bg-slate-100 text-slate-700' },
}

function skillName(skill: string | { name?: string }) {
  return typeof skill === 'string' ? skill : skill.name || ''
}

export function CandidateDashboard({ locale }: { locale: string }) {
  const router = useRouter()
  const [tab, setTab] = useState<'jobs' | 'applications' | 'resume' | 'profile'>('jobs')
  const [session, setSession] = useState<CandidateSession | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [resume, setResume] = useState<Resume | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const spanish = locale.startsWith('es')

  async function load() {
    try {
      setLoading(true)
      const [me, profileData, apps, resumeData, jobsResponse] = await Promise.all([
        candidateFetch<CandidateSession>(authPath('me')),
        candidateFetch<Profile>(candidatePath('profile')),
        candidateFetch<{ applications: Application[] }>(candidatePath('applications')),
        candidateFetch<Resume>(candidatePath('resume')),
        fetch('/api/jobs/', { cache: 'no-store' }).then(async response => {
          if (!response.ok) throw new Error('Não foi possível carregar as vagas.')
          return response.json() as Promise<{ jobs: Job[] }>
        }),
      ])
      setSession(me)
      setProfile(profileData)
      setPhone(profileData.phone || '')
      setApplications(apps.applications || [])
      setResume(resumeData)
      setJobs(jobsResponse.jobs || [])
    } catch (reason) {
      const status = (reason as { status?: number }).status
      if (status === 401 || status === 403) {
        router.replace('/candidato/login')
        return
      }
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o painel.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    clearLegacyCandidateSession()
    void load()
  }, [])

  const appliedJobs = useMemo(() => new Set(applications.map(item => item.job_id)), [applications])
  const visibleJobs = useMemo(() => {
    const term = search.trim().toLocaleLowerCase(locale)
    if (!term) return jobs
    return jobs.filter(job => [job.title, job.company_name, job.location, job.city, job.state, job.description]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase(locale)
      .includes(term))
  }, [jobs, search, locale])
  const visibleApplications = applications.filter(item => !statusFilter || item.status === statusFilter)
  const resumeItems = [resume?.experiences, resume?.educations, resume?.skills, resume?.certifications, resume?.projects, resume?.languages]
    .reduce((total, items) => total + (items?.length || 0), 0)

  function notify(text: string, kind: 'success' | 'error' = 'success') {
    if (kind === 'success') { setMessage(text); setError('') } else { setError(text); setMessage('') }
    window.setTimeout(() => { setMessage(''); setError('') }, 5000)
  }

  async function apply(jobId: number) {
    setBusy(jobId)
    try {
      await candidateFetch(candidatePath('applications'), { method: 'POST', body: JSON.stringify({ job_id: jobId }) })
      notify(spanish ? 'Postulación enviada.' : 'Candidatura enviada com sucesso.')
      await load()
      setTab('applications')
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Não foi possível enviar a candidatura.', 'error')
    } finally { setBusy(null) }
  }

  async function withdraw(applicationId: number) {
    setBusy(`withdraw-${applicationId}`)
    try {
      await candidateFetch(candidatePath(`applications/${applicationId}`), { method: 'DELETE' })
      notify(spanish ? 'Postulación retirada.' : 'Candidatura retirada.')
      await load()
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Não foi possível retirar a candidatura.', 'error')
    } finally { setBusy(null) }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    setBusy('profile')
    try {
      await candidateFetch(candidatePath('profile'), { method: 'PUT', body: JSON.stringify({ phone }) })
      notify(spanish ? 'Perfil actualizado.' : 'Perfil atualizado.')
      await load()
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Não foi possível atualizar o perfil.', 'error')
    } finally { setBusy(null) }
  }

  async function togglePrivacy() {
    setBusy('privacy')
    try {
      const current = Boolean(profile?.site_membership?.is_discoverable ?? profile?.curriculo_publico)
      await candidateFetch(candidatePath('privacy'), { method: 'PATCH', body: JSON.stringify({ is_discoverable: !current }) })
      notify(!current ? 'Seu currículo está visível para empresas aprovadas.' : 'Seu currículo agora está privado.')
      await load()
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Não foi possível atualizar a privacidade.', 'error')
    } finally { setBusy(null) }
  }

  async function logout() {
    try { await candidateFetch(authPath('logout'), { method: 'POST' }) } finally {
      router.replace('/candidato/login')
      router.refresh()
    }
  }

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-20 text-center text-slate-600">Carregando seu painel...</div>

  const tabs = [
    { id: 'jobs' as const, label: spanish ? 'Vacantes' : 'Buscar vagas', icon: Search },
    { id: 'applications' as const, label: spanish ? 'Postulaciones' : 'Candidaturas', icon: UserRoundCheck },
    { id: 'resume' as const, label: spanish ? 'Currículum' : 'Currículo', icon: FileText },
    { id: 'profile' as const, label: spanish ? 'Perfil' : 'Perfil', icon: Settings },
  ]

  return (
    <section className="min-h-[70vh] bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-medium text-orange-600">{session?.site_code}</p><h1 className="text-2xl font-bold text-slate-950">{profile?.full_name || session?.candidate?.full_name || 'Área do candidato'}</h1><p className="text-sm text-slate-600">{session?.email}</p></div>
          <button onClick={logout} className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><LogOut className="h-4 w-4" /> Sair</button>
        </div>
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4">
          {tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${tab === item.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><item.icon className="h-4 w-4" />{item.label}</button>)}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {message && <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">{message}</div>}
        {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}

        {tab === 'jobs' && <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-2xl font-bold text-slate-950">{spanish ? 'Vacantes disponibles' : 'Vagas disponíveis'}</h2><input className="w-full rounded-lg border border-slate-300 px-4 py-2 sm:max-w-sm" value={search} onChange={event => setSearch(event.target.value)} placeholder={spanish ? 'Buscar cargo, empresa o ciudad' : 'Buscar cargo, empresa ou cidade'} /></div>
          <p className="text-sm text-slate-600">{visibleJobs.length} {spanish ? 'vacantes encontradas' : 'vagas encontradas'}</p>
          <div className="grid gap-4">{visibleJobs.map(job => <article key={job.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><h3 className="text-xl font-bold text-slate-950">{job.title}</h3><p className="mt-1 text-sm text-slate-600">{job.company_name || 'Empresa'} · {job.location || [job.city, job.state].filter(Boolean).join(', ') || 'Local a definir'}</p><p className="mt-3 line-clamp-2 text-slate-700">{job.description}</p><div className="mt-3 flex flex-wrap gap-2">{job.skills?.slice(0, 6).map((skill, index) => <span key={`${skillName(skill)}-${index}`} className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">{skillName(skill)}</span>)}</div></div><div className="flex shrink-0 gap-2"><Link href={`/vagas/${job.id}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Detalhes</Link><button onClick={() => apply(job.id)} disabled={appliedJobs.has(job.id) || busy === job.id} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300">{appliedJobs.has(job.id) ? 'Candidatado' : busy === job.id ? 'Enviando...' : 'Candidatar-se'}</button></div></div></article>)}</div>
        </div>}

        {tab === 'applications' && <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-2xl font-bold text-slate-950">{spanish ? 'Mis postulaciones' : 'Minhas candidaturas'}</h2><select className="rounded-lg border border-slate-300 px-4 py-2" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">Todos os status</option>{Object.entries(STATUS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></div>{visibleApplications.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600">Nenhuma candidatura encontrada.</div> : <div className="grid gap-4">{visibleApplications.map(item => { const state = STATUS[item.status] || { label: item.status, className: 'bg-slate-100 text-slate-700' }; return <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-lg font-bold">{item.job?.title || `Vaga #${item.job_id}`}</h3><p className="text-sm text-slate-600">{item.job?.company_name} {item.applied_at ? `· ${new Date(item.applied_at).toLocaleDateString(locale)}` : ''}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${state.className}`}>{state.label}</span>{['applied', 'reviewing', 'interview'].includes(item.status) && <button onClick={() => withdraw(item.id)} disabled={busy === `withdraw-${item.id}`} className="text-sm font-semibold text-red-600 hover:underline">Retirar</button>}</div></div></article>})}</div>}</div>}

        {tab === 'resume' && <div className="grid gap-5 lg:grid-cols-[2fr_1fr]"><div className="rounded-xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold">Meu currículo</h2><p className="mt-1 text-slate-600">{resumeItems} itens cadastrados no perfil profissional.</p></div><FileText className="h-9 w-9 text-orange-500" /></div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">{[['Experiências', resume?.experiences], ['Formações', resume?.educations], ['Tecnologias', resume?.skills], ['Certificações', resume?.certifications], ['Projetos', resume?.projects], ['Idiomas', resume?.languages]].map(([label, items]) => <div key={String(label)} className="rounded-lg bg-slate-50 p-4"><p className="text-2xl font-bold text-[#003570]">{Array.isArray(items) ? items.length : 0}</p><p className="text-sm text-slate-600">{String(label)}</p></div>)}</div><Link href="/candidato/curriculo" className="mt-6 inline-flex rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600">Editar currículo completo</Link></div><div className="rounded-xl border border-slate-200 bg-white p-6"><h3 className="font-bold">Privacidade regional</h3><p className="mt-2 text-sm text-slate-600">Controle se empresas aprovadas neste site podem encontrar seu perfil.</p><button onClick={togglePrivacy} disabled={busy === 'privacy'} className={`mt-5 w-full rounded-lg px-4 py-3 font-semibold ${profile?.site_membership?.is_discoverable ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}`}>{profile?.site_membership?.is_discoverable ? 'Currículo visível' : 'Currículo privado'}</button></div></div>}

        {tab === 'profile' && <form onSubmit={saveProfile} className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6"><div className="mb-6 flex items-center gap-3"><BriefcaseBusiness className="h-7 w-7 text-orange-500" /><div><h2 className="text-2xl font-bold">Meu perfil</h2><p className="text-sm text-slate-600">Dados da identidade profissional global.</p></div></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Nome<input disabled className="mt-1 w-full rounded-lg border bg-slate-50 px-3 py-2" value={profile?.full_name || ''} /></label><label className="text-sm font-medium text-slate-700">Email<input disabled className="mt-1 w-full rounded-lg border bg-slate-50 px-3 py-2" value={profile?.email || session?.email || ''} /></label><label className="text-sm font-medium text-slate-700 sm:col-span-2">Telefone<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={phone} onChange={event => setPhone(event.target.value)} /></label></div><button disabled={busy === 'profile'} className="mt-6 rounded-lg bg-[#003570] px-5 py-3 font-semibold text-white disabled:opacity-60">{busy === 'profile' ? 'Salvando...' : 'Salvar perfil'}</button></form>}
      </div>
    </section>
  )
}
