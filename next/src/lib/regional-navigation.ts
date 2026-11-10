'use client'
import { useMemo } from 'react'
import { useParams, useRouter as useNextRouter } from 'next/navigation'
import { countryPrefix, regionalizePath } from './regional-routes'
export function useRouter() {
  const router = useNextRouter()
  const params = useParams<{ country: string }>()
  const prefix = countryPrefix(params.country)
  return useMemo(() => ({
    ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(regionalizePath(prefix, href), options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(regionalizePath(prefix, href), options),
    prefetch: (href: string, options?: Parameters<typeof router.prefetch>[1]) => router.prefetch(regionalizePath(prefix, href), options),
  }), [router, prefix])
}
