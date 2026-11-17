import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CompanySession } from '@/lib/company-client'

const hooks = vi.hoisted(() => ({ index: 0, cells: [] as unknown[], effects: [] as (() => void | (() => void))[], cleanups: [] as (() => void)[] }))
const calls = vi.hoisted(() => ({ fetch: vi.fn(), upload: vi.fn(), remove: vi.fn(), clear: vi.fn(), replace: vi.fn(), refresh: vi.fn() }))
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return { ...actual,
    useState: (initial: unknown) => {
      const index = hooks.index++
      if (!(index in hooks.cells)) hooks.cells[index] = typeof initial === 'function' ? initial() : initial
      return [hooks.cells[index], (next: unknown) => { hooks.cells[index] = typeof next === 'function' ? next(hooks.cells[index]) : next }]
    },
    useRef: (initial: unknown) => {
      const index = hooks.index++
      if (!(index in hooks.cells)) hooks.cells[index] = { current: initial }
      return hooks.cells[index]
    },
    useEffect: (effect: () => void | (() => void), dependencies: unknown[]) => {
      const index = hooks.index++
      const old = hooks.cells[index] as unknown[] | undefined
      if (!old || dependencies.some((value, position) => value !== old[position])) {
        hooks.cells[index] = dependencies
        hooks.effects.push(effect)
      }
    },
    useId: () => 'logo-test',
  }
})
vi.mock('@/lib/company-client', async () => ({ ...(await vi.importActual<typeof import('@/lib/company-client')>('@/lib/company-client')), companyFetch: calls.fetch, clearLegacyCompanySession: calls.clear }))
vi.mock('@/lib/company-logo', async () => ({ ...(await vi.importActual<typeof import('@/lib/company-logo')>('@/lib/company-logo')), uploadCompanyLogo: calls.upload, removeCompanyLogo: calls.remove }))
vi.mock('@/lib/regional-navigation', () => ({ useRouter: () => ({ replace: calls.replace, refresh: calls.refresh }) }))

import { CompanyLogoUpload } from './CompanyLogoUpload'
import { CompanyRegisterForm } from './CompanyRegisterForm'
import { CompanyProfileForm } from './CompanyProfileForm'

type Node = { type?: unknown; props: Record<string, any> }
function nodes(tree: unknown): Node[] {
  if (!tree || typeof tree !== 'object') return []
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  const node = tree as Node
  return node.props ? [node, ...nodes(node.props.children)] : []
}
function find(tree: unknown, type: unknown, predicate: (node: Node) => boolean = () => true) {
  const node = nodes(tree).find(node => node.type === type && predicate(node))
  if (!node) throw new Error('Expected element not found')
  return node
}
function text(tree: unknown): string {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree)
  if (Array.isArray(tree)) return tree.map(text).join(' ')
  if (tree && typeof tree === 'object' && 'props' in tree) return text((tree as Node).props.children)
  return ''
}
function render<T>(component: (props: T) => React.ReactElement, props: T) { hooks.index = 0; return component(props) }
function effects() {
  for (const effect of hooks.effects.splice(0)) { const cleanup = effect(); if (cleanup) hooks.cleanups.push(cleanup) }
}
const flush = async () => { for (let index = 0; index < 5; index++) await Promise.resolve() }
const file = () => new File(['image'], 'private-company.png', { type: 'image/png' })
const permission = (role: CompanySession['role'] = 'owner', manage = true): CompanySession => ({ id: 1, email: 'test@example.invalid', user_type: 'company', site_code: 'BR', site_status: 'pending', role, permissions: { manage_company: manage, manage_jobs: true, manage_users: true, manage_candidates: true, view_jobs: true, view_candidates: true } })
const company = { id: 7, company_name: 'Empresa', status: 'pending', logo_url: 'https://jobs.portalerp.com/br/api/companies/logos/old.png', site_code: 'BR', max_active_jobs: 5 }

