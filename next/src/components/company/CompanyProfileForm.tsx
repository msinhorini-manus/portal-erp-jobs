'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Building2, MapPin } from 'lucide-react'

import { companyFetch, companyPath, CompanyProfileResponse, normalizeCompanyProfile, statusLabel } from '@/lib/company-client'

const fields = ['company_name', 'cnpj', 'phone', 'website', 'sector', 'company_size', 'street_address', 'city', 'state', 'zip_code', 'description'] as const
type FormState = Record<(typeof fields)[number], string>
const empty = Object.fromEntries(fields.map(field => [field, ''])) as FormState

export function CompanyProfileForm() {
  const [data, setData] = useState<CompanyProfileResponse | null>(null)
  const [form, setForm] = useState<FormState>(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    const payload = await companyFetch<Record<string, unknown>>(companyPath('profile'))
    const normalized = normalizeCompanyProfile(payload)
    setData(normalized)
    setForm(Object.fromEntries(fields.map(field => [field, String(normalized.company[field] || '')])) as FormState)
  }
  useEffect(() => { load().catch(reason => setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o perfil.')) }, [])

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      await companyFetch(companyPath('profile'), { method: 'PUT', body: JSON.stringify(form) })
      await load(); setMessage('Perfil atualizado com sucesso.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o perfil.') } finally { setBusy(false) }
  }

  if (!data && !error) return <p className="py-16 text-center text-slate-600">Carregando perfil...</p>
  return <div className="space-y-6"><div><p className="text-sm font-semibold text-orange-600">Identidade e presença regional</p><h2 className="text-3xl font-bold text-slate-950">Perfil da empresa</h2><p className="mt-1 text-slate-600">Dados legais são globais; apresentação e endereço pertencem ao site atual.</p></div>{error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}{message && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">{message}</div>}{data && <div className="grid gap-5 lg:grid-cols-[1fr_2fr]"><aside className="space-y-4"><div className="rounded-xl bg-[#0d2f3b] p-6 text-white"><Building2 className="h-10 w-10 text-orange-400" /><h3 className="mt-4 text-xl font-bold">{data.company.company_name}</h3><p className="mt-1 text-sm text-slate-300">{data.company.sector || 'Setor não informado'}</p><span className="mt-5 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{statusLabel(data.membership?.status || data.company.status)}</span></div><div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600"><div className="flex items-center gap-2 font-semibold text-slate-900"><MapPin className="h-4 w-4 text-orange-500" /> Contexto regional</div><p className="mt-2">Site: {data.membership?.site_code || data.company.site_code || 'Atual'}</p><p>Limite de vagas ativas: {data.membership?.max_active_jobs ?? data.company.max_active_jobs ?? '—'}</p><p>Papel: {data.companyUser?.role || 'não informado'}</p></div></aside><form onSubmit={save} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="mb-5 text-xl font-bold">Informações empresariais</h3><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome da empresa" name="company_name" value={form.company_name} set={setForm} required /><Field label="CNPJ / identificação fiscal" name="cnpj" value={form.cnpj} set={setForm} /><Field label="Telefone" name="phone" value={form.phone} set={setForm} /><Field label="Website" name="website" value={form.website} set={setForm} type="url" /><Field label="Setor" name="sector" value={form.sector} set={setForm} /><label className="text-sm font-medium text-slate-700">Porte<select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" value={form.company_size} onChange={event => setForm(value => ({ ...value, company_size: event.target.value }))}><option value="">Selecione</option><option value="small">1–50 pessoas</option><option value="medium">51–200 pessoas</option><option value="large">201–1.000 pessoas</option><option value="enterprise">Mais de 1.000</option></select></label><Field label="Endereço" name="street_address" value={form.street_address} set={setForm} wide /><Field label="Cidade" name="city" value={form.city} set={setForm} /><Field label="Estado" name="state" value={form.state} set={setForm} /><Field label="CEP" name="zip_code" value={form.zip_code} set={setForm} /><label className="text-sm font-medium text-slate-700 sm:col-span-2">Descrição<textarea className="mt-1 min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2.5" value={form.description} onChange={event => setForm(value => ({ ...value, description: event.target.value }))} /></label></div><button disabled={busy} className="mt-6 rounded-lg bg-[#003570] px-5 py-3 font-semibold text-white disabled:opacity-60">{busy ? 'Salvando...' : 'Salvar perfil'}</button></form></div>}</div>
}

function Field({ label, name, value, set, type = 'text', wide = false, required = false }: { label: string; name: keyof FormState; value: string; set: React.Dispatch<React.SetStateAction<FormState>>; type?: string; wide?: boolean; required?: boolean }) {
  return <label className={`text-sm font-medium text-slate-700 ${wide ? 'sm:col-span-2' : ''}`}>{label}<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" type={type} value={value} required={required} onChange={event => set(current => ({ ...current, [name]: event.target.value }))} /></label>
}
