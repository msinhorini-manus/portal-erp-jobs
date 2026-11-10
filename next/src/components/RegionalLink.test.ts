import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ link: vi.fn(), params: vi.fn() }))
vi.mock('next/navigation', () => ({ useParams: mocks.params }))
vi.mock('next/link', () => ({ default: mocks.link }))
import RegionalLink from './RegionalLink'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.params.mockReturnValue({ country: 'br' })
  mocks.link.mockImplementation(({ href, children }: { href: string; children: string }) => createElement('a', { href }, children))
})
describe('legacy resume SPA document bridge', () => {
  it('renders a real anchor to the unchanged /br URL, never a Next Link/prefetch', () => {
    const html = renderToStaticMarkup(createElement(RegionalLink, { href: '/candidato/curriculo', children: 'Editar currículo' }))
    expect(html).toBe('<a href="/br/candidato/curriculo">Editar currículo</a>')
    expect(mocks.link).not.toHaveBeenCalled()
  })
  it('retains query/hash on an already regional bridge URL', () => {
    const html = renderToStaticMarkup(createElement(RegionalLink, { href: '/br/candidato/curriculo?view=edit#skills', children: 'Editar' }))
    expect(html).toContain('href="/br/candidato/curriculo?view=edit#skills"')
    expect(mocks.link).not.toHaveBeenCalled()
  })
  it('continues using Next routing for native regional journeys', () => {
    const html = renderToStaticMarkup(createElement(RegionalLink, { href: '/vagas/1', children: 'Vaga' }))
    expect(html).toContain('href="/br/vagas/1"')
    expect(mocks.link).toHaveBeenCalledTimes(1)
  })
})
