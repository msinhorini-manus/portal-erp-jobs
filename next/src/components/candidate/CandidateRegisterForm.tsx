'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'

import { AuthShell, buttonClass, inputClass } from './AuthShell'
import { authPath, candidateFetch, clearLegacyCandidateSession, safeReturnPath } from '@/lib/candidate-client'

export function CandidateRegisterForm({ locale }: { locale: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [returnPath, setReturnPath] = useState('/candidato/dashboard')
  const spanish = locale.startsWith('es')

  useEffect(() => {
    clearLegacyCandidateSession()
    setReturnPath(safeReturnPath(new URLSearchParams(window.location.search).get('redirect')))
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') || '')
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      setError(spanish ? 'Usa al menos 8 caracteres, mayúscula, minúscula y número.' : 'Use ao menos 8 caracteres, maiúscula, minúscula e número.')
      return
    }
    if (password !== form.get('confirm_password')) {
      setError(spanish ? 'Las contraseñas no coinciden.' : 'As senhas não coincidem.')
      return
    }
    setLoading(true)
    try {
      await candidateFetch(authPath('register'), {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          phone: form.get('phone'),
          current_position: form.get('current_position'),
          password,
        }),
      })
      router.replace(returnPath)
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível criar a conta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title={spanish ? 'Crear cuenta de candidato' : 'Criar conta de candidato'}
      description={spanish ? 'Tu cuenta usará el idioma, país y moneda de este sitio.' : 'Sua conta usará o idioma, país e moeda deste site.'}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <label className="block text-sm font-medium text-slate-700">{spanish ? 'Nombre completo' : 'Nome completo'}<input className={`${inputClass} mt-1`} name="name" autoComplete="name" required /></label>
        <label className="block text-sm font-medium text-slate-700">Email<input className={`${inputClass} mt-1`} name="email" type="email" autoComplete="email" required /></label>
        <label className="block text-sm font-medium text-slate-700">{spanish ? 'Teléfono' : 'Telefone'}<input className={`${inputClass} mt-1`} name="phone" type="tel" autoComplete="tel" /></label>
        <label className="block text-sm font-medium text-slate-700">{spanish ? 'Cargo actual' : 'Cargo atual'}<input className={`${inputClass} mt-1`} name="current_position" /></label>
        <label className="block text-sm font-medium text-slate-700">{spanish ? 'Contraseña' : 'Senha'}<input className={`${inputClass} mt-1`} name="password" type="password" autoComplete="new-password" required /></label>
        <label className="block text-sm font-medium text-slate-700">{spanish ? 'Confirmar contraseña' : 'Confirmar senha'}<input className={`${inputClass} mt-1`} name="confirm_password" type="password" autoComplete="new-password" required /></label>
        <p className="text-xs text-slate-500">{spanish ? 'Mínimo 8 caracteres con mayúscula, minúscula y número.' : 'Mínimo de 8 caracteres com maiúscula, minúscula e número.'}</p>
        <button className={buttonClass} disabled={loading} type="submit">{loading ? (spanish ? 'Creando...' : 'Criando...') : (spanish ? 'Crear cuenta' : 'Criar conta')}</button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">{spanish ? '¿Ya tienes cuenta?' : 'Já possui conta?'}{' '}<Link className="font-semibold text-orange-600 hover:underline" href={`/candidato/login?redirect=${encodeURIComponent(returnPath)}`}>{spanish ? 'Ingresar' : 'Entrar'}</Link></p>
    </AuthShell>
  )
}