beforeEach(() => {
  hooks.index = 0; hooks.cells = []; hooks.effects = []; hooks.cleanups = []
  Object.values(calls).forEach(mock => mock.mockReset())
  vi.stubGlobal('window', { location: { pathname: '/br/empresa/perfil' } })
  vi.stubGlobal('React', React)
})
afterEach(() => { hooks.cleanups.forEach(cleanup => cleanup()); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('company logo selector', () => {
  it('only selects locally and displays optional format/size labels with no upload fetch', () => {
    const onChange = vi.fn()
    const tree = render(CompanyLogoUpload, { optional: true, file: null, onChange })
    expect(text(tree).replace(/\s+/g, ' ')).toContain('Logo da empresa (opcional)')
    expect(text(tree)).toContain('PNG, JPEG ou WebP, até 2 MB')
    const selected = file()
    find(tree, 'input').props.onChange({ currentTarget: { files: [selected] } })
    expect(onChange).toHaveBeenCalledWith(selected)
    expect(calls.fetch).not.toHaveBeenCalled()
    expect(calls.upload).not.toHaveBeenCalled()
  })

  it('rejects unsupported or oversized input without retaining the file', () => {
    const onChange = vi.fn(), onValidation = vi.fn()
    let tree = render(CompanyLogoUpload, { file: null, onChange, onValidation })
    const target = { files: [new File(['bad'], 'bad.svg', { type: 'image/svg+xml' })], value: 'bad.svg' }
    find(tree, 'input').props.onChange({ currentTarget: target })
    expect(onChange).toHaveBeenCalledWith(null)
    expect(target.value).toBe('')
    tree = render(CompanyLogoUpload, { file: null, onChange, onValidation })
    expect(text(tree)).toContain('Selecione um logo em PNG, JPEG ou WebP.')
    find(tree, 'input').props.onChange({ currentTarget: { files: [new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })], value: 'large.png' } })
    expect(onValidation).toHaveBeenLastCalledWith('O logo deve ter até 2 MB.')
  })

  it('revokes preview object URLs on replacement and unmount and never renders stale previews', () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const props = { file: file(), onChange: vi.fn() }
    render(CompanyLogoUpload, props); effects()
    expect(find(render(CompanyLogoUpload, props), 'img').props.src).toBe('blob:first')
    const cleanup = hooks.cleanups.shift()!
    cleanup()
    const second = { ...props, file: file() }
    expect(nodes(render(CompanyLogoUpload, second)).some(node => node.type === 'img')).toBe(false)
    effects()
    expect(find(render(CompanyLogoUpload, second), 'img').props.src).toBe('blob:second')
    hooks.cleanups.splice(0).forEach(fn => fn())
    expect(create).toHaveBeenCalledTimes(2)
    expect(revoke.mock.calls.map(call => call[0])).toEqual(['blob:first', 'blob:second'])
  })

  it('exposes no controls to read-only users', () => {
    const tree = render(CompanyLogoUpload, { file: null, onChange: vi.fn(), canManage: false, currentUrl: company.logo_url, onUpload: vi.fn(), onRemove: vi.fn() })
    expect(nodes(tree).some(node => ['input', 'button'].includes(String(node.type)))).toBe(false)
    expect(text(tree)).toContain('Somente owners e administradores autorizados')
  })
})

