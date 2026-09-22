'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'

import { AuthShell, buttonClass, inputClass } from './AuthShell'
import { authPath, candidateFetch } from '@/lib/candidate-client'

export function ForgotPasswordForm({ locale }: { locale: string }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const spanish = locale.startsWith('es')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const result = await candidateFetch<{ message: string }>(authPath('forgot-password'), {
        method: 'POST',
        body: JSON.stringify({ email: form.get('email') }),
      })
      setMessage(result.message)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Serviço temporariamente indisponível.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title={spanish ? 'Recuperar contraseña' : 'Recuperar senha'} description={spanish ? 'Te enviaremos un enlace seguro si la cuenta existe.' : 'Enviaremos um link seguro se a conta existir.'}>
      {message ? (
        <div className="space-y-5 text-center"><div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{message}</div><Link className="font-semibold text-[#003570] hover:underline" href="/candidato/login">{spanish ? 'Volver al acceso' : 'Voltar ao login'}</Link></div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <label className="block text-sm font-medium text-slate-700">Email<input className={`${inputClass} mt-1`} name="email" type="email" autoComplete="email" required /></label>
          <button className={buttonClass} disabled={loading}>{loading ? (spanish ? 'Enviando...' : 'Enviando...') : (spanish ? 'Enviar instrucciones' : 'Enviar instruções')}</button>
          <Link className="block text-center text-sm font-medium text-[#003570] hover:underline" href="/candidato/login">{spanish ? 'Volver al acceso' : 'Voltar ao login'}</Link>
        </form>
      )}
    </AuthShell>
  )
}
