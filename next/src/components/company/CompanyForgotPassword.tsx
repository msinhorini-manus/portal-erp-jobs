'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'

import { AuthShell, buttonClass, inputClass } from '@/components/candidate/AuthShell'
import { companyAuthPath, companyFetch } from '@/lib/company-client'

export function CompanyForgotPassword() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    const email = new FormData(event.currentTarget).get('email')
    try { const response = await companyFetch<{ message?: string }>(companyAuthPath('forgot-password'), { method: 'POST', body: JSON.stringify({ email }) }); setMessage(response.message || 'Se o e-mail estiver cadastrado, enviaremos as instruções.') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível solicitar a recuperação.') } finally { setBusy(false) }
  }
  return <AuthShell title="Recuperar acesso empresarial" description="Informe o e-mail da conta. A resposta não confirma se o endereço está cadastrado.">{message ? <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{message}</div> : <form onSubmit={submit} className="space-y-4">{error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}<label className="block text-sm font-medium text-slate-700">E-mail<input className={`${inputClass} mt-1`} type="email" name="email" autoComplete="email" required /></label><button className={buttonClass} disabled={busy}>{busy ? 'Enviando...' : 'Enviar instruções'}</button></form>}<p className="mt-5 text-center text-sm"><Link href="/empresa/login" className="font-semibold text-[#003570] hover:underline">Voltar ao login</Link></p></AuthShell>
}
