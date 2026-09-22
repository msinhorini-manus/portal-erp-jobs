'use client'

import { useState } from 'react'

import { candidateFetch, candidatePath } from '@/lib/candidate-client'

export function ApplyButton({ jobId }: { jobId: number }) {
  const [applied, setApplied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleApply = async () => {
    setLoading(true)
    setError('')
    try {
      await candidateFetch(candidatePath('applications'), {
        method: 'POST',
        body: JSON.stringify({ job_id: jobId }),
      })
      setApplied(true)
    } catch (reason) {
      const status = (reason as { status?: number }).status
      if (status === 401 || status === 403) {
        window.location.href = `/candidato/login?redirect=${encodeURIComponent(`/vagas/${jobId}`)}`
        return
      }
      if (status === 409) {
        setApplied(true)
        return
      }
      setError(reason instanceof Error ? reason.message : 'Não foi possível enviar a candidatura.')
    } finally {
      setLoading(false)
    }
  }

  if (applied) {
    return (
      <button
        disabled
        className="w-full cursor-default rounded-lg bg-green-500 py-3 font-medium text-white"
      >
        Candidatado
      </button>
    )
  }

  return (
    <div>
      <button
        onClick={handleApply}
        disabled={loading}
        className="w-full rounded-lg bg-portal-orange py-3 font-bold text-white transition-colors hover:bg-portal-orange-dark disabled:opacity-50"
      >
        {loading ? 'Enviando...' : 'Candidatar-se'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
    </div>
  )
}
