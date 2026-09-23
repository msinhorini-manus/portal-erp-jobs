'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'

import { AuthShell, buttonClass, inputClass } from '@/components/candidate/AuthShell'
import { clearLegacyCompanySession, companyAuthPath, companyFetch, safeCompanyReturnPath } from '@/lib/company-client'

export function CompanyLoginForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [returnPath, setReturnPath] = useState('/empresa/dashboard')

  useEffect(() => {
    clearLegacyCompanySession()
    setReturnPath(safeCompanyReturnPath(new URLSearchParams(window.location.search).get('redirect')))
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    try {
      await companyFetch(companyAuthPath('login'), { method: 'POST', body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) })
      clearLegacyCompanySession()
      router.replace(returnPath); router.refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível entrar.') } finally { setBusy(false) }
  }

  return <AuthShell title="Acesso da empresa" description="Gerencie vagas e candidatos no site regional atual. A autorização permanece vinculada a este Host."><form onSubmit={submit} className="space-y-4">{error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}<label className="block text-sm font-medium text-slate-700">E-mail corporativo<input className={`${inputClass} mt-1`} name="email" type="email" autoComplete="email" required /></label><label className="block text-sm font-medium text-slate-700">Senha<input className={`${inputClass} mt-1`} name="password" type="password" autoComplete="current-password" required /></label><button className={buttonClass} disabled={busy}>{busy ? 'Entrando...' : 'Entrar'}</button></form><div className="mt-5 space-y-2 text-center text-sm"><Link href="/empresa/recuperar-senha" className="font-medium text-[#003570] hover:underline">Esqueci minha senha</Link><p className="text-slate-600">Ainda não possui conta? <Link href="/empresa/cadastro" className="font-semibold text-orange-600 hover:underline">Cadastrar empresa</Link></p></div></AuthShell>
}
