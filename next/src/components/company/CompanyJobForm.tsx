'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'

import { companyFetch, companyPath } from '@/lib/company-client'
import { CompanyJob } from '@/lib/company-types'

type Catalog = { id: number; name: string; value?: string; category?: string }
type FormState = {
  title: string
  area_id: string
  area: string
  seniority_level: string
  work_modality: string
  contract_type: string
  description: string
  requirements: string
  responsibilities: string
  benefits: string
  min_salary: string
  max_salary: string
  city: string
  state: string
}

const initial: FormState = {
  title: '',
  area_id: '',
  area: '',
  seniority_level: '',
  work_modality: 'hybrid',
  contract_type: 'clt',
  description: '',
  requirements: '',
  responsibilities: '',
  benefits: '',
  min_salary: '',
  max_salary: '',
  city: '',
  state: '',
}

export function CompanyJobForm({ jobId }: { jobId?: string }) {
  const router = useRouter()
  const editing = Boolean(jobId)
  const [form, setForm] = useState(initial)
  const [areas, setAreas] = useState<Catalog[]>([])
  const [levels, setLevels] = useState<Catalog[]>([])
  const [modalities, setModalities] = useState<Catalog[]>([])
  const [skills, setSkills] = useState<Catalog[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      companyFetch<Catalog[]>(companyPath('catalog/areas')),
      companyFetch<Catalog[]>(companyPath('catalog/levels')),
      companyFetch<Catalog[]>(companyPath('catalog/modalities')),
      companyFetch<Catalog[]>(companyPath('catalog/skills')),
      jobId ? companyFetch<CompanyJob>(companyPath(`jobs/${jobId}`)) : Promise.resolve(null),
    ]).then(([areaData, levelData, modalityData, skillData, job]) => {
      setAreas(areaData as Catalog[])
      setLevels(levelData as Catalog[])
      setModalities(modalityData as Catalog[])
      setSkills(skillData as Catalog[])
      if (job) {
        setForm({
          title: job.title || '',
          area_id: String(job.area_id || ''),
          area: job.area || '',
          seniority_level: job.seniority_level || '',
          work_modality: job.work_modality || 'hybrid',
          contract_type: job.contract_type || 'clt',
          description: job.description || '',
          requirements: job.requirements || '',
          responsibilities: job.responsibilities || '',
          benefits: job.benefits || '',
          min_salary: String(job.min_salary || ''),
          max_salary: String(job.max_salary || ''),
          city: job.city || '',
          state: job.state || '',
        })
        setSelectedSkillIds(job.skill_ids || job.skills_detailed?.map(item => item.skill_id) || [])
      }
    }).catch(reason => {
      setError(reason instanceof Error ? reason.message : 'Não foi possível preparar o formulário.')
    }).finally(() => setLoading(false))
  }, [jobId])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const payload: Record<string, unknown> = {
      title: form.title,
      area_id: form.area_id ? Number(form.area_id) : null,
      area: form.area,
      seniority_level: form.seniority_level,
      work_modality: form.work_modality,
      contract_type: form.contract_type,
      description: form.description,
      requirements: form.requirements,
      responsibilities: form.responsibilities,
      benefits: form.benefits,
      skills: selectedSkillIds,
      min_salary: form.min_salary ? Number(form.min_salary) : null,
      max_salary: form.max_salary ? Number(form.max_salary) : null,
      city: form.city,
      state: form.state,
    }
    try {
      await companyFetch(companyPath(editing ? `jobs/${jobId}` : 'jobs'), {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      })
      router.push('/empresa/vagas')
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar a vaga.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="py-16 text-center text-slate-600">Carregando formulário...</p>

  return <div className="mx-auto max-w-4xl space-y-6">
    <div>
      <p className="text-sm font-semibold text-orange-600">{editing ? 'Edição' : 'Nova publicação'}</p>
      <h2 className="text-3xl font-bold text-slate-950">{editing ? 'Editar vaga' : 'Publicar vaga'}</h2>
      <p className="mt-1 text-slate-600">País e moeda são determinados pelo site regional. A empresa é inferida da sessão no servidor.</p>
    </div>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
    <form onSubmit={submit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <Section title="Informações principais">
        <Field label="Título" value={form.title} onChange={value => update('title', value)} required wide />
        <label className="text-sm font-medium text-slate-700">Área
          <select required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" value={form.area_id} onChange={event => {
            const item = areas.find(area => area.id === Number(event.target.value))
            update('area_id', event.target.value)
            update('area', item?.name || '')
          }}>
            <option value="">Selecione</option>
            {areas.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Senioridade
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" value={form.seniority_level} onChange={event => update('seniority_level', event.target.value)}>
            <option value="">Selecione</option>
            {levels.map(item => <option key={item.id} value={item.value || item.name.toLocaleLowerCase()}>{item.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Modalidade
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" value={form.work_modality} onChange={event => update('work_modality', event.target.value)}>
            <option value="">Selecione</option>
            {modalities.map(item => <option key={item.id} value={item.value || item.name.toLocaleLowerCase()}>{item.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Contrato
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" value={form.contract_type} onChange={event => update('contract_type', event.target.value)}>
            <option value="clt">CLT</option><option value="pj">PJ</option><option value="freelance">Freelance</option><option value="internship">Estágio</option>
          </select>
        </label>
      </Section>
      <Section title="Conteúdo da vaga">
        <TextArea label="Descrição" value={form.description} onChange={value => update('description', value)} required />
        <TextArea label="Requisitos" value={form.requirements} onChange={value => update('requirements', value)} />
        <TextArea label="Responsabilidades" value={form.responsibilities} onChange={value => update('responsibilities', value)} />
        <TextArea label="Benefícios" value={form.benefits} onChange={value => update('benefits', value)} />
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">Competências e tecnologias
          <select
            multiple
            size={8}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
            value={selectedSkillIds.map(String)}
            onChange={event => setSelectedSkillIds(Array.from(event.currentTarget.selectedOptions, option => Number(option.value)))}
          >
            {skills.map(item => <option key={item.id} value={item.id}>{item.category ? `${item.category} — ` : ''}{item.name}</option>)}
          </select>
          <span className="mt-1 block text-xs font-normal text-slate-500">Use Ctrl/Cmd para selecionar mais de uma competência. A seleção substitui a lista atual ao salvar.</span>
        </label>
      </Section>
      <Section title="Remuneração e localização">
        <Field label="Salário mínimo" value={form.min_salary} onChange={value => update('min_salary', value)} type="number" />
        <Field label="Salário máximo" value={form.max_salary} onChange={value => update('max_salary', value)} type="number" />
        <Field label="Cidade" value={form.city} onChange={value => update('city', value)} />
        <Field label="Estado" value={form.state} onChange={value => update('state', value)} />
      </Section>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => router.push('/empresa/vagas')} className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700">Cancelar</button>
        <button disabled={busy} className="rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white disabled:opacity-60">{busy ? 'Salvando...' : editing ? 'Salvar alterações' : 'Publicar vaga'}</button>
      </div>
    </form>
  </div>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset><legend className="mb-4 text-lg font-bold text-slate-950">{title}</legend><div className="grid gap-4 sm:grid-cols-2">{children}</div></fieldset>
}

function Field({ label, value, onChange, required = false, wide = false, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; wide?: boolean; type?: string }) {
  return <label className={`text-sm font-medium text-slate-700 ${wide ? 'sm:col-span-2' : ''}`}>{label}<input type={type} min={type === 'number' ? 0 : undefined} required={required} value={value} onChange={event => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
}

function TextArea({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="text-sm font-medium text-slate-700 sm:col-span-2">{label}<textarea required={required} value={value} onChange={event => onChange(event.target.value)} className="mt-1 min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
}
