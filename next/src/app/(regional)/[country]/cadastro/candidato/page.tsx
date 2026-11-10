import { regionalRedirect } from '@/lib/regional-redirect.server'

export default async function CandidateRegisterAliasPage() {
  await regionalRedirect('/candidato/cadastro')
}
