import { redirect } from 'next/navigation'
import { countryPrefix, defaultCountry } from '@/lib/regional-routes'
export const dynamic = 'force-dynamic'
export default function GlobalHome() { redirect(countryPrefix(defaultCountry())) }
