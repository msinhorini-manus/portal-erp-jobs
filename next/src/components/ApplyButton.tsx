'use client'
import { browserRegionalPath } from '@/lib/regional-routes'

import { useState } from 'react'

import { candidateFetch, candidatePath } from '@/lib/candidate-client'

export function ApplyButton({ jobId, jobPath }: { jobId: number; jobPath: string }) {
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
        window.location.href = browserRegionalPath(`/candidato/login?redirect=${encodeURIComponent(browserRegionalPath(jobPath))}`)
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
