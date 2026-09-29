'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { Search, UserRoundSearch } from 'lucide-react'

import { companyFetch, companyPath } from '@/lib/company-client'

type Skill = { id: number; name: string }
type Candidate = {
  id: number; name?: string; full_name?: string; current_title?: string; title?: string
  city?: string; state?: string; years_experience?: number; expected_salary?: number
  salary_currency?: string; technologies?: Array<{ name?: string }>
}
type Result = { candidates: Candidate[]; total: number; pages: number; current_page: number; per_page: number }

export function CompanyTalentSearch() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [tech, setTech] = useState('')
  const [minSalary, setMinSalary] = useState('')
  const [maxSalary, setMaxSalary] = useState('')
  const [minExperience, setMinExperience] = useState('')
  const [availableImmediately, setAvailableImmediately] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    companyFetch<Skill[]>(companyPath('catalog/skills')).then(setSkills).catch(() => undefined)
  }, [])

  async function search(page = 1) {
    setLoading(true); setError('')
    const params = new URLSearchParams({ page: String(page), per_page: '20' })
    if (query.trim()) params.set('q', query.trim())
    if (city.trim()) params.set('city', city.trim())
    if (state.trim()) params.set('state', state.trim())
    if (tech) params.set('tech', tech)
    if (minSalary) params.set('min_salary', minSalary)
    if (maxSalary) params.set('max_salary', maxSalary)
    if (minExperience) params.set('min_experience', minExperience)
    if (availableImmediately) params.set('available_immediately', availableImmediately)
    try { setResult(await companyFetch<Result>(companyPath('candidates', params))) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível pesquisar profissionais.') }
    finally { setLoading(false) }
  }

  function submit(event: FormEvent) { event.preventDefault(); void search(1) }
  function clear() { setQuery(''); setCity(''); setState(''); setTech(''); setMinSalary(''); setMaxSalary(''); setMinExperience(''); setAvailableImmediately(''); setResult(null); setError('') }

  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div><p className="text-sm font-semibold text-blue-700">Banco de talentos opt-in</p><h3 className="text-2xl font-bold text-slate-950">Buscar profissionais</h3><p className="mt-1 text-sm text-slate-600">Somente currículos que autorizaram visibilidade neste site regional.</p></div>
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <label className="lg:col-span-2"><span className="text-sm font-medium text-slate-700">Nome ou cargo</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex.: consultor SAP" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
      <label><span className="text-sm font-medium text-slate-700">Cidade</span><input value={city} onChange={event => setCity(event.target.value)} placeholder="Cidade" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
      <label><span className="text-sm font-medium text-slate-700">Estado</span><input value={state} onChange={event => setState(event.target.value)} placeholder="UF" maxLength={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 uppercase" /></label>
      <label><span className="text-sm font-medium text-slate-700">Tecnologia</span><select value={tech} onChange={event => setTech(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"><option value="">Todas</option>{skills.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
      <label><span className="text-sm font-medium text-slate-700">Pretensão mínima</span><input type="number" min="0" value={minSalary} onChange={event => setMinSalary(event.target.value)} placeholder="R$" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
      <label><span className="text-sm font-medium text-slate-700">Pretensão máxima</span><input type="number" min="0" value={maxSalary} onChange={event => setMaxSalary(event.target.value)} placeholder="R$" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
      <label><span className="text-sm font-medium text-slate-700">Experiência mínima</span><input type="number" min="0" value={minExperience} onChange={event => setMinExperience(event.target.value)} placeholder="Anos" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
      <label><span className="text-sm font-medium text-slate-700">Disponibilidade</span><select value={availableImmediately} onChange={event => setAvailableImmediately(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"><option value="">Qualquer</option><option value="true">Imediata</option><option value="false">A combinar</option></select></label>
      <div className="flex items-end gap-2"><button disabled={loading} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60"><Search className="h-4 w-4" />{loading ? 'Buscando...' : 'Buscar'}</button><button type="button" onClick={clear} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold">Limpar</button></div>
    </form>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {result && <div className="space-y-4"><p className="text-sm text-slate-600">{result.total} profissional(is) encontrado(s)</p>{result.candidates.length === 0 ? <div className="rounded-xl bg-slate-50 p-8 text-center text-slate-600"><UserRoundSearch className="mx-auto mb-2 h-8 w-8 text-slate-400" />Nenhum perfil corresponde aos filtros.</div> : <div className="grid gap-3 md:grid-cols-2">{result.candidates.map(candidate => <article key={candidate.id} className="rounded-xl border border-slate-200 p-4"><h4 className="font-bold text-slate-950">{candidate.name || candidate.full_name || 'Profissional'}</h4><p className="text-sm text-slate-600">{candidate.current_title || candidate.title || 'Cargo não informado'}</p><p className="mt-1 text-xs text-slate-500">{[candidate.city, candidate.state].filter(Boolean).join(', ') || 'Local não informado'}{typeof candidate.years_experience === 'number' ? ` · ${candidate.years_experience} ano(s)` : ''}</p><div className="mt-3 flex flex-wrap gap-1.5">{candidate.technologies?.slice(0, 6).map(item => item.name && <span key={item.name} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">{item.name}</span>)}</div><Link href={`/empresa/candidatos/${candidate.id}`} className="mt-4 inline-flex text-sm font-semibold text-orange-600 hover:underline">Ver perfil autorizado →</Link></article>)}</div>}{result.pages > 1 && <div className="flex items-center justify-center gap-3"><button disabled={result.current_page <= 1 || loading} onClick={() => void search(result.current_page - 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Anterior</button><span className="text-sm text-slate-600">Página {result.current_page} de {result.pages}</span><button disabled={result.current_page >= result.pages || loading} onClick={() => void search(result.current_page + 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Próxima</button></div>}</div>}
  </section>
}
