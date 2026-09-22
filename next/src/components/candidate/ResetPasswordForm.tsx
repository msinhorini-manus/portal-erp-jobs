'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'

import { AuthShell, buttonClass, inputClass } from './AuthShell'
import { authPath, candidateFetch } from '@/lib/candidate-client'

export function ResetPasswordForm({ locale, token }: { locale: string; token: string }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const spanish = locale.startsWith('es')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
    setError('')
    try {
      await candidateFetch(authPath('reset-password'), { method: 'POST', body: JSON.stringify({ token, new_password: password }) })
      setSuccess(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Link inválido ou expirado.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return <AuthShell title={spanish ? 'Enlace inválido' : 'Link inválido'} description={spanish ? 'Solicita un nuevo enlace de recuperación.' : 'Solicite um novo link de recuperação.'}><Link className={buttonClass} href="/recuperar-senha">{spanish ? 'Solicitar nuevo enlace' : 'Solicitar novo link'}</Link></AuthShell>
  }
  return (
    <AuthShell title={spanish ? 'Nueva contraseña' : 'Nova senha'} description={spanish ? 'El enlace es de un solo uso y expira automáticamente.' : 'O link é de uso único e expira automaticamente.'}>
      {success ? (
        <div className="space-y-5 text-center"><div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{spanish ? 'Contraseña actualizada. Todas las sesiones anteriores fueron cerradas.' : 'Senha atualizada. Todas as sessões anteriores foram encerradas.'}</div><Link className={buttonClass} href="/candidato/login">{spanish ? 'Ingresar' : 'Entrar'}</Link></div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <label className="block text-sm font-medium text-slate-700">{spanish ? 'Nueva contraseña' : 'Nova senha'}<input className={`${inputClass} mt-1`} name="password" type="password" autoComplete="new-password" required /></label>
          <label className="block text-sm font-medium text-slate-700">{spanish ? 'Confirmar contraseña' : 'Confirmar senha'}<input className={`${inputClass} mt-1`} name="confirm_password" type="password" autoComplete="new-password" required /></label>
          <p className="text-xs text-slate-500">{spanish ? 'Mínimo 8 caracteres con mayúscula, minúscula y número.' : 'Mínimo de 8 caracteres com maiúscula, minúscula e número.'}</p>
          <button className={buttonClass} disabled={loading}>{loading ? (spanish ? 'Actualizando...' : 'Atualizando...') : (spanish ? 'Actualizar contraseña' : 'Atualizar senha')}</button>
        </form>
      )}
    </AuthShell>
  )
}
