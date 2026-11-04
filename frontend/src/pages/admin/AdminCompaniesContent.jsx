import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Building2, Crown, Edit2, KeyRound, Save, ShieldCheck, X } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const labels = { pending: 'Aguardando aprovação', approved: 'Aprovada', rejected: 'Rejeitada', suspended: 'Suspensa' }
const buttonClass = 'rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50'
const inputClass = 'mt-1 w-full rounded-lg border px-3 py-2'

async function request(path, options = {}) {
  const response = await fetch(`/api/admin${path}`, {
    ...options, cache: 'no-store',
    headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}`, 'Content-Type': 'application/json' },
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a operação.')
  return payload
}

export default function AdminCompaniesContent() {
  const [params] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') || '')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ companies: [], total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [capabilities, setCapabilities] = useState({ is_platform_admin: false, can_approve_companies: false })
  const [selected, setSelected] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({})
  const [decision, setDecision] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (signal) => {
    setLoading(true)
    try {
      const query = new URLSearchParams({ search, status, page: String(page), per_page: '25' })
      setResult(await request(`/companies?${query}`, { signal }))
    } catch (error) { if (error.name !== 'AbortError') toast.error(error.message) }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [search, status, page])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => load(controller.signal), 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [load])
  useEffect(() => {
    const controller = new AbortController()
    request('/access-capabilities', { signal: controller.signal }).then(setCapabilities).catch(() => {})
    return () => controller.abort()
  }, [])

  async function view(company) {
    try {
      const data = await request(`/companies/${company.id}`)
      setSelected({ ...data.company, jobs: data.jobs || [], stats: data.stats || {} })
      setEditData({ name: data.company.name || '', phone: data.company.phone || '', city: data.company.city || '', state: data.company.state || '', is_member: Boolean(data.company.is_member), max_active_jobs: data.company.max_active_jobs ?? 3 })
      setEditMode(false)
    } catch (error) { toast.error(error.message) }
  }

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await request(`/companies/${selected.id}`, { method: 'PUT', body: JSON.stringify(editData) })
      toast.success('Dados da empresa atualizados. Aprovação não foi alterada.')
      setSelected(null)
      await load()
    } catch (error) { toast.error(error.message) }
    finally { setBusy(false) }
  }

  async function decide(event) {
    event.preventDefault()
    setBusy(true)
    try {
      const { company, kind } = decision
      const path = kind === 'suspend' ? 'toggle-active' : kind
      await request(`/companies/${company.id}/${path}`, {
        method: kind === 'suspend' ? 'PATCH' : 'POST',
        body: JSON.stringify(kind === 'suspend' ? { is_active: false } : { reason: reason.trim() }),
      })
      toast.success(kind === 'approve' ? 'Empresa aprovada pelo administrador. Vagas não foram republicadas.' : kind === 'reject' ? 'Empresa rejeitada.' : 'Empresa suspensa neste site.')
      setDecision(null)
      setReason('')
      await load()
    } catch (error) { toast.error(error.message) }
    finally { setBusy(false) }
  }

  return (
    <section className="space-y-6">
      <Toaster position="top-right" />
      <div><h1 className="text-3xl font-bold text-gray-900">Gestão de Empresas</h1><p className="mt-2 text-gray-600">{result.total} empresas cadastradas neste site.</p></div>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Aprovação administrativa obrigatória.</strong> Toda nova empresa fica aguardando aprovação. Somente após liberação do administrador poderá publicar vagas e consultar candidatos. Recuperar senha, ativar conta ou marcar como membro não aprova a empresa.</div>
      <div className="flex flex-wrap gap-3 rounded-lg bg-white p-4 shadow-sm"><input aria-label="Buscar empresas" placeholder="Buscar por nome, e-mail ou identificação fiscal" className="min-w-60 flex-1 rounded-lg border px-3 py-2" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} /><select aria-label="Status de aprovação" className="rounded-lg border px-3 py-2" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}><option value="">Todos os status</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="p-4">Empresa / contato</th><th className="p-4">Vagas / plano</th><th className="p-4">Aprovação</th><th className="p-4">Conta do responsável</th><th className="p-4">Ações</th></tr></thead><tbody>
        {result.companies.map(company => <tr key={company.id} className="border-t align-top">
          <td className="p-4"><p className="flex items-center gap-2 font-semibold"><Building2 size={18} />{company.name}</p><p>{company.email}</p><p className="text-gray-500">{[company.city, company.state].filter(Boolean).join(' / ') || 'Localização não informada'}</p></td>
          <td className="p-4"><p>{company.active_jobs || 0} / {company.max_active_jobs ?? 3} vagas ativas</p><p className="text-gray-500">{company.jobs_count || 0} vagas no histórico</p><p className="flex items-center gap-1"><Crown size={14} />{company.is_member ? 'Membro Portal ERP' : 'Não membro'}</p></td>
          <td className="p-4"><span className={`rounded-full px-3 py-1 ${company.site_status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'}`}>{labels[company.site_status] || 'Não informado'}</span></td>
          <td className="p-4">{company.global_active ? 'Ativa' : <span className="font-semibold text-red-700">Conta global desativada</span>}</td>
          <td className="space-y-2 p-4"><button className={`${buttonClass} flex items-center gap-2`} onClick={() => view(company)}><Edit2 size={16} />Ver / editar</button>
            {company.site_status !== 'approved' && capabilities.can_approve_companies && <button className="flex items-center gap-2 rounded-lg bg-green-700 px-3 py-2 font-semibold text-white" onClick={() => { setDecision({ company, kind: 'approve' }); setReason('') }}><ShieldCheck size={16} />Aprovar e liberar</button>}
            {company.site_status === 'approved' && <button className={buttonClass} onClick={() => { setDecision({ company, kind: 'suspend' }); setReason('') }}>Suspender neste site</button>}
            {company.site_status !== 'rejected' && capabilities.can_approve_companies && <button className={buttonClass} onClick={() => { setDecision({ company, kind: 'reject' }); setReason('') }}>Rejeitar cadastro</button>}
            {capabilities.is_platform_admin && <Link className="flex items-center gap-2 text-blue-700 underline" to={`/admin/usuarios?search=${encodeURIComponent(company.name)}`}><KeyRound size={16} />Usuários / senhas</Link>}
          </td>
        </tr>)}
        {!result.companies.length && <tr><td colSpan={5} className="p-8 text-center text-gray-500">{loading ? 'Carregando empresas...' : 'Nenhuma empresa encontrada.'}</td></tr>}
      </tbody></table></div>
      <div className="flex items-center justify-between text-sm"><span>Página {page} de {Math.max(1, result.pages)}</span><div className="flex gap-2"><button className={buttonClass} disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Anterior</button><button className={buttonClass} disabled={page >= result.pages || loading} onClick={() => setPage(page + 1)}>Próxima</button></div></div>
      {decision && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={decide} role="dialog" aria-modal="true" aria-labelledby="company-decision-title" className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6">
        <h2 id="company-decision-title" className="text-xl font-semibold">{decision.kind === 'approve' ? 'Confirmar aprovação da empresa' : decision.kind === 'reject' ? 'Rejeitar empresa' : 'Suspender empresa'}</h2><p><strong>{decision.company.name}</strong></p>
        <p className="text-sm">{decision.kind === 'approve' ? 'Você está liberando esta empresa neste site. A decisão será auditada. Contas desativadas globalmente continuam bloqueadas e vagas antigas não serão republicadas.' : 'A empresa não poderá publicar vagas nem consultar candidatos. As vagas ativas deste site serão desativadas.'}</p>
        {decision.kind === 'reject' && <label className="block text-sm font-medium">Motivo da rejeição<textarea className={inputClass} required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>}
        <div className="flex justify-end gap-3"><button type="button" className={buttonClass} disabled={busy} onClick={() => setDecision(null)}>Cancelar</button><button className="rounded-lg bg-[#F7941D] px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={busy || (decision.kind === 'reject' && !reason.trim())}>{busy ? 'Processando...' : decision.kind === 'approve' ? 'Confirmar aprovação' : 'Confirmar decisão'}</button></div>
      </form></div>}
      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="company-details-title" className="max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-xl bg-white p-6">
        <div className="flex items-center justify-between"><h2 id="company-details-title" className="text-xl font-semibold">{editMode ? 'Editar Empresa' : 'Detalhes da Empresa'}</h2><button type="button" aria-label="Fechar detalhes" disabled={busy} onClick={() => setSelected(null)}><X /></button></div>
        {editMode ? <div className="grid gap-4 sm:grid-cols-2">{[['name', 'Nome da empresa'], ['phone', 'Telefone'], ['city', 'Cidade'], ['state', 'Estado']].map(([field, label]) => <label key={field} className="text-sm font-medium">{label}<input className={inputClass} value={editData[field]} onChange={e => setEditData({ ...editData, [field]: e.target.value })} /></label>)}<label className="text-sm font-medium">Limite de vagas<input className={inputClass} type="number" min={0} max={100} required value={editData.max_active_jobs} onChange={e => setEditData({ ...editData, max_active_jobs: Number(e.target.value) })} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editData.is_member} onChange={e => setEditData({ ...editData, is_member: e.target.checked })} />Membro Portal ERP (não altera aprovação)</label></div> : <div className="grid gap-4 sm:grid-cols-2">{[['Nome', selected.name], ['E-mail do responsável', selected.email], ['Identificação fiscal', selected.cnpj], ['Telefone', selected.phone], ['Localização', [selected.city, selected.state].filter(Boolean).join(' / ')], ['Aprovação', labels[selected.site_status]], ['Conta global do responsável', selected.global_active ? 'Ativa' : 'Desativada'], ['Vagas no histórico', selected.stats.total_jobs || 0], ['Limite de vagas', selected.max_active_jobs ?? 3], ['Membro Portal ERP', selected.is_member ? 'Sim' : 'Não']].map(([label, value]) => <div key={label}><p className="text-sm text-gray-500">{label}</p><p>{value ?? '—'}</p></div>)}</div>}
        <div className="flex justify-end gap-3 border-t pt-4"><button type="button" className={buttonClass} disabled={busy} onClick={() => { if (editMode) setEditMode(false); else setSelected(null) }}>{editMode ? 'Cancelar' : 'Fechar'}</button>{editMode ? <button className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-white" disabled={busy}><Save size={16} />Salvar</button> : <button type="button" className={buttonClass} onClick={() => setEditMode(true)}>Editar</button>}</div>
      </form></div>}
    </section>
  )
}
