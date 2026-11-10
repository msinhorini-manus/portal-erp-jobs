import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.stubGlobal('React', React)
vi.mock('@/components/RegionalLink', () => ({
  default: ({ children }: { children: React.ReactNode }) => React.createElement('a', null, children),
}))
vi.mock('@/components/layout/BrandLockup', () => ({ BrandLockup: () => null }))

import { AuthShell } from './AuthShell'

describe('authentication hydration boundary', () => {
  it('disables all authentication controls in SSR until client hydration', () => {
    const children = React.createElement('form', null,
      React.createElement('input', { name: 'email', type: 'email' }),
      React.createElement('input', { name: 'password', type: 'password' }),
      React.createElement('button', { type: 'submit' }, 'Entrar'))
    const html = renderToStaticMarkup(React.createElement(AuthShell, {
      title: 'Acesso', description: 'Teste', children,
    }))
    expect(html).toMatch(/<fieldset[^>]*disabled=""[^>]*aria-busy="true"/)
    expect(html.indexOf('<fieldset')).toBeLessThan(html.indexOf('name="password"'))
    expect(html.indexOf('</fieldset>')).toBeGreaterThan(html.indexOf('type="submit"'))
  })
})