describe('registration logo lifecycle', () => {
  function formEvent() {
    const data = new FormData()
    for (const [key, value] of Object.entries({ trade_name: 'Empresa', email: 'test@example.invalid', password: 'ValidPass2026', confirm_password: 'ValidPass2026', accept_terms: 'on', accept_privacy: 'on' })) data.set(key, value)
    const Original = FormData
    class TestFormData extends Original { constructor(form?: unknown) { super(); if (form) for (const [key, value] of data) this.set(key, value) } }
    vi.stubGlobal('FormData', TestFormData)
    return { preventDefault: vi.fn(), currentTarget: {} }
  }

  it('does JSON register first, uploads only after success cookies, then redirects dashboard', async () => {
    const order: string[] = []
    calls.fetch.mockImplementation(async () => { order.push('register'); return {} })
    calls.upload.mockImplementation(async () => { order.push('upload'); return {} })
    let tree = render(CompanyRegisterForm, undefined)
    const logo = file()
    find(tree, CompanyLogoUpload).props.onChange(logo)
    tree = render(CompanyRegisterForm, undefined)
    await find(tree, 'form').props.onSubmit(formEvent())
    expect(order).toEqual(['register', 'upload'])
    expect(calls.upload).toHaveBeenCalledWith(logo)
    const init = calls.fetch.mock.calls[0][1]
    expect(typeof init.body).toBe('string')
    expect(JSON.parse(init.body)).not.toHaveProperty('logo')
    expect(calls.replace).toHaveBeenCalledWith('/empresa/dashboard')
  })

  it('does not retry register/email or lose session if authenticated upload fails after account creation', async () => {
    calls.fetch.mockResolvedValue({})
    calls.upload.mockRejectedValue(new Error('PRIVATE_EMAIL@example.invalid'))
    let tree = render(CompanyRegisterForm, undefined)
    find(tree, CompanyLogoUpload).props.onChange(file())
    tree = render(CompanyRegisterForm, undefined)
    const submit = find(tree, 'form').props.onSubmit
    const event = formEvent()
    await submit(event)
    await submit(event)
    const result = render(CompanyRegisterForm, undefined)
    expect(calls.fetch).toHaveBeenCalledTimes(1)
    expect(calls.upload).toHaveBeenCalledTimes(1)
    expect(calls.replace).not.toHaveBeenCalled()
    expect(calls.clear).not.toHaveBeenCalled()
    expect(nodes(result).some(node => node.type === 'form')).toBe(false)
    expect(nodes(result).some(node => node.props.href === '/empresa/perfil')).toBe(true)
    expect(text(result)).toContain('Sua conta foi criada, mas o logo não foi enviado')
    expect(text(result)).not.toContain('PRIVATE_EMAIL')
  })

  it('blocks duplicate events while registration is in flight', async () => {
    let resolve!: (value: unknown) => void
    calls.fetch.mockImplementation(() => new Promise(done => { resolve = done }))
    const tree = render(CompanyRegisterForm, undefined)
    const submit = find(tree, 'form').props.onSubmit
    const event = formEvent()
    const first = submit(event)
    await submit(event)
    expect(calls.fetch).toHaveBeenCalledTimes(1)
    resolve({}); await first
    expect(calls.upload).not.toHaveBeenCalled()
  })

  it('never uploads if JSON registration fails and permits the normal registration retry', async () => {
    calls.fetch.mockRejectedValueOnce(new Error('Não foi possível cadastrar.')).mockResolvedValueOnce({})
    calls.upload.mockResolvedValue({})
    let tree = render(CompanyRegisterForm, undefined)
    find(tree, CompanyLogoUpload).props.onChange(file())
    tree = render(CompanyRegisterForm, undefined)
    const submit = find(tree, 'form').props.onSubmit
    const event = formEvent()
    await submit(event)
    expect(calls.upload).not.toHaveBeenCalled()
    await submit(event)
    expect(calls.fetch).toHaveBeenCalledTimes(2)
    expect(calls.upload).toHaveBeenCalledTimes(1)
  })
})

