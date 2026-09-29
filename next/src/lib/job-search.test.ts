import { describe, expect, it } from 'vitest'

import { buildJobApiParams, jobSearchUrl } from './job-search'

describe('job search parameters', () => {
  it('translates every UI filter to the Flask contract', () => {
    expect(buildJobApiParams({
      q: 'Python', area: 'Dados', tech: 'PostgreSQL', location: 'São Paulo',
      level: 'Sênior', work_mode: 'Remoto', employment_type: 'clt',
      company_id: '7', salary: '12000-18000', page: '2',
    })).toEqual({
      q: 'Python', area: 'Dados', tech: 'PostgreSQL', location: 'São Paulo',
      level: 'Sênior', work_mode: 'Remoto', employment_type: 'clt', company_id: '7',
      salary_min_exact: '12000', salary_max_exact: '18000', page: '2',
    })
  })

  it('ignores malformed salary ranges and keeps filters while paging', () => {
    expect(buildJobApiParams({ salary: 'invalid' })).toEqual({})
    expect(jobSearchUrl({ q: 'ERP', tech: 'SAP', page: '2' }, { page: 3 }))
      .toBe('/vagas?q=ERP&tech=SAP&page=3')
  })
})
