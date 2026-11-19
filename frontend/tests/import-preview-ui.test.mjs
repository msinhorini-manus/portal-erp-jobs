// Deterministic component harness: transforms the actual JSX with existing Vite,
// isolates hooks for state/event checks, and uses React SSR for escaped markup.
// No browser claim: layout/keyboard/real DOM QA belongs to the local browser gate.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { transformWithEsbuild } from 'vite'
import { renderToStaticMarkup } from 'react-dom/server'
import { File } from 'node:buffer'
import { capabilitiesFixture, previewFixture } from './import-preview.fixtures.mjs'
import { validateImportPreview } from '../src/lib/import-preview-client.js'

const require = createRequire(import.meta.url)
const source = await readFile(new URL('../src/pages/admin/AdminImportsContent.jsx', import.meta.url), 'utf8')
const transformed = await transformWithEsbuild(source, 'AdminImportsContent.jsx', { loader: 'jsx', jsx: 'automatic' })
const hooksKey = '__syntheticImporterTestHooks'
let code = transformed.code.replace(/import \{[^}]+\} from "react";/, `const useState=(...a)=>globalThis.${hooksKey}.useState(...a); const useRef=(...a)=>globalThis.${hooksKey}.useRef(...a); const useMemo=(...a)=>globalThis.${hooksKey}.useMemo(...a); const useEffect=(...a)=>globalThis.${hooksKey}.useEffect(...a);`)
code = code.replaceAll('"react/jsx-runtime"', JSON.stringify(pathToFileURL(require.resolve('react/jsx-runtime')).href))
code = code.replaceAll('"lucide-react"', JSON.stringify(pathToFileURL(require.resolve('lucide-react')).href))
code = code.replaceAll('"@/lib/import-preview-client.js"', JSON.stringify(new URL('../src/lib/import-preview-client.js', import.meta.url).href))
const { default: Page } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)

function machine(client) {
  const slots = []
  let cursor = 0
  const effects = []
  const frames = []
  const oldRaf = globalThis.requestAnimationFrame
  globalThis.requestAnimationFrame = fn => { frames.push(fn); return frames.length }
  globalThis[hooksKey] = {
    useState(initial) {
      const index = cursor++
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }]
    },
    useRef(initial) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index] },
    useMemo(fn) { cursor++; return fn() },
    useEffect(fn, deps) {
      const index = cursor++
      const previous = slots[index]
      if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) { slots[index] = { deps }; effects.push(fn) }
    },
  }
  const cleanups = []
  return {
    render() { cursor = 0; return Page({ client }) },
    effects() { for (const fn of effects.splice(0)) { const cleanup = fn(); if (cleanup) cleanups.push(cleanup) } },
    flushFrames() { frames.splice(0).forEach(fn => fn()) },
    close() { cleanups.forEach(fn => fn()); globalThis.requestAnimationFrame = oldRaf; delete globalThis[hooksKey] },
  }
}
function allNodes(root) {
  if (!root || typeof root !== 'object') return []
  const children = Array.isArray(root.props?.children) ? root.props.children.flat(Infinity) : [root.props?.children]
  return [root, ...children.flatMap(allNodes)]
}
function text(node) {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  return (Array.isArray(node) ? node : [node.props?.children]).flat(Infinity).map(text).join('')
}
const find = (root, predicate) => allNodes(root).find(predicate)
const button = (root, label) => find(root, node => node.type === 'button' && text(node).includes(label))
const settle = async () => { await new Promise(resolve => setImmediate(resolve)) }
async function authorizedMachine(client = { capabilities: async () => capabilitiesFixture, preview: async () => validateImportPreview(previewFixture()) }) {
  const app = machine(client)
  app.render()
  app.effects()
  await settle()
  return app
}

// Sequential tests because the isolated hooks share one test-global namespace.
test('initial render announces permission check, no writes and disabled execution with accessible reason', () => {
  let writes = 0
  const app = machine({ capabilities: async () => capabilitiesFixture, preview: async () => { writes++ } })
  try {
    const tree = app.render()
    const html = renderToStaticMarkup(tree)
    assert.match(html, /Verificando permissão na API regional/)
    assert.match(html, /Nenhuma gravação será realizada/)
    const confirm = button(tree, 'Confirmar importação')
    assert.equal(confirm.props.disabled, true)
    assert.equal(confirm.props['aria-describedby'], 'execution-disabled-reason')
    assert.equal(find(tree, node => node.type === 'input' && node.props.type === 'file'), undefined)
    assert.equal(writes, 0)
  } finally { app.close() }
})

