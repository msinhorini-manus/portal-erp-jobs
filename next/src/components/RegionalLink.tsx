'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { countryPrefix, regionalizePath } from '@/lib/regional-routes'
import type { ComponentProps } from 'react'

export default function RegionalLink(props: ComponentProps<typeof Link>) {
  const params = useParams<{ country?: string }>()
  const prefix = countryPrefix(params.country || '')
  const href = typeof props.href === 'string' ? regionalizePath(prefix, props.href) : {
    ...props.href,
    pathname: props.href.pathname ? regionalizePath(prefix, props.href.pathname) : props.href.pathname,
  }
  // This document belongs to the legacy SPA behind Nginx, not the Next router.
  // A plain anchor prevents RSC prefetch/soft navigation while preserving /br.
  if (typeof href === 'string' && href.split(/[?#]/)[0] === `${prefix}/candidato/curriculo`) {
    return <a {...props} href={href} />
  }
  return <Link {...props} href={href} />
}
