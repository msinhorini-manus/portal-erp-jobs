'use client'

import { useState } from 'react'
import Link from 'next/link'

export function ApplyButton({ jobId }: { jobId: number }) {
  const [applied, setApplied] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleApply = async () => {
    // Check if user is logged in
    const token = typeof window !== 'undefined' ? localStorage.getItem('candidateToken') : null

    if (!token) {
      // Redirect to login
      window.location.href = `/candidato/login?redirect=/vagas/${jobId}`
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/applications/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ job_id: jobId }),
      })

      if (res.ok || res.status === 409) {
        setApplied(true)
      }
    } catch (e) {
      console.error('Failed to apply:', e)
    } finally {
      setLoading(false)
    }
  }

  if (applied) {
    return (
      <button
        disabled
        className="w-full bg-green-500 text-white py-3 rounded-lg font-medium cursor-default"
      >
        ✓ Candidatado
      </button>
    )
  }

  return (
    <button
      onClick={handleApply}
      disabled={loading}
      className="w-full bg-portal-orange hover:bg-portal-orange-dark text-white py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
    >
      {loading ? 'Enviando...' : 'Candidatar-se'}
    </button>
  )
}