test('platform permission exposes labeled inputs and changing file dispatches no POST; click does', async () => {
  let calls = 0
  const app = await authorizedMachine({ capabilities: async () => capabilitiesFixture, preview: async () => { calls++; return validateImportPreview(previewFixture()) } })
  try {
    let tree = app.render()
    const input = find(tree, node => node.type === 'input' && node.props.type === 'file')
    assert.equal(input.props.id, 'import-file')
    assert.equal(input.props.accept, '.json,.csv,.zip')
    input.props.onChange({ target: { files: [new File(['{}'], 'synthetic.json')] } })
    tree = app.render()
    assert.equal(calls, 0)
    assert.equal(button(tree, 'Validar prévia').props.disabled, false)
    await button(tree, 'Validar prévia').props.onClick()
    assert.equal(calls, 1)
    assert.match(renderToStaticMarkup(app.render()), /Resultado da prévia — nenhuma gravação/)
  } finally { app.close() }
})

test('agent or disabled capability hides upload and explains lack of Admin access', async () => {
  for (const capabilities of [{ ...capabilitiesFixture, actor: 'agent' }, { ...capabilitiesFixture, preview_enabled: false }]) {
    const app = await authorizedMachine({ capabilities: async () => capabilities, preview: async () => assert.fail('No POST allowed') })
    try {
      const tree = app.render()
      assert.equal(find(tree, node => node.type === 'input' && node.props.type === 'file'), undefined)
      assert.ok(find(tree, node => node.props?.role === 'alert'))
    } finally { app.close() }
  }
})

test('capability errors remain distinct from row errors and do not permit a validation click', async () => {
  const app = await authorizedMachine({ capabilities: async () => { throw Object.assign(new Error('Sem permissão sintética.'), { status: 403 }) }, preview: async () => assert.fail('No POST') })
  try {
    const tree = app.render()
    assert.match(renderToStaticMarkup(tree), /Sem permissão sintética/)
    assert.equal(button(tree, 'Validar prévia'), undefined)
    assert.ok(button(tree, 'Verificar acesso novamente'))
  } finally { app.close() }
})

test('double click dispatches once, cancellation discards stale result and permits a newer analysis', async () => {
  const pending = []
  let calls = 0
  const app = await authorizedMachine({ capabilities: async () => capabilitiesFixture, preview: options => { calls++; return new Promise(resolve => pending.push({ resolve, options })) } })
  try {
    let tree = app.render()
    find(tree, node => node.type === 'input' && node.props.type === 'file').props.onChange({ target: { files: [new File(['{}'], 'synthetic.json')] } })
    tree = app.render()
    const click = button(tree, 'Validar prévia').props.onClick
    const oldRequest = click()
    await click()
    assert.equal(calls, 1)
    tree = app.render()
    assert.equal(button(tree, 'Validando prévia...').props.disabled, true)
    button(tree, 'Cancelar análise').props.onClick()
    assert.equal(pending[0].options.signal.aborted, true)
    tree = app.render()
    const newRequest = button(tree, 'Validar prévia').props.onClick()
    assert.equal(calls, 2)
    pending[0].resolve(validateImportPreview({ ...previewFixture(), preview_id: 'stale-reference' }))
    await oldRequest
    assert.doesNotMatch(renderToStaticMarkup(app.render()), /stale-reference/)
    pending[1].resolve(validateImportPreview({ ...previewFixture(), preview_id: 'fresh-reference' }))
    await newRequest
    assert.match(renderToStaticMarkup(app.render()), /fresh-reference/)
  } finally { app.close() }
})