describe('profile logo isolation', () => {
  async function profile(role: CompanySession['role'] = 'owner', manage = true) {
    calls.fetch.mockImplementation(async (path: string) => path.endsWith('/auth/me') ? permission(role, manage) : { company, companyUser: { role }, membership: { status: 'pending', site_code: 'BR', max_active_jobs: 5, is_member: false } })
    render(CompanyProfileForm, undefined); effects(); await flush()
    return render(CompanyProfileForm, undefined)
  }

  it.each(['owner', 'admin'] as const)('allows pending %s upload, preserves unsaved fields and approval, and resets selection on success', async role => {
    let tree = await profile(role)
    expect(find(tree, CompanyLogoUpload).props.canManage).toBe(true)
    expect(find(tree, CompanyLogoUpload).props.currentUrl).toBe(company.logo_url)
    find(tree, CompanyLogoUpload).props.onChange(file())
    // Field setter simulates an unsaved edit independently of logo operations.
    find(tree, nodes(tree).find(node => node.props.name === 'company_name')!.type, node => node.props.name === 'company_name').props.set((value: Record<string, string>) => ({ ...value, company_name: 'Unsaved title' }))
    tree = render(CompanyProfileForm, undefined)
    calls.upload.mockResolvedValue({ logo_url: 'https://jobs.portalerp.com/br/api/companies/logos/new.png', company: { ...company, company_name: 'Stale response' } })
    await find(tree, CompanyLogoUpload).props.onUpload()
    await flush()
    tree = render(CompanyProfileForm, undefined)
    expect(find(tree, CompanyLogoUpload).props.currentUrl).toContain('/new.png')
    expect(find(tree, CompanyLogoUpload).props.file).toBeNull()
    expect(nodes(tree).find(node => node.props.name === 'company_name')!.props.value).toBe('Unsaved title')
    expect(text(tree)).toContain('Em análise')
    expect(text(tree)).toContain('Logo atualizado com sucesso.')
    expect(calls.fetch).toHaveBeenCalledTimes(2)
  })

  it.each([['viewer', true], ['hr', true], ['admin', false]] as const)('rejects logo handlers for %s with manage_company=%s', async (role, manage) => {
    const tree = await profile(role, manage)
    const logo = find(tree, CompanyLogoUpload)
    expect(logo.props.canManage).toBe(false)
    logo.props.onChange(file())
    const next = render(CompanyProfileForm, undefined)
    find(next, CompanyLogoUpload).props.onUpload()
    find(next, CompanyLogoUpload).props.onRemove()
    await flush()
    expect(calls.upload).not.toHaveBeenCalled()
    expect(calls.remove).not.toHaveBeenCalled()
  })

  it('retains selection after upload failure, then removes the current logo without submitting field JSON', async () => {
    let tree = await profile()
    const selected = file()
    find(tree, CompanyLogoUpload).props.onChange(selected)
    tree = render(CompanyProfileForm, undefined)
    calls.upload.mockRejectedValue(new Error('Não foi possível alterar o logo. Tente novamente.'))
    find(tree, CompanyLogoUpload).props.onUpload(); await flush()
    tree = render(CompanyProfileForm, undefined)
    expect(find(tree, CompanyLogoUpload).props.file).toBe(selected)
    expect(text(tree)).toContain('Não foi possível alterar o logo.')
    calls.remove.mockResolvedValue({ logo_url: null, company })
    find(tree, CompanyLogoUpload).props.onRemove(); await flush()
    tree = render(CompanyProfileForm, undefined)
    expect(find(tree, CompanyLogoUpload).props.currentUrl).toBeUndefined()
    expect(find(tree, CompanyLogoUpload).props.file).toBeNull()
    expect(text(tree)).toContain('Logo removido com sucesso.')
    expect(calls.fetch).toHaveBeenCalledTimes(2)
  })

  it('saving fields remains JSON and never sends a selected file or is_member', async () => {
    let tree = await profile()
    find(tree, CompanyLogoUpload).props.onChange(file())
    tree = render(CompanyProfileForm, undefined)
    await find(tree, 'form').props.onSubmit({ preventDefault: vi.fn() })
    const mutation = calls.fetch.mock.calls.find(call => call[1]?.method === 'PUT')!
    expect(mutation).toBeTruthy()
    const payload = JSON.parse(mutation[1].body)
    expect(payload).not.toHaveProperty('logo')
    expect(payload).not.toHaveProperty('logo_url')
    expect(payload).not.toHaveProperty('is_member')
    expect(calls.upload).not.toHaveBeenCalled()
    expect(calls.remove).not.toHaveBeenCalled()
  })
})
