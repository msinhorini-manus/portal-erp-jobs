'use client'

import Link from '@/components/RegionalLink'
import { useRouter } from '@/lib/regional-navigation'
import { FormEvent, useEffect, useRef, useState } from 'react'

import { AuthShell, buttonClass, inputClass } from '@/components/candidate/AuthShell'
import { CompanyLogoUpload } from './CompanyLogoUpload'
import { clearLegacyCompanySession, companyAuthPath, companyFetch } from '@/lib/company-client'
import { COMPANY_LOGO_RETRY_NOTICE, companyLogoFileError, uploadCompanyLogo } from '@/lib/company-logo'

export function CompanyRegisterForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [logo, setLogo] = useState<File | null>(null)
  const [logoError, setLogoError] = useState('')
  const [created, setCreated] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)
  const submitting = useRef(false)
  const accountCreated = useRef(false)
  useEffect(clearLegacyCompanySession, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Ref guards also cover a second event before React has rendered the disabled button.
    if (submitting.current || accountCreated.current) return
    const validationError = logoError || (logo ? companyLogoFileError(logo) : '')
    if (validationError) { setError(validationError); return }
    const form = new FormData(event.currentTarget)
    if (form.get('password') !== form.get('confirm_password')) { setError('As senhas não coincidem.'); return }
    const payload = {
      ...Object.fromEntries(['email', 'password', 'trade_name', 'legal_name', 'tax_id', 'phone', 'website', 'sector', 'company_size', 'description', 'state', 'city', 'address'].map(key => [key, form.get(key)])),
      accept_terms: form.get('accept_terms') === 'on',
      accept_privacy: form.get('accept_privacy') === 'on',
    }
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      await companyFetch(companyAuthPath('register'), { method: 'POST', body: JSON.stringify(payload) })
      // The BFF has established HttpOnly cookies. Never call register again to retry media.
      accountCreated.current = true
      setCreated(true)
      if (logo) {
        try { await uploadCompanyLogo(logo) }
        catch { setLogoFailed(true); return }
      }
      clearLegacyCompanySession()
      router.replace('/empresa/dashboard')
      router.refresh()
    } catch (reason) {
      if (!accountCreated.current) setError(reason instanceof Error ? reason.message : 'Não foi possível cadastrar a empresa.')
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  return <AuthShell title="Cadastre sua empresa" description="A presença será criada neste site regional e ficará em análise antes da publicação de vagas.">
    {created ? <div className="space-y-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900" role="status">
      <h2 className="text-lg font-semibold">Conta empresarial criada</h2>
      <p>{logoFailed ? COMPANY_LOGO_RETRY_NOTICE : busy ? 'Finalizando o logo e o acesso à sua área empresarial...' : 'Seu cadastro foi concluído. Acesse sua área empresarial.'}</p>
      {!busy && <Link href={logoFailed ? '/empresa/perfil' : '/empresa/dashboard'} className="inline-flex rounded-lg bg-[#003570] px-4 py-2 font-semibold text-white">{logoFailed ? 'Ir ao perfil e tentar enviar o logo' : 'Ir à área empresarial'}</Link>}
    </div> : <form onSubmit={submit} className="space-y-4">
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">Nome fantasia<input className={`${inputClass} mt-1`} name="trade_name" required /></label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">Razão social<input className={`${inputClass} mt-1`} name="legal_name" required /></label>
        <label className="text-sm font-medium text-slate-700">CNPJ / identificação fiscal<input className={`${inputClass} mt-1`} name="tax_id" required /></label>
        <label className="text-sm font-medium text-slate-700">Setor<input className={`${inputClass} mt-1`} name="sector" /></label>
        <label className="text-sm font-medium text-slate-700">Porte<select className={`${inputClass} mt-1`} name="company_size"><option value="">Selecione</option><option value="small">1–50 pessoas</option><option value="medium">51–200 pessoas</option><option value="large">201–1.000 pessoas</option><option value="enterprise">Mais de 1.000</option></select></label>
        <label className="text-sm font-medium text-slate-700">Telefone<input className={`${inputClass} mt-1`} name="phone" /></label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">Website<input className={`${inputClass} mt-1`} type="url" name="website" placeholder="https://" /></label>
        <label className="text-sm font-medium text-slate-700">Estado<input className={`${inputClass} mt-1`} name="state" /></label>
        <label className="text-sm font-medium text-slate-700">Cidade<input className={`${inputClass} mt-1`} name="city" /></label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">Endereço<input className={`${inputClass} mt-1`} name="address" /></label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">Descrição<textarea className={`${inputClass} mt-1 min-h-24`} name="description" /></label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">E-mail do responsável<input className={`${inputClass} mt-1`} name="email" type="email" autoComplete="email" required /></label>
        <label className="text-sm font-medium text-slate-700">Senha<input className={`${inputClass} mt-1`} name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
        <label className="text-sm font-medium text-slate-700">Confirmar senha<input className={`${inputClass} mt-1`} name="confirm_password" type="password" minLength={8} autoComplete="new-password" required /></label>
      </div>
      <CompanyLogoUpload optional file={logo} onChange={setLogo} onValidation={setLogoError} disabled={busy} />
      <p className="rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-800">O país, a moeda e o contexto de aprovação são definidos pelo site regional acessado; não são escolhidos pelo formulário.</p>
      <label className="flex gap-3 text-sm text-slate-700"><input className="mt-1" type="checkbox" name="accept_terms" required /><span>Li e aceito os <Link href="/termos" target="_blank" className="font-semibold text-blue-700 underline">Termos de Uso</Link>.</span></label>
      <label className="flex gap-3 text-sm text-slate-700"><input className="mt-1" type="checkbox" name="accept_privacy" required /><span>Li e aceito a <Link href="/privacidade" target="_blank" className="font-semibold text-blue-700 underline">Política de Privacidade</Link>.</span></label>
      <button className={buttonClass} disabled={busy || Boolean(logoError)}>{busy ? 'Criando conta...' : 'Criar conta empresarial'}</button>
    </form>}
    {!created && <p className="mt-5 text-center text-sm text-slate-600">Já tem conta? <Link href="/empresa/login" className="font-semibold text-orange-600 hover:underline">Entrar</Link></p>}
  </AuthShell>
}