test('result escapes user HTML, displays action/messages, paginates and filters', async () => {
  const app = await authorizedMachine()
  try {
    let tree = app.render()
    find(tree, node => node.type === 'input' && node.props.type === 'file').props.onChange({ target: { files: [new File(['{}'], 'synthetic.json')] } })
    await button(app.render(), 'Validar prévia').props.onClick()
    tree = app.render()
    const html = renderToStaticMarkup(tree)
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/)
    assert.doesNotMatch(html, /<img src=x/)
    assert.match(html, /Propostas de criação/)
    assert.match(html, /Revisão pendente/)
    assert.match(html, /Fonte e ID externo ainda não são persistidos/)
    const tbody = find(tree, node => node.type === 'tbody')
    assert.equal(allNodes(tbody).filter(node => node.type === 'tr').length, 25)
    button(tree, 'Próxima').props.onClick()
    tree = app.render()
    assert.match(renderToStaticMarkup(tree), /Página 2 de 3/)
    const actionSelect = find(tree, node => node.type === 'select' && allNodes(node).some(child => child.type === 'option' && child.props.value === 'review'))
    actionSelect.props.onChange({ target: { value: 'review' } })
    tree = app.render()
    assert.match(renderToStaticMarkup(tree), /Página 1 de 1/)
    const filteredRows = allNodes(find(tree, node => node.type === 'tbody')).filter(node => node.type === 'tr')
    assert.ok(filteredRows.length < 25 && filteredRows.length > 0)
    assert.ok(filteredRows.every(row => text(row).includes('Revisão pendente')))
    assert.ok(button(tree, 'Baixar relatório completo'))
  } finally { app.close() }
})

test('JSON mode is optional, local editing has no writes and successful preview passes exact JSON text', async () => {
  let posted
  const app = await authorizedMachine({ capabilities: async () => capabilitiesFixture, preview: async options => { posted = options; return validateImportPreview(previewFixture(0)) } })
  try {
    let tree = app.render()
    find(tree, node => node.type === 'input' && node.props.value === 'json').props.onChange()
    tree = app.render()
    const input = find(tree, node => node.type === 'textarea')
    assert.equal(input.props.id, 'import-json')
    input.props.onChange({ target: { value: '{"empresas":[]}' } })
    assert.equal(posted, undefined)
    await button(app.render(), 'Validar prévia').props.onClick()
    assert.equal(posted.jsonText, '{"empresas":[]}')
    assert.equal(posted.file, undefined)
    assert.match(renderToStaticMarkup(app.render()), /Nenhum item corresponde aos filtros/)
  } finally { app.close() }
})

test('unmount aborts both capabilities and active preview; late promises never expose results', async () => {
  let options
  let resolvePreview
  const app = await authorizedMachine({ capabilities: async () => capabilitiesFixture, preview: value => { options = value; return new Promise(resolve => { resolvePreview = resolve }) } })
  let tree = app.render()
  find(tree, node => node.type === 'input' && node.props.type === 'file').props.onChange({ target: { files: [new File(['{}'], 'synthetic.json')] } })
  const pending = button(app.render(), 'Validar prévia').props.onClick()
  app.close()
  assert.equal(options.signal.aborted, true)
  resolvePreview(validateImportPreview(previewFixture()))
  await pending
})

test('App route remains protected and real Admin layout responsiveness is scoped to imports only', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const sidebar = await readFile(new URL('../src/components/admin/AdminSidebar.jsx', import.meta.url), 'utf8')
  const layout = await readFile(new URL('../src/components/admin/AdminLayout.jsx', import.meta.url), 'utf8')
  assert.match(app, /<ProtectedRoute requiredType="admin">/)
  assert.match(app, /path="\/admin\/importacoes" element=\{<AdminImportsContent/)
  assert.match(sidebar, /setImportAllowed\(canAdminPreview\(capabilities\)\)/)
  assert.match(sidebar, /importAllowed \? \[\{ path: '\/admin\/importacoes'/)
  assert.match(layout, /importsRoute \? 'min-w-0 flex-1 p-3 sm:p-6 lg:p-8' : 'flex-1 p-8'/)
  assert.match(layout, /aria-expanded=\{mobileMenuOpen\}/)
  assert.match(layout, /aria-controls="imports-admin-navigation"/)
  assert.doesNotMatch(source, /dangerouslySetInnerHTML|localStorage\.setItem|\/confirm/)
})
