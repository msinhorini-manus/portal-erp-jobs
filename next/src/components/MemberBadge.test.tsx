import React from 'react'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.stubGlobal('React', React)
import { MemberBadge } from './MemberBadge'

const label = 'Membro Ecossistema Portal ERP'

describe('public member mention', () => {
  it.each([false, undefined, null, 'true', 'false', 1, 0, {}, []])('does not render a false, missing or truthy nonboolean flag: %j', isMember => {
    expect(renderToStaticMarkup(<MemberBadge isMember={isMember} />)).toBe('')
    expect(renderToStaticMarkup(<MemberBadge isMember={isMember} variant="card" />)).toBe('')
  })

  it('renders the complete accessible text once with wrapping and no truncation', () => {
    for (const variant of ['card', 'inline'] as const) {
      const html = renderToStaticMarkup(<MemberBadge isMember={true} variant={variant} />)
      expect(html.match(/Membro Ecossistema Portal ERP/g)).toHaveLength(1)
      expect(html).toContain(label)
      for (const className of ['min-w-0', 'max-w-full', 'whitespace-normal', 'break-words']) expect(html).toContain(className)
      for (const text of ['aria-hidden', 'truncate', 'line-clamp', 'whitespace-nowrap', 'bg-teal', 'bg-talent-teal']) expect(html).not.toContain(text)
    }
  })

  it('uses the exact current Navbar navy background token, not bright teal', () => {
    const navbarSource = readFileSync(new URL('./layout/Navbar.tsx', import.meta.url), 'utf8')
    const themeSource = readFileSync(new URL('../../tailwind.config.ts', import.meta.url), 'utf8')
    const navbarBackground = navbarSource.match(/<header className="[^"]*\b(bg-portal-dark)\b/)?.[1]
    expect(navbarBackground).toBe('bg-portal-dark')
    expect(themeSource).toMatch(/'portal-dark':\s*'#0F2530'/)
    const html = renderToStaticMarkup(<MemberBadge isMember={true} variant="card" />)
    expect(html).toContain(navbarBackground!)
    expect(html).toContain('text-white')
  })

  it('keeps the company-header variant a discreet inline mention without a tab or frame', () => {
    const html = renderToStaticMarkup(<MemberBadge isMember={true} />)
    expect(html).toContain('data-member-badge="inline"')
    expect(html).toContain('text-white/80')
    for (const text of ['bg-portal-dark', 'border', 'rounded', 'role="tab"']) expect(html).not.toContain(text)
  })
})
