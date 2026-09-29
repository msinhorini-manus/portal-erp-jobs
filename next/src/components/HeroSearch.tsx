'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Search } from 'lucide-react'

export function HeroSearch() {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const router = useRouter()

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (location.trim()) params.set('location', location.trim())
    router.push(`/vagas?${params.toString()}`)
  }

  return (
    <form
      onSubmit={handleSearch}
      className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_38px_rgba(15,37,48,0.12)] sm:grid-cols-[1fr_0.8fr_auto]"
      aria-label="Buscar vagas"
    >
      <label className="relative flex min-w-0 items-center">
        <span className="sr-only">Cargo, tecnologia ou empresa</span>
        <Search className="pointer-events-none absolute left-3 h-5 w-5 text-slate-400" />
        <input
          type="search"
          placeholder="Cargo, tecnologia ou empresa"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-12 w-full rounded-xl border-0 bg-transparent pl-10 pr-3 text-slate-950 outline-none placeholder:text-slate-400 focus:bg-slate-50 focus:ring-2 focus:ring-portal-orange/30"
        />
      </label>
      <label className="relative flex min-w-0 items-center border-t border-slate-100 sm:border-l sm:border-t-0">
        <span className="sr-only">Cidade ou estado</span>
        <MapPin className="pointer-events-none absolute left-3 h-5 w-5 text-slate-400" />
        <input
          type="search"
          placeholder="Cidade ou estado"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className="min-h-12 w-full rounded-xl border-0 bg-transparent pl-10 pr-3 text-slate-950 outline-none placeholder:text-slate-400 focus:bg-slate-50 focus:ring-2 focus:ring-portal-orange/30"
        />
      </label>
      <button
        type="submit"
        className="min-h-12 rounded-xl bg-portal-orange px-6 font-bold text-white transition hover:bg-portal-orange-dark focus:outline-none focus:ring-2 focus:ring-portal-orange/40"
      >
        Buscar vagas
      </button>
    </form>
  )
}
