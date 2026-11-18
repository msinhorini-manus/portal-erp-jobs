'use client'

import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { employerInitials, safeEmployerLogo } from '@/lib/employer-logo'

type Props = {
  name?: string | null
  src?: string | null
  hidden?: boolean
  size?: 'card' | 'mosaic' | 'hero' | 'sidebar' | 'profile' | 'directory'
  className?: string
}

const sizeClasses = {
  card: 'h-8 w-8 rounded-lg text-[11px]',
  mosaic: 'h-12 w-12 rounded-lg text-xs',
  hero: 'h-20 w-20 rounded-2xl text-2xl sm:h-24 sm:w-24',
  sidebar: 'h-12 w-12 rounded-xl text-sm',
  profile: 'h-16 w-16 rounded-xl text-xl',
  directory: 'h-16 w-24 rounded-xl text-xl',
}

export function EmployerLogo({ name, src, hidden = false, size = 'card', className = '' }: Props) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const safeSource = hidden ? null : safeEmployerLogo(src)
  const canShowImage = Boolean(safeSource && safeSource !== failedSource)
  const label = hidden ? 'Empresa confidencial' : name || 'Empresa'

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden border border-slate-100 bg-white font-semibold text-slate-600 ${sizeClasses[size]} ${className}`}
      data-employer-logo={hidden ? 'confidential' : canShowImage ? 'image' : 'initials'}
      role="img"
      aria-label={label}
    >
      {canShowImage ? (
        // External media is rendered in the browser, never fetched by the server.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={safeSource!}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain p-1"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSource(safeSource)}
        />
      ) : hidden ? (
        <Building2 className={size === 'hero' ? 'h-8 w-8' : 'h-4 w-4'} aria-hidden="true" />
      ) : (
        <span aria-hidden="true">{employerInitials(name)}</span>
      )}
    </span>
  )
}
