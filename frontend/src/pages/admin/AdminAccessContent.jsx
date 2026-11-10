import { appFetch } from '@/lib/regional-runtime.js'
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { KeyRound, LockKeyhole, ShieldCheck, X } from 'lucide-react'

const buttonClass = 'rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50 hover:bg-gray-50'
const statusLabels = { pending: 'Aguardando aprovação', approved: 'Aprovada', rejected: 'Rejeitada', suspended: 'Suspensa' }

async function adminRequest(path, options = {}) {
  const response = await appFetch(`/api/admin${path}`, {
    ...options,
    cache: 'no-store',
    headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}`, 'Content-Type': 'application/json' },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Não foi possível realizar a operação.')
  return data
}

export default function AdminAccessContent() {
  const [params] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') || '')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ users: [], total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [action, setAction] = useState(null)
  const [adminPassword, setAdminPassword] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [recovery, setRecovery] = useState(null)

  const load = useCallback(async (signal) => {
    setLoading(true)
    try {
      const query = new URLSearchParams({ search, type, page: String(page), per_page: '25' })
      const result = await adminRequest(`/access-users?${query}`, { signal })
      setData(result)
      setError('')
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [search, type, page])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => load(controller.signal), 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [load])

  function openAction(user, kind) {
    setAction({ user, kind })
    setAdminPassword('')
    setReason('')
    setError('')
    setRecovery(null)
    setMessage('')
  }

  async function execute(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const { user, kind } = action
    const payload = { admin_password: adminPassword, reason: reason.trim() }
    if (kind === 'global-status') payload.is_active = !user.global_active
    try {
      const result = await adminRequest(`/access-users/${user.id}/${kind}`, {
        method: kind === 'global-status' ? 'PUT' : 'POST', body: JSON.stringify(payload),
      })
      if (kind === 'password-reset') setRecovery({ ...result, email: user.email })
      setMessage(result.message || 'Operação concluída.')
      setAction(null)
      setAdminPassword('')
      setReason('')
      await load()
    } catch (err) {
      setError(err.message)
      setAdminPassword('')
    } finally { setBusy(false) }
  }

  const actionTitle = action?.kind === 'password-reset' ? 'Redefinir senha' : action?.kind === 'unlock' ? 'Desbloquear login' : action?.user.global_active ? 'Desativar conta global' : 'Reativar conta global'

  return (
    <section className="space-y-6">
      <div><h1 className="text-3xl font-bold text-gray-900">Usuários e acessos</h1><p className="mt-2 text-gray-600">Contas de candidatos e usuários empresariais. Operações globais são exclusivas do administrador de plataforma.</p></div>
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">A conta de login é global; o acesso regional e a aprovação da empresa são separados. Reativar uma conta ou redefinir sua senha não aprova empresas, não restaura membros removidos e não republica vagas.</div>
      <div className="flex flex-wrap gap-3 rounded-lg bg-white p-4 shadow-sm">
        <input aria-label="Buscar usuários" className="min-w-60 flex-1 rounded-lg border px-3 py-2" placeholder="Buscar por nome ou e-mail" value={search} onChange={e => { setSearch(e.target.value); setPage(1); setRecovery(null) }} />
        <select aria-label="Tipo de usuário" className="rounded-lg border px-3 py-2" value={type} onChange={e => { setType(e.target.value); setPage(1); setRecovery(null) }}><option value="">Todos os tipos</option><option value="candidate">Candidatos</option><option value="company">Usuários de empresas</option></select>
      </div>
      {error && !action && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
      {message && <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">{message}</div>}
      {recovery && <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-5">
        <h2 className="font-semibold">Link individual de recuperação</h2><p className="text-sm">Destinatário: {recovery.email}. Validade: {new Date(recovery.expires_at).toLocaleString('pt-BR')}. Uso único. O destinatário escolhe a nova senha; sessões antigas serão encerradas ao concluir a troca.</p>
        <label className="block text-sm font-medium">Link de recuperação<input aria-label="Link de recuperação" readOnly value={recovery.reset_url} className="mt-1 w-full rounded-lg border bg-white px-3 py-2" onFocus={e => e.target.select()} /></label>
        <p className="text-sm">Copie e entregue somente ao titular, por um canal privado verificado. Nenhum e-mail foi enviado automaticamente. O link não será armazenado no navegador e deixa de aparecer ao sair desta tela.</p>
        <button className={buttonClass} onClick={() => setRecovery(null)}>Ocultar link</button>
      </div>}
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="p-4">Usuário</th><th className="p-4">Conta global</th><th className="p-4">Acesso regional / empresa</th><th className="p-4">Login</th><th className="p-4">Ações</th></tr></thead><tbody>
        {data.users.map(user => <tr key={user.id} className="border-t align-top"><td className="p-4"><p className="font-semibold">{user.name || user.email}</p><p>{user.email}</p><p className="text-gray-500">{user.user_type === 'candidate' ? 'Candidato' : `Empresa · ${user.company_role || 'usuário'}`}</p></td>
          <td className="p-4">{user.global_active ? 'Ativa' : <span className="font-semibold text-red-700">Desativada globalmente</span>}</td>
          <td className="p-4">{user.user_type === 'candidate' ? <><p>{user.regional_active ? 'Habilitado neste site' : 'Suspenso neste site'}</p><Link className="text-blue-700 underline" to={`/admin/candidatos?search=${encodeURIComponent(user.email)}`}>Gerenciar candidato</Link></> : <><p>{user.company_name || 'Sem empresa vinculada'}</p><p>{statusLabels[user.company_status] || 'Sem presença regional'}</p>{user.company_member_active === false && <p className="text-red-700">Vínculo empresarial removido/inativo</p>}<Link className="text-blue-700 underline" to={`/admin/empresas?search=${encodeURIComponent(user.email)}`}>Gerenciar aprovação</Link></>}</td>
          <td className="p-4">{user.login_locked ? <span className="font-semibold text-amber-800">Bloqueado por tentativas</span> : 'Sem bloqueio temporário'}</td>
          <td className="space-y-2 p-4"><button className={`${buttonClass} flex items-center gap-2`} onClick={() => openAction(user, 'global-status')}><ShieldCheck size={16} />{user.global_active ? 'Desativar conta' : 'Reativar conta'}</button><button className={`${buttonClass} flex items-center gap-2`} onClick={() => openAction(user, 'unlock')} disabled={!user.login_locked && !user.failed_login_attempts}><LockKeyhole size={16} />Desbloquear login</button><button className={`${buttonClass} flex items-center gap-2`} onClick={() => openAction(user, 'password-reset')}><KeyRound size={16} />Redefinir senha</button></td>
        </tr>)}
        {!data.users.length && <tr><td colSpan={5} className="p-8 text-center text-gray-500">{loading ? 'Carregando usuários...' : 'Nenhum usuário encontrado.'}</td></tr>}
      </tbody></table></div>
      <div className="flex items-center justify-between text-sm"><span>{data.total} usuários · página {page} de {Math.max(1, data.pages)}</span><div className="flex gap-2"><button className={buttonClass} disabled={page <= 1 || loading} onClick={() => { setPage(page - 1); setRecovery(null) }}>Anterior</button><button className={buttonClass} disabled={page >= data.pages || loading} onClick={() => { setPage(page + 1); setRecovery(null) }}>Próxima</button></div></div>
      {action && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={execute} role="dialog" aria-modal="true" aria-labelledby="access-action-title" className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between"><h2 id="access-action-title" className="text-xl font-semibold">{actionTitle}</h2><button type="button" aria-label="Fechar" disabled={busy} onClick={() => { setAction(null); setAdminPassword(''); setReason('') }}><X /></button></div>
        <p className="text-sm">Usuário alvo: <strong>{action.user.email}</strong>. {action.kind === 'global-status' ? 'Esta alteração afeta a conta em todos os países. Não altera aprovação ou presença regional.' : action.kind === 'unlock' ? 'Limpa somente o bloqueio de login. Não aprova empresas nem reativa a conta.' : 'Gera um novo link de uso único, válido por uma hora. Links de recuperação anteriores serão invalidados.'}</p>
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        <label className="block text-sm font-medium">Motivo da operação<textarea required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label>
        <label className="block text-sm font-medium">Sua senha de administrador<input required type="password" autoComplete="current-password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label>
        <p className="text-xs text-gray-500">A operação será registrada na auditoria, sem senhas ou tokens.</p>
        <div className="flex justify-end gap-3"><button type="button" className={buttonClass} disabled={busy} onClick={() => { setAction(null); setAdminPassword(''); setReason('') }}>Cancelar</button><button disabled={busy || !reason.trim()} className="rounded-lg bg-[#F7941D] px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Processando...' : 'Confirmar operação'}</button></div>
      </form></div>}
    </section>
  )
}
