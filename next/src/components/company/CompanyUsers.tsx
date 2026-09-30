'use client'

import { Clipboard, RefreshCw, ShieldCheck, Trash2, UserPlus, UsersRound } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'

import { companyFetch, companyPath, CompanyPermissions, CompanyRole } from '@/lib/company-client'

type Member = {
  id: number
  user_id: number
  email: string
  name: string
  position?: string
  role: CompanyRole
  is_active: boolean
  permissions: CompanyPermissions
}
type Invitation = { id: number; email: string; name: string; role: CompanyRole; position?: string; expires_at: string }
type AuditEvent = { id: number; event_type: string; actor_user_id?: number; target_user_id?: number; details: Record<string, unknown>; created_at: string }
type TeamResponse = { members: Member[]; invitations: Invitation[]; current_member_id: number; current_role: CompanyRole; permissions: CompanyPermissions }
const ROLE_LABELS: Record<CompanyRole, string> = { owner: 'Owner', admin: 'Administrador', hr: 'RH/Recrutamento', viewer: 'Somente leitura' }

export function CompanyUsers() {
  const [team, setTeam] = useState<TeamResponse | null>(null)
  const [audit, setAudit] = useState<AuditEvent[]>([])
  const [form, setForm] = useState({ name: '', email: '', position: '', role: 'hr' as CompanyRole })
  const [manualUrl, setManualUrl] = useState('')
  const [busy, setBusy] = useState<number | 'invite' | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const value = await companyFetch<TeamResponse>(companyPath('team/members'))
    setTeam(value)
    if (value.permissions.manage_users) {
      const history = await companyFetch<{ events: AuditEvent[] }>(companyPath('team/audit'))
      setAudit(history.events || [])
    }
  }
  useEffect(() => { load().catch(reason => setError(reason instanceof Error ? reason.message : 'Não foi possível carregar a equipe.')) }, [])

  function notify(text: string, kind: 'success' | 'error' = 'success') {
    if (kind === 'success') { setMessage(text); setError('') } else { setError(text); setMessage('') }
  }

  async function invite(event: FormEvent) {
    event.preventDefault(); setBusy('invite'); setManualUrl('')
    try {
      const result = await companyFetch<{ message: string; delivery: string; invitation_url?: string }>(companyPath('team/invitations'), { method: 'POST', body: JSON.stringify(form) })
      notify(result.delivery === 'email' ? 'Convite enviado por e-mail.' : 'Convite criado. Copie o link seguro abaixo.')
      setManualUrl(result.invitation_url || '')
      setForm({ name: '', email: '', position: '', role: 'hr' })
      await load()
    } catch (reason) { notify(reason instanceof Error ? reason.message : 'Não foi possível criar o convite.', 'error') } finally { setBusy(null) }
  }

  async function update(member: Member, patch: Record<string, unknown>) {
    setBusy(member.id)
    try { await companyFetch(companyPath(`team/members/${member.id}`), { method: 'PATCH', body: JSON.stringify(patch) }); notify('Membro atualizado.'); await load() }
    catch (reason) { notify(reason instanceof Error ? reason.message : 'Não foi possível atualizar o membro.', 'error') } finally { setBusy(null) }
  }

  async function deactivate(member: Member) {
    if (!window.confirm(`Remover o acesso de ${member.name}?`)) return
    setBusy(member.id)
    try { await companyFetch(companyPath(`team/members/${member.id}`), { method: 'DELETE', body: '{}' }); notify('Acesso removido e sessões revogadas.'); await load() }
    catch (reason) { notify(reason instanceof Error ? reason.message : 'Não foi possível remover o acesso.', 'error') } finally { setBusy(null) }
  }

  async function invitationAction(invitation: Invitation, action: 'resend' | 'cancel') {
    setBusy(invitation.id); setManualUrl('')
    try {
      if (action === 'cancel') {
        await companyFetch(companyPath(`team/invitations/${invitation.id}`), { method: 'DELETE', body: '{}' })
        notify('Convite cancelado.')
      } else {
        const result = await companyFetch<{ delivery: string; invitation_url?: string }>(companyPath(`team/invitations/${invitation.id}/resend`), { method: 'POST', body: '{}' })
        setManualUrl(result.invitation_url || '')
        notify(result.delivery === 'email' ? 'Convite reenviado.' : 'Convite renovado. Copie o novo link.')
      }
      await load()
    } catch (reason) { notify(reason instanceof Error ? reason.message : 'Não foi possível atualizar o convite.', 'error') } finally { setBusy(null) }
  }

  if (!team) return error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : <p className="py-16 text-center text-slate-600">Carregando equipe…</p>
  if (!team.permissions.manage_users) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><ShieldCheck className="mx-auto h-12 w-12 text-blue-600" /><h2 className="mt-4 text-2xl font-bold">Equipe protegida</h2><p className="mt-2 text-slate-600">Seu papel permite usar a plataforma, mas apenas owners e administradores gerenciam membros.</p></div>

  const assignableRoles: CompanyRole[] = team.current_role === 'owner' ? ['owner', 'admin', 'hr', 'viewer'] : ['hr', 'viewer']
  const invitableRoles: CompanyRole[] = team.current_role === 'owner' ? ['admin', 'hr', 'viewer'] : ['hr', 'viewer']
  return <div className="space-y-8">
    <header><p className="text-sm font-semibold text-orange-600">Acesso e governança</p><h2 className="text-3xl font-bold text-slate-950">Equipe empresarial</h2><p className="mt-1 text-slate-600">Convide pessoas, defina papéis e acompanhe mudanças de acesso.</p></header>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
    {message && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">{message}</div>}
    {manualUrl && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="text-sm font-semibold text-blue-900">Envio de e-mail indisponível: compartilhe este link diretamente com a pessoa convidada.</p><div className="mt-2 flex gap-2"><input readOnly value={manualUrl} className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm" /><button onClick={() => navigator.clipboard.writeText(manualUrl)} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"><Clipboard className="h-4 w-4" /> Copiar</button></div></div>}

    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><UserPlus className="h-6 w-6 text-orange-600" /><h3 className="text-xl font-bold">Convidar pessoa</h3></div><form onSubmit={invite} className="mt-5 grid gap-3 md:grid-cols-2"><input required placeholder="Nome" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} className="rounded-lg border px-3 py-2.5" /><input required type="email" placeholder="E-mail profissional" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} className="rounded-lg border px-3 py-2.5" /><input placeholder="Cargo na empresa" value={form.position} onChange={event => setForm({ ...form, position: event.target.value })} className="rounded-lg border px-3 py-2.5" /><select value={form.role} onChange={event => setForm({ ...form, role: event.target.value as CompanyRole })} className="rounded-lg border px-3 py-2.5">{invitableRoles.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select><button disabled={busy === 'invite'} className="rounded-lg bg-portal-orange px-5 py-3 font-semibold text-white disabled:opacity-50 md:col-span-2">{busy === 'invite' ? 'Criando convite…' : 'Criar convite'}</button></form></section>

    <section><div className="flex items-center gap-3"><UsersRound className="h-6 w-6 text-blue-600" /><h3 className="text-xl font-bold">Membros</h3></div><div className="mt-4 grid gap-4">{team.members.map(member => { const protectedTarget = team.current_role === 'admin' && ['owner', 'admin'].includes(member.role); return <article key={member.id} className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-bold text-slate-950">{member.name} {member.id === team.current_member_id && <span className="text-xs font-semibold text-blue-600">(você)</span>}</p><p className="text-sm text-slate-600">{member.email}{member.position ? ` · ${member.position}` : ''}</p><span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${member.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{member.is_active ? 'Ativo' : 'Inativo'}</span></div><div className="flex flex-wrap gap-2"><select disabled={busy === member.id || protectedTarget} value={member.role} onChange={event => void update(member, { role: event.target.value })} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">{assignableRoles.includes(member.role) ? assignableRoles.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>) : <option value={member.role}>{ROLE_LABELS[member.role]}</option>}</select>{member.is_active && member.id !== team.current_member_id && !protectedTarget && <button disabled={busy === member.id} onClick={() => void deactivate(member)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600"><Trash2 className="h-4 w-4" /> Remover acesso</button>}{!member.is_active && !protectedTarget && <button disabled={busy === member.id} onClick={() => void update(member, { is_active: true })} className="rounded-lg border px-3 py-2 text-sm font-semibold">Reativar</button>}</div></div></article>})}</div></section>

    {team.invitations.length > 0 && <section><h3 className="text-xl font-bold">Convites pendentes</h3><div className="mt-4 grid gap-3">{team.invitations.map(invitation => <article key={invitation.id} className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{invitation.name} · {ROLE_LABELS[invitation.role]}</p><p className="text-sm text-slate-600">{invitation.email} · expira em {new Date(invitation.expires_at).toLocaleDateString('pt-BR')}</p></div><div className="flex gap-2"><button disabled={busy === invitation.id} onClick={() => void invitationAction(invitation, 'resend')} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold"><RefreshCw className="h-4 w-4" /> Renovar</button><button disabled={busy === invitation.id} onClick={() => void invitationAction(invitation, 'cancel')} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600">Cancelar</button></div></article>)}</div></section>}

    <section className="rounded-2xl border border-slate-200 bg-white p-6"><h3 className="text-xl font-bold">Auditoria de acesso</h3><div className="mt-4 divide-y">{audit.length === 0 ? <p className="text-sm text-slate-500">Nenhum evento registrado.</p> : audit.slice(0, 25).map(event => <div key={event.id} className="py-3"><p className="text-sm font-semibold text-slate-800">{event.event_type}</p><p className="text-xs text-slate-500">{new Date(event.created_at).toLocaleString('pt-BR')}</p></div>)}</div></section>
  </div>
}
