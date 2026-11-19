import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
vi.stubGlobal('React', React)
import { PublicPlatformStats } from './PublicPlatformStats'
const render = (stats: unknown, locale = 'pt-BR') => renderToStaticMarkup(<PublicPlatformStats stats={stats} locale={locale} siteName="Brasil" />)

describe('public regional homepage dashboard', () => {
  it('renders three actual aggregates, country, notes and responsive layout', () => {
    const html = render({ active_jobs: 258, total_companies: 56, total_candidates: 43 })
    for (const token of ['Vagas ativas', 'Empresas cadastradas', 'Candidatos cadastrados', '>258<', '>56<', '>43<', 'Brasil', 'grid-cols-1 gap-3 sm:grid-cols-3', 'Contas ativas · somente total agregado', 'Empresas aprovadas com perfil público']) expect(html).toContain(token)
    expect(html.match(/data-platform-stat=/g)).toHaveLength(3)
    expect(html.match(/data-count-available="true"/g)).toHaveLength(3)
    expect(html).not.toContain('258+')
    expect(html).not.toContain('href="/candidatos"')
  })
  it('uses successful zero counts as zero rather than an unavailable message', () => {
    const html = render({ active_jobs: 0, total_companies: 0, total_candidates: 0 })
    expect(html.match(/>0<\/dd>/g)).toHaveLength(3)
    expect(html).not.toContain('Quantidade indisponível')
  })
  it.each([null, [], 'invalid', {}, { active_jobs: '25', total_companies: -1, total_candidates: 1.5 }])('never creates fictitious zeros for missing or invalid data: %j', stats => {
    const html = render(stats)
    expect(html.match(/Quantidade indisponível/g)).toHaveLength(3)
    expect(html.match(/data-count-available="false"/g)).toHaveLength(3)
    expect(html).not.toContain('>0</dd>')
  })
  it('retains valid aggregates when only one field is unavailable', () => {
    const html = render({ active_jobs: 10, total_companies: 5 })
    expect(html).toContain('>10</dd>')
    expect(html).toContain('>5</dd>')
    expect(html.match(/Quantidade indisponível/g)).toHaveLength(1)
  })
  it('ignores unexpected personal fields from an upstream object', () => {
    const html = render({ active_jobs: 1, total_companies: 2, total_candidates: 3, candidate_email: 'hidden@example.invalid', candidate_name: 'Private Person', candidates: [{ cv: 'Private resume' }] })
    for (const text of ['hidden@example.invalid', 'Private Person', 'Private resume', 'candidate_email']) expect(html).not.toContain(text)
  })
  it('formats aggregate numbers and uses the requested supported content language', () => {
    const en = render({ active_jobs: 1234, total_companies: 2, total_candidates: 3 }, 'en-US')
    expect(en).toContain('>1,234</dd>')
    expect(en).toContain('Registered candidates')
    const es = render(null, 'es-MX')
    expect(es).toContain('Vacantes activas')
    expect(es).toContain('Cantidad no disponible')
  })
})
