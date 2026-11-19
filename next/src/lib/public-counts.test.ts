import { describe, expect, it } from 'vitest'
import { validPublicCount, jobCountLabel, formattedPublicCount, countLabels } from './public-counts'

describe('public aggregate count labels', () => {
  it.each([0, 1, 258, 1234, Number.MAX_SAFE_INTEGER])('accepts nonnegative safe integer %s', value => {
    expect(validPublicCount(value)).toBe(true)
  })
  it.each([null, undefined, '0', '123', true, false, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, [], {}])('rejects unavailable or invalid values: %j', value => {
    expect(validPublicCount(value)).toBe(false)
    expect(formattedPublicCount(value)).toBe('—')
    expect(jobCountLabel(value)).toBe('Quantidade indisponível')
  })
  it('distinguishes zero, singular and plural in Portuguese', () => {
    expect(jobCountLabel(0)).toBe('0 vagas ativas')
    expect(jobCountLabel(1)).toBe('1 vaga ativa')
    expect(jobCountLabel(2)).toBe('2 vagas ativas')
    expect(jobCountLabel(1234)).toBe('1.234 vagas ativas')
  })
  it('prepares English and Spanish labels without enabling regional sites', () => {
    expect(jobCountLabel(0, 'en-US')).toBe('0 active jobs')
    expect(jobCountLabel(1, 'en-AU')).toBe('1 active job')
    expect(jobCountLabel(1234, 'en-US')).toBe('1,234 active jobs')
    expect(jobCountLabel(0, 'es-MX')).toBe('0 vacantes activas')
    expect(jobCountLabel(1, 'es-CO')).toBe('1 vacante activa')
    expect(jobCountLabel(null, 'es')).toBe('Cantidad no disponible')
    expect(jobCountLabel(null, 'en')).toBe('Count unavailable')
  })
  it('handles unsupported locales with an explicit default, not an Intl exception', () => {
    expect(jobCountLabel(0, 'not_a_locale')).toBe('0 vagas ativas')
    expect(countLabels('fr-FR').candidates).toBe('Candidatos cadastrados')
  })
})
