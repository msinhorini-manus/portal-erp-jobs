import { companyFetch, companyPath, type CompanyPermissions, type CompanyProfile, type CompanyRole } from './company-client'

export const COMPANY_LOGO_MAX_BYTES = 2 * 1024 * 1024
export const COMPANY_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const COMPANY_LOGO_ACCEPT = COMPANY_LOGO_TYPES.join(',')
export const COMPANY_LOGO_RETRY_NOTICE = 'Sua conta foi criada, mas o logo não foi enviado. Não é necessário cadastrar novamente. Envie o logo pelo perfil da empresa.'

export type CompanyLogoResponse = {
  logo_url: string | null
  company: CompanyProfile
  message?: string
}

export function companyLogoFileError(file: { size: number; type: string }): string | null {
  if (!COMPANY_LOGO_TYPES.some(type => type === file.type)) return 'Selecione um logo em PNG, JPEG ou WebP.'
  if (!file.size) return 'O arquivo do logo está vazio.'
  if (file.size > COMPANY_LOGO_MAX_BYTES) return 'O logo deve ter até 2 MB.'
  return null
}

export function canManageCompanyLogo(role?: CompanyRole, permissions?: Pick<CompanyPermissions, 'manage_company'>): boolean {
  return (role === 'owner' || role === 'admin') && permissions?.manage_company !== false
}

function logoOperationError(reason: unknown): Error {
  const status = (reason as { status?: number } | null)?.status
  const message = status === 401 ? 'Sua sessão expirou. Faça login novamente para alterar o logo.'
    : status === 403 ? 'Não foi possível autorizar a alteração do logo. Atualize a página ou verifique sua permissão.'
    : status === 413 ? 'O logo deve ter até 2 MB.'
    : status === 400 || status === 415 ? 'Não foi possível validar o logo. Selecione um arquivo PNG, JPEG ou WebP de até 2 MB.'
    : 'Não foi possível alterar o logo. Tente novamente pelo perfil da empresa.'
  return Object.assign(new Error(message), { status })
}

export async function uploadCompanyLogo(file: File): Promise<CompanyLogoResponse> {
  const error = companyLogoFileError(file)
  if (error) throw new Error(error)
  const form = new FormData()
  // Do not propagate a potentially identifying local filename.
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : 'png'
  form.append('logo', file, `logo.${extension}`)
  try {
    return await companyFetch<CompanyLogoResponse>(companyPath('profile/logo'), { method: 'POST', body: form })
  } catch (reason) { throw logoOperationError(reason) }
}

export async function removeCompanyLogo(): Promise<CompanyLogoResponse> {
  try {
    return await companyFetch<CompanyLogoResponse>(companyPath('profile/logo'), { method: 'DELETE' })
  } catch (reason) { throw logoOperationError(reason) }
}
