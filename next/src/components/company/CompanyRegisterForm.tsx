'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'

import { AuthShell, buttonClass, inputClass } from '@/components/candidate/AuthShell'
import { clearLegacyCompanySession, companyAuthPath, companyFetch } from '@/lib/company-client'

export function CompanyRegisterForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(clearLegacyCompanySession, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    if (form.get('password') !== form.get('confirm_password')) { setError('As senhas não coincidem.'); setBusy(false); return }
    const payload = Object.fromEntries(['email', 'password', 'trade_name', 'legal_name', 'tax_id', 'phone', 'website', 'sector', 'company_size', 'description', 'state', 'city', 'address'].map(key => [key, form.get(key)]))
    try {
      await companyFetch(companyAuthPath('register'), { method: 'POST', body: JSON.stringify(payload) })
      clearLegacyCompanySession(); router.replace('/empresa/dashboard'); router.refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível cadastrar a empresa.') } finally { setBusy(false) }
  }

  return <AuthShell title="Cadastre sua empresa" description="A presença será criada neste site regional e ficará em análise antes da publicação de vagas."><form onSubmit={submit} className="space-y-4">{error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}<div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700 sm:col-span-2">Nome fantasia<input className={`${inputClass} mt-1`} name="trade_name" required /></label><label className="text-sm font-medium text-slate-700 sm:col-span-2">Razão social<input className={`${inputClass} mt-1`} name="legal_name" required /></label><label className="text-sm font-medium text-slate-700">CNPJ / identificação fiscal<input className={`${inputClass} mt-1`} name="tax_id" required /></label><label className="text-sm font-medium text-slate-700">Setor<input className={`${inputClass} mt-1`} name="sector" /></label><label className="text-sm font-medium text-slate-700">Porte<select className={`${inputClass} mt-1`} name="company_size"><option value="">Selecione</option><option value="small">1–50 pessoas</option><option value="medium">51–200 pessoas</option><option value="large">201–1.000 pessoas</option><option value="enterprise">Mais de 1.000</option></select></label><label className="text-sm font-medium text-slate-700">Telefone<input className={`${inputClass} mt-1`} name="phone" /></label><label className="text-sm font-medium text-slate-700 sm:col-span-2">Website<input className={`${inputClass} mt-1`} type="url" name="website" placeholder="https://" /></label><label className="text-sm font-medium text-slate-700">Estado<input className={`${inputClass} mt-1`} name="state" /></label><label className="text-sm font-medium text-slate-700">Cidade<input className={`${inputClass} mt-1`} name="city" /></label><label className="text-sm font-medium text-slate-700 sm:col-span-2">Endereço<input className={`${inputClass} mt-1`} name="address" /></label><label className="text-sm font-medium text-slate-700 sm:col-span-2">Descrição<textarea className={`${inputClass} mt-1 min-h-24`} name="description" /></label><label className="text-sm font-medium text-slate-700 sm:col-span-2">E-mail do responsável<input className={`${inputClass} mt-1`} name="email" type="email" autoComplete="email" required /></label><label className="text-sm font-medium text-slate-700">Senha<input className={`${inputClass} mt-1`} name="password" type="password" minLength={8} autoComplete="new-password" required /></label><label className="text-sm font-medium text-slate-700">Confirmar senha<input className={`${inputClass} mt-1`} name="confirm_password" type="password" minLength={8} autoComplete="new-password" required /></label></div><p className="rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-800">O país, a moeda e o contexto de aprovação são definidos pelo site regional acessado; não são escolhidos pelo formulário.</p><button className={buttonClass} disabled={busy}>{busy ? 'Criando conta...' : 'Criar conta empresarial'}</button></form><p className="mt-5 text-center text-sm text-slate-600">Já tem conta? <Link href="/empresa/login" className="font-semibold text-orange-600 hover:underline">Entrar</Link></p></AuthShell>
}
