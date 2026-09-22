'use client'

import type { RegionalSite } from '@/lib/site'
import { requireCanonicalOrigin } from '@/lib/site'

type Props = {
  currentSite: RegionalSite
  sites: RegionalSite[]
  compact?: boolean
}

export function SiteSelector({ currentSite, sites, compact = false }: Props) {
  function changeSite(code: string) {
    const target = sites.find((site) => site.code === code)
    if (!target || target.code === currentSite.code) return

    const origin = requireCanonicalOrigin(target)
    window.location.assign(`${origin}${window.location.pathname}${window.location.search}${window.location.hash}`)
  }

  return (
    <label className={`flex items-center gap-2 ${compact ? 'w-full' : ''}`}>
      <span className="sr-only">País</span>
      <select
        aria-label="País"
        value={currentSite.code}
        onChange={(event) => changeSite(event.target.value)}
        disabled={sites.length <= 1}
        className={`rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white outline-none transition-colors focus:border-portal-orange ${compact ? 'w-full' : ''} disabled:cursor-default disabled:opacity-80`}
      >
        {sites.map((site) => (
          <option key={site.code} value={site.code} className="text-gray-900">
            {site.name}
          </option>
        ))}
      </select>
    </label>
  )
}
