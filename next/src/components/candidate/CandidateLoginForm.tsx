'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'

import { AuthShell, buttonClass, inputClass } from './AuthShell'
import { authPath, candidateFetch, clearLegacyCandidateSession, safeReturnPath } from '@/lib/candidate-client'

export function CandidateLoginForm({ locale }: { locale: string }) {
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
    setLoading(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      await candidateFetch(authPath('login'), {
        method: 'POST',
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      })
      router.replace(returnPath)
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title={spanish ? 'Acceso de candidato' : 'Acesso do candidato'}
      description={spanish ? 'Ingresa con tu cuenta del sitio regional actual.' : 'Entre com sua conta vinculada ao site regional atual.'}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input className={`${inputClass} mt-1`} name="email" type="email" autoComplete="email" required />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          {spanish ? 'Contraseña' : 'Senha'}
          <input className={`${inputClass} mt-1`} name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className={buttonClass} disabled={loading} type="submit">
          {loading ? (spanish ? 'Ingresando...' : 'Entrando...') : (spanish ? 'Ingresar' : 'Entrar')}
        </button>
      </form>
      <div className="mt-5 space-y-2 text-center text-sm">
        <Link className="font-medium text-[#003570] hover:underline" href="/recuperar-senha">
          {spanish ? 'Olvidé mi contraseña' : 'Esqueci minha senha'}
        </Link>
        <p className="text-slate-600">
          {spanish ? '¿Aún no tienes una cuenta?' : 'Ainda não possui conta?'}{' '}
          <Link className="font-semibold text-orange-600 hover:underline" href={`/candidato/cadastro?redirect=${encodeURIComponent(returnPath)}`}>
            {spanish ? 'Crear cuenta' : 'Criar conta'}
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
