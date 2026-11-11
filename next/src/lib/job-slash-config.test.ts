import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
const require = createRequire(import.meta.url)
const config = require('../../next.config.js')
const { pathToRegexp } = require('next/dist/compiled/path-to-regexp')
describe('job-specific exclusion from native trailing slash redirects', () => {
  it('disables the broad native rule and retains default slash redirect outside job details', async () => {
    expect(config.skipTrailingSlashRedirect).toBe(true)
    const redirects = await config.redirects()
    expect(redirects).toHaveLength(1)
    expect(redirects[0]).toMatchObject({ destination: '/:path', permanent: true })
    const rule: RegExp = pathToRegexp(redirects[0].source)
    for (const path of ['/br/vagas/1/', '/br/vagas/01/', '/br/vagas/company/title/1/', '/br/vagas/wrong/wrong/1/', '/mx/vacantes/1/', '/co/vacantes/company/title/1/', '/us/jobs/company/title/1/']) expect(rule.test(path), path).toBe(false)
    for (const path of ['/br/', '/br/vagas/', '/br/empresas/', '/br/empresa/vagas/1/editar/', '/br/candidato/login/', '/brand/logo.svg/', '/br/api/jobs/']) expect(rule.test(path), path).toBe(true)
    for (const path of ['/', '/br', '/br/vagas/company/title/1']) expect(rule.test(path), path).toBe(false)
  })
})
