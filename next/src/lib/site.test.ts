import { describe, expect, it } from 'vitest'

import {
  formatCurrency,
  getSelectableSites,
  openGraphLocale,
  requireCanonicalOrigin,
  type RegionalSite,
} from './site'

const brazil: RegionalSite = {
  code: 'BR',
  name: 'Brasil',
  country_code: 'BR',
  locale: 'pt-BR',
  currency_code: 'BRL',
  timezone: 'America/Sao_Paulo',
  canonical_origin: 'https://jobs.portalerp.com.br',
  is_active: true,
}

const mexico: RegionalSite = {
  code: 'MX',
  name: 'México',
  country_code: 'MX',
  locale: 'es-MX',
  currency_code: 'MXN',
  timezone: 'America/Mexico_City',
  canonical_origin: null,
  is_active: false,
}

describe('regional site contract', () => {
  it('exposes Brazil and hides inactive Mexico from the selector', () => {
    expect(getSelectableSites([mexico, brazil])).toEqual([brazil])
  })

  it('preserves the canonical Brazilian origin', () => {
    expect(requireCanonicalOrigin(brazil)).toBe('https://jobs.portalerp.com.br')
  })

  it('refuses to route an inactive regional site', () => {
    expect(() => requireCanonicalOrigin(mexico)).toThrow(/not publicly routable/)
  })

  it('derives locale-specific metadata and currency formatting', () => {
    expect(openGraphLocale(brazil)).toBe('pt_BR')
    expect(openGraphLocale(mexico)).toBe('es_MX')
    expect(formatCurrency(5000, brazil).replace(/\u00a0/g, ' ')).toContain('R$')
    expect(formatCurrency(5000, mexico).replace(/\u00a0/g, ' ')).toContain('$')
  })
})
