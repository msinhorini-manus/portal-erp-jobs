import { describe, expect, it } from 'vitest'
import { employerInitials, safeEmployerLogo } from './employer-logo'

describe('public employer logo source', () => {
  it('accepts public HTTPS and local media paths', () => {
    expect(safeEmployerLogo('https://cdn.example.invalid/logo.png')).toBe('https://cdn.example.invalid/logo.png')
    expect(safeEmployerLogo('/uploads/company/logo.png')).toBe('/uploads/company/logo.png')
    expect(safeEmployerLogo('/brand/company.svg')).toBe('/brand/company.svg')
  })
  it('rejects script/data/protocol-relative/credentialed and insecure sources', () => {
    for (const value of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', '//evil.invalid/a.png', 'https://user:pass@evil.invalid/a.png', 'http://example.invalid/logo.png', '/admin/users', '/uploads\\evil.png', '\n', 'https://x.invalid/\nlogo.png']) {
      expect(safeEmployerLogo(value), value).toBeNull()
    }
  })
  it('handles missing and oversized values', () => {
    expect(safeEmployerLogo(null)).toBeNull()
    expect(safeEmployerLogo(undefined)).toBeNull()
    expect(safeEmployerLogo('x'.repeat(2049))).toBeNull()
  })
})

describe('employer fallback initials', () => {
  it('preserves short acronym prefixes and handles names without logos', () => {
    expect(employerInitials('LG lugar de gente')).toBe('LG')
    expect(employerInitials('VTEX')).toBe('VT')
    expect(employerInitials('Portal ERP')).toBe('PE')
    expect(employerInitials('Órbita')).toBe('ÓR')
    expect(employerInitials('')).toBe('EM')
    expect(employerInitials(null)).toBe('EM')
  })
})
