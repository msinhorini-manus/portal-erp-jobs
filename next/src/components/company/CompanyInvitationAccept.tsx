'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'

import { BrandLockup } from '@/components/layout/BrandLockup'

type Invitation = {
  invitation: { email: string; name: string; role: string; expires_at: string }
  company_name: string
  existing_user: boolean
}

export function CompanyInvitationAccept({ token }: { token: string }) {
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [password, setPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/bff/company/invitations/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async response => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Convite inválido.')
        return payload as Invitation
      })
      .then(setInvitation)
      .catch(reason => setError(reason.message))
      .finally(() => setLoading(false))
  }, [token])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    const response = await fetch(`/bff/company/invitations/${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, accept_terms: acceptTerms, accept_privacy: acceptPrivacy }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(payload.error || 'Não foi possível aceitar o convite.')
      return
    }
    setMessage(payload.message || 'Convite aceito.')
  }

  return <section className="min-h-[75vh] bg-slate-50 px-4 py-12">
    <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <Link href="/" aria-label="Jobs by Portal ERP — início"><BrandLockup className="w-[220px]" /></Link>
      <h1 className="mt-8 font-display text-3xl font-bold text-portal-dark">Convite para equipe</h1>
      {loading && <p className="mt-5 text-slate-600">Validando convite…</p>}
      {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message ? <div className="mt-6"><p className="rounded-lg bg-teal-50 p-4 text-teal-800">{message}</p><Link href="/empresa/login" className="mt-5 inline-block rounded-lg bg-portal-orange px-5 py-3 font-semibold text-white">Entrar na área empresarial</Link></div> : invitation && <>
        <p className="mt-4 text-slate-600"><strong>{invitation.invitation.name}</strong>, você foi convidado para a equipe <strong>{invitation.company_name}</strong> como <strong>{invitation.invitation.role}</strong>.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block"><span className="mb-1 block text-sm font-semibold">E-mail</span><input name="email" value={invitation.invitation.email} readOnly className="w-full rounded-lg border bg-slate-50 px-3 py-2.5" /></label>
          <label className="block"><span className="mb-1 block text-sm font-semibold">{invitation.existing_user ? 'Sua senha atual' : 'Crie uma senha'}</span><input name="password" type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={8} required autoComplete={invitation.existing_user ? 'current-password' : 'new-password'} className="w-full rounded-lg border px-3 py-2.5" /></label>
          <label className="flex gap-3 text-sm"><input name="accept_terms" type="checkbox" checked={acceptTerms} onChange={event => setAcceptTerms(event.target.checked)} required className="mt-1" /><span>Li e aceito os <Link href="/termos" target="_blank" className="font-semibold text-blue-700 underline">Termos de Uso</Link>.</span></label>
          <label className="flex gap-3 text-sm"><input name="accept_privacy" type="checkbox" checked={acceptPrivacy} onChange={event => setAcceptPrivacy(event.target.checked)} required className="mt-1" /><span>Li e aceito a <Link href="/privacidade" target="_blank" className="font-semibold text-blue-700 underline">Política de Privacidade</Link>.</span></label>
          <button disabled={!acceptTerms || !acceptPrivacy || password.length < 8} className="w-full rounded-lg bg-portal-orange px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Aceitar convite</button>
        </form>
      </>}
    </div>
  </section>
}
