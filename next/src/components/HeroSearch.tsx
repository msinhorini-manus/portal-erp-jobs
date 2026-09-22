'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin } from 'lucide-react'

export function HeroSearch() {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (location) params.set('location', location)
    router.push(`/vagas?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 max-w-2xl mx-auto">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cargo, tecnologia ou empresa"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-portal-orange"
        />
      </div>
      <div className="flex-1 relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cidade ou estado"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-portal-orange"
        />
      </div>
      <button
        type="submit"
        className="bg-portal-orange hover:bg-portal-orange-dark text-white px-8 py-3 rounded-lg font-medium transition-colors"
      >
        Buscar vagas
      </button>
    </form>
  )
}
