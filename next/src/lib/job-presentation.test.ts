import { describe, expect, it } from 'vitest'
import { hasJobText, jobBulletItems, jobCandidateLinks, jobDisplayDescription, jobEmployer, sanitizeJobCompany } from './job-presentation'

const confidentialJob = {
  id: 18,
  title: 'Consultor ERP',
  description: 'Texto completo da oportunidade.',
  requirements: 'Todos os requisitos.',
  responsibilities: 'Todas as responsabilidades.',
  benefits: 'Todos os benefícios.',
  is_company_hidden: true,
  company_name: 'Nome secreto',
  company_id: 45,
  company_profile_slug: 'perfil-secreto',
  public_company_slug: 'marca-secreta',
  company_logo_url: 'https://secret.invalid/flat-logo.png',
  company_description: 'Descrição secreta legada',
  company_website: 'https://secret.invalid/flat-site',
  company: { company_name: 'Nome secreto nested', logo_url: 'https://secret.invalid/logo.png', description: 'Descrição secreta nested', website: 'https://secret.invalid' },
}

describe('job presentation confidentiality boundary', () => {
  it('redacts all known organization identity fields without mutating the DTO or job text', () => {
    const sanitized = sanitizeJobCompany(confidentialJob)
    expect(sanitized).toMatchObject({ company_name: 'Empresa Confidencial', company: null, company_id: null, company_logo_url: null, company_description: null, company_website: null, company_profile_slug: null, public_company_slug: 'empresa-confidencial' })
    expect(JSON.stringify(sanitized)).not.toMatch(/secret|secreto|secreta/)
    expect(sanitized.description).toBe(confidentialJob.description)
    expect(sanitized.requirements).toBe(confidentialJob.requirements)
    expect(sanitized.responsibilities).toBe(confidentialJob.responsibilities)
    expect(sanitized.benefits).toBe(confidentialJob.benefits)
    expect(confidentialJob.company_name).toBe('Nome secreto')
    expect(confidentialJob.company).not.toBeNull()
  })
  it('never projects hidden identity even from a raw unsanitized DTO', () => {
    expect(jobEmployer(confidentialJob)).toEqual({ name: 'Empresa Confidencial', logo: null, description: null, hidden: true })
  })
  it('retains visible DTOs and prioritizes real nested company content', () => {
    const visible = { ...confidentialJob, is_company_hidden: false }
    expect(sanitizeJobCompany(visible)).toBe(visible)
    expect(jobEmployer(visible)).toMatchObject({ name: 'Nome secreto', logo: visible.company.logo_url, description: visible.company.description, hidden: false })
  })
  it('supports the optional flat logo and legacy description without adding a tagline', () => {
    expect(jobEmployer({ company_name: 'ERP', company_logo_url: '/uploads/logo.png' })).toEqual({ name: 'ERP', logo: '/uploads/logo.png', description: null, hidden: false })
    expect(jobEmployer({ company_description: 'Descrição legada real' }).description).toBe('Descrição legada real')
    expect(jobEmployer({ company: { description: '' }, company_description: 'Legada' }).description).toBe('')
  })
})

describe('explicit bullet lists without semantic rewriting', () => {
  it('keeps every item beyond three with punctuation and original order', () => {
    const text = '• Primeiro: ERP\n• Segundo; dados\n• Terceiro, projetos\n• Quarto benefício\n• Quinto requisito\n• Sexto item completo'
    expect(jobBulletItems(text)).toEqual(['Primeiro: ERP', 'Segundo; dados', 'Terceiro, projetos', 'Quarto benefício', 'Quinto requisito', 'Sexto item completo'])
  })
  it.each(['-', '*', '+', '•', '●', '▪', '‣'])('recognizes existing bullet marker %s', marker => {
    expect(jobBulletItems(`  ${marker} Item 1\r\n\r\n${marker} Item 2`)).toEqual(['Item 1', 'Item 2'])
  })
  it.each([
    'Plano de saúde, vale-refeição; seguro de vida.\nTexto livre com todos os detalhes.',
    'Benefícios:\n• Plano de saúde\n• Vale-refeição',
    '• Primeiro item\n  continuação explicativa\n• Segundo item',
    '1. Primeiro requisito\n2. Segundo requisito',
    '•', '•Item sem separador',
  ])('conservatively leaves prose, mixed text and continuations intact: %s', text => {
    expect(jobBulletItems(text)).toBeNull()
  })
  it.each([undefined, null, '', ' \n\t '])('treats missing or blank fields as empty: %s', text => {
    expect(hasJobText(text)).toBe(false)
    expect(jobBulletItems(text)).toBeNull()
  })
})

describe('regional candidate return paths', () => {
  it.each(['/br', '/mx', '/us'])('keeps login and register in %s and encodes the complete friendly job return URL', prefix => {
    const jobPath = `${prefix}/vagas/empresa/titulo/18`
    const links = jobCandidateLinks(prefix, jobPath)
    expect(links.login).toBe(`${prefix}/candidato/login?redirect=${encodeURIComponent(jobPath)}`)
    expect(links.register).toBe(`${prefix}/candidato/cadastro?redirect=${encodeURIComponent(jobPath)}`)
    expect(decodeURIComponent(links.login.split('redirect=')[1])).toBe(jobPath)
  })
  it.each(['https://external.invalid', '//external.invalid', '/mx/vagas/e/t/1', '/br/vagas/e/t/1?redirect=https://external.invalid', '/br/vagas/e/t/1#fragment'])('rejects external, cross-region or non-detail return paths: %s', path => {
    expect(() => jobCandidateLinks('/br', path)).toThrow()
  })
})

describe('internal application presentation', () => {
  it('removes only an explicit standalone external application footer', () => {
    const original = 'Sobre a função.\n\n• Executar implantação completa.\n• Acompanhar clientes.\n\nCandidatura: https://carreiras.example.invalid/jobs/real\n'
    const display = jobDisplayDescription(original)
    expect(display).toContain('Sobre a função.')
    expect(display).toContain('• Executar implantação completa.')
    expect(display).toContain('• Acompanhar clientes.')
    expect(display).not.toContain('carreiras.example.invalid')
    expect(original).toContain('Candidatura: https://carreiras.example.invalid/jobs/real')
  })
  it('preserves informative URLs, prose and internal Jobs application links', () => {
    const text = 'Conheça a empresa: https://empresa.example.invalid\nProcesso de candidatura: entrevista com a equipe.\nCandidatura: https://jobs.portalerp.com/br/vagas/marca/cargo/1\n'
    expect(jobDisplayDescription(text)).toBe(text)
  })
  it('preserves all text verbatim when no standalone instruction exists', () => {
    const text = 'Descrição integral.\r\nRequisito A.\r\n\r\nRequisito B.'
    expect(jobDisplayDescription(text)).toBe(text)
    expect(jobDisplayDescription(null)).toBe('')
  })
})
