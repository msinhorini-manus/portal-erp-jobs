import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getSiteContext: vi.fn(), getJobById: vi.fn(), notFound: vi.fn(() => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404') }) }))
vi.stubGlobal('React', React)
vi.mock('@/lib/site-resolver.server', () => ({ getSiteContext: mocks.getSiteContext }))
vi.mock('@/lib/api', () => ({ getJobById: mocks.getJobById }))
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }))
vi.mock('@/components/RegionalLink', () => ({ default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => React.createElement('a', { href, className }, children) }))
import JobDetailPage, { generateMetadata } from './JobDetailPage.server'
import { EmployerLogo } from './EmployerLogo'
import { ApplyButton } from './ApplyButton'
import type { RegionalSite } from '@/lib/site'
const site: RegionalSite = { id: 1, code: 'BR', name: 'Brasil', country_code: 'BR', locale: 'pt-BR', currency_code: 'BRL', timezone: 'America/Sao_Paulo', canonical_origin: 'https://jobs.portalerp.com', url_prefix: '/br', is_active: true }
const job = {
  id: 18, site_id: 1, site_code: 'BR', title: 'Consultor de Implantação ERP com título longo e todas as palavras cadastradas',
  company_id: 45, company_name: 'Empresa real', company_profile_slug: 'empresa-real',
  public_company_slug: 'marca-original', public_title_slug: 'titulo-original', is_active: true, status: 'active',
  description: 'Descrição integral.\n\nSegundo parágrafo completo, sem qualquer resumo; toda a oportunidade.\nÚltimo parágrafo cadastrado.',
  responsibilities: '• Responsabilidade um\n• Responsabilidade dois\n• Responsabilidade três\n• Responsabilidade quatro\n• Responsabilidade cinco',
  requirements: '- Requisito um\n- Requisito dois\n- Requisito três\n- Requisito quatro\n- Requisito cinco',
  benefits: '• Benefício real um\n• Benefício real dois\n• Benefício real três\n• Benefício real quatro\n• Benefício real cinco',
  technologies: ['ERP completo', 'SQL'], skills: ['ERP completo', 'SQL'],
  contract_type: 'clt', work_modality: 'hybrid', seniority_level: 'senior', location: 'São Paulo, SP', city: 'São Paulo', state: 'SP', country: 'BR', area: 'Consultoria & ERP',
  created_at: '2026-11-01', expires_at: '2099-12-01',
  company: { id: 45, public_profile_slug: 'empresa-real', company_name: 'Empresa real', description: 'Descrição da empresa cadastrada.\n\nÚltimo detalhe integral da empresa.', logo_url: '/uploads/company-real.png', website: 'https://empresa-real.invalid' },
}
const params = (changes = {}) => Promise.resolve({ country: 'br', collection: 'vagas', companySlug: 'marca-original', titleSlug: 'titulo-original', id: '18', ...changes })
const jobPath = '/br/vagas/marca-original/titulo-original/18'
const canonical = `https://jobs.portalerp.com${jobPath}`
function schemaFrom(html: string) {
  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]
  expect(json).toBeDefined()
  return JSON.parse(json!)
}
function elements(node: React.ReactNode): React.ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!React.isValidElement<Record<string, unknown>>(node)) return []
  return [node, ...elements(node.props.children as React.ReactNode)]
}
beforeEach(() => { vi.clearAllMocks(); mocks.getSiteContext.mockResolvedValue({ site, locale: site.locale }); mocks.getJobById.mockResolvedValue(job) })

