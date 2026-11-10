import { regionalRedirect } from '@/lib/regional-redirect.server'

export default async function LoginAliasPage() {
  await regionalRedirect('/candidato/login')
}
