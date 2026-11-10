import { regionalRedirect } from '@/lib/regional-redirect.server'
export default async function LegacyRedirect() { await regionalRedirect('/empresa/cadastro') }