describe('approved job detail presentation without changing the application flow', () => {
  it('renders complete registered descriptions, responsibilities, requirements, benefits and technologies', async () => {
    const html = renderToStaticMarkup(await JobDetailPage({ params: params() }))
    for (const heading of ['Sobre a oportunidade', 'O que você vai fazer', 'O que buscamos', 'Benefícios', 'Tecnologias', 'Informações da vaga', 'Sobre a empresa']) expect(html).toContain(heading)
    expect(html).toContain(job.description)
    expect(html).toContain(job.company.description)
    expect(html).toContain(job.title)
    for (const group of ['Responsabilidade', 'Requisito', 'Benefício real']) {
      for (const item of ['um', 'dois', 'três', 'quatro', 'cinco']) expect(html).toContain(`${group} ${item}`)
    }
    expect(html).toContain('ERP completo')
    expect(html).not.toContain('Wellhub')
    expect(html).not.toContain('Plano de saúde')
    expect(mocks.getJobById).toHaveBeenCalledWith('18', expect.objectContaining({ country: 'br', cache: 'no-store' }))
  })
  it.each([null, '', '  \n '])('omits unfilled responsibilities without extracting or duplicating the description: %s', async responsibilities => {
    mocks.getJobById.mockResolvedValue({ ...job, responsibilities })
    const html = renderToStaticMarkup(await JobDetailPage({ params: params() }))
    expect(html).not.toContain('O que você vai fazer')
    // The description appears once as visible text; schema contains its JSON-escaped version.
    expect(html.split(job.description)).toHaveLength(2)
    expect(html).toContain(job.description)
  })
  it('keeps free-text benefits complete without semantic splitting or invented chips', async () => {
    const benefits = 'Auxílio real, após seis meses; consulte todas as condições.\n\n    Últimas condições cadastradas.'
    mocks.getJobById.mockResolvedValue({ ...job, benefits })
    const html = renderToStaticMarkup(await JobDetailPage({ params: params() }))
    const section = html.match(/<section[^>]*aria-labelledby="job-benefits"[^>]*>([\s\S]*?)<\/section>/)?.[1]
    expect(section).toContain(benefits)
    expect(section).not.toContain('<li')
  })
  it('uses the existing ApplyButton and only regional auth links with the complete encoded return path', async () => {
    const tree = await JobDetailPage({ params: params() })
    const buttons = elements(tree).filter(element => element.type === ApplyButton)
    expect(buttons).toHaveLength(1)
    expect(buttons[0].props).toEqual({ jobId: 18, jobPath })
    const html = renderToStaticMarkup(tree)
    expect(html).toContain('Candidatar-se')
    expect(html).toContain('Entre ou crie sua conta para se candidatar.')
    expect(html).toContain(`href="/br/candidato/login?redirect=${encodeURIComponent(jobPath)}"`)
    expect(html).toContain(`href="/br/candidato/cadastro?redirect=${encodeURIComponent(jobPath)}"`)
    expect(html).toContain('href="/br/vagas"')
    expect(html).not.toMatch(/href="https?:/)
    expect(html).not.toContain('href="https://empresa-real.invalid"')
    expect(html).not.toContain('/empresas/empresa-real/45')
  })
  it('uses sanitized logo props at hero and sidebar sizes and the nested real description', async () => {
    const tree = await JobDetailPage({ params: params() })
    const logos = elements(tree).filter(element => element.type === EmployerLogo)
    expect(logos.map(element => element.props)).toEqual([
      { name: 'Empresa real', src: '/uploads/company-real.png', hidden: false, size: 'hero' },
      { name: 'Empresa real', src: '/uploads/company-real.png', hidden: false, size: 'sidebar' },
    ])
    const html = renderToStaticMarkup(tree)
    expect(html).toContain('h-20 w-20')
    expect(html).toContain('sm:h-24 sm:w-24')
    expect(html).toContain('grid-cols-1')
    expect(html).toContain('minmax(0,2fr)')
    expect(html).toContain('break-words font-display')
    expect(html).toContain(job.company.description)
  })
  it('supports optional company_logo_url when nested logo is absent, without a fabricated company tagline', async () => {
    mocks.getJobById.mockResolvedValue({ ...job, company_logo_url: '/uploads/fallback-real.png', company: { ...job.company, logo_url: null, description: null } })
    const tree = await JobDetailPage({ params: params() })
    const logos = elements(tree).filter(element => element.type === EmployerLogo)
    expect(logos.every(element => element.props.src === '/uploads/fallback-real.png')).toBe(true)
    const html = renderToStaticMarkup(tree)
    expect(html).not.toContain('Tecnologia para gestão de pessoas')
    expect(html).not.toContain(job.company.description)
  })
  it('preserves canonical, OG, directApply and JobPosting full content/location/profile identity', async () => {
    const metadata = await generateMetadata({ params: params() })
    expect(metadata.alternates?.canonical).toBe(canonical)
    expect(metadata.openGraph).toMatchObject({ type: 'article', url: canonical, locale: 'pt_BR' })
    const schema = schemaFrom(renderToStaticMarkup(await JobDetailPage({ params: params() })))
    expect(schema).toMatchObject({ '@type': 'JobPosting', directApply: true, url: canonical, datePosted: job.created_at, validThrough: job.expires_at, employmentType: 'FULL_TIME' })
    expect(schema.description).toBe(`${job.description}\n\nRequisitos: ${job.requirements}\n\nResponsabilidades: ${job.responsibilities}`)
    expect(schema.hiringOrganization).toMatchObject({ '@id': 'https://jobs.portalerp.com/br/empresas/empresa-real#organization', url: 'https://jobs.portalerp.com/br/empresas/empresa-real', name: 'Empresa real', logo: job.company.logo_url })
    expect(schema.jobLocation.address).toMatchObject({ addressLocality: 'São Paulo', addressRegion: 'SP', addressCountry: 'BR' })
    expect(schema.baseSalary).toBeUndefined()
  })
  it('shows salary only from actual numeric values and keeps the existing structured salary/remote fields', async () => {
    mocks.getJobById.mockResolvedValue({ ...job, min_salary: 8000, max_salary: 11000, salary_currency: 'BRL', work_modality: 'remote' })
    const html = renderToStaticMarkup(await JobDetailPage({ params: params() }))
    expect(html).toContain('Faixa salarial')
    expect(html).toContain('8.000')
    expect(html).toContain('11.000')
    const schema = schemaFrom(html)
    expect(schema.baseSalary).toMatchObject({ currency: 'BRL', value: { minValue: 8000, maxValue: 11000, unitText: 'MONTH' } })
    expect(schema.jobLocationType).toBe('TELECOMMUTE')
    expect(schema.applicantLocationRequirements).toEqual({ '@type': 'Country', name: 'BR' })
  })
  it('does not show salary or missing benefits/technologies/description-of-company data', async () => {
    mocks.getJobById.mockResolvedValue({ ...job, salary: 'A combinar', benefits: null, technologies: [], company: { ...job.company, description: null } })
    const html = renderToStaticMarkup(await JobDetailPage({ params: params() }))
    expect(html).not.toContain('Faixa salarial')
    expect(html).not.toContain('A combinar')
    expect(html).not.toContain('job-benefits')
    expect(html).not.toContain('job-technologies')
    expect(html).not.toContain('Tecnologia para gestão')
  })
  it('prevents confidential names, logos, description, website and profile slugs in HTML, schema, metadata and client props', async () => {
    mocks.getJobById.mockResolvedValue({ ...job, is_company_hidden: true, company_name: 'Nome confidencial secreto', company_description: 'Descrição confidencial legada', company_logo_url: 'https://secret.invalid/flat-logo.png', company_website: 'https://secret.invalid/flat-website', company_profile_slug: 'perfil-secreto', public_company_slug: 'marca-secreta', company: { ...job.company, company_name: 'Nome nested secreto', name: 'Outro nome secreto', description: 'Descrição nested secreta', logo_url: 'https://secret.invalid/nested-logo.png', website: 'https://secret.invalid', public_profile_slug: 'perfil-nested-secreto' } })
    const hiddenParams = () => params({ companySlug: 'empresa-confidencial' })
    const metadata = await generateMetadata({ params: hiddenParams() })
    const tree = await JobDetailPage({ params: hiddenParams() })
    const html = renderToStaticMarkup(tree)
    expect(html).toContain('Empresa Confidencial')
    expect(html).not.toMatch(/secret|secreto|secreta|confidencial legada/)
    expect(JSON.stringify(metadata)).not.toMatch(/secret|secreto|secreta/)
    expect(html).not.toContain('/empresas/')
    expect(html).not.toContain('Sobre a empresa')
    expect(elements(tree).filter(element => element.type === EmployerLogo).map(element => element.props)).toEqual([{ name: 'Empresa Confidencial', src: null, hidden: true, size: 'hero' }])
    expect(elements(tree).filter(element => element.type === ApplyButton)[0].props).toEqual({ jobId: 18, jobPath: '/br/vagas/empresa-confidencial/titulo-original/18' })
    const schema = schemaFrom(html)
    expect(schema.hiringOrganization).toEqual({ '@type': 'Organization', name: 'Empresa Confidencial' })
    expect(schema.directApply).toBe(true)
    expect(metadata.alternates?.canonical).toBe('https://jobs.portalerp.com/br/vagas/empresa-confidencial/titulo-original/18')
    // User-provided job text remains complete; confidentiality concerns organization fields.
    expect(html).toContain(job.description)
    expect(html).toContain('Responsabilidade cinco')
  })
  it('escapes editorial markup and safely serializes the JobPosting script', async () => {
    mocks.getJobById.mockResolvedValue({ ...job, description: 'Texto </script><img src=x onerror=alert(1)> integral' })
    const html = renderToStaticMarkup(await JobDetailPage({ params: params() }))
    expect(html).toContain('&lt;/script&gt;&lt;img')
    expect(html).toContain('\\u003c/script>')
    expect(html).not.toContain('<img src=x')
    expect(schemaFrom(html).description).toContain('Texto </script><img src=x onerror=alert(1)> integral')
  })
})
