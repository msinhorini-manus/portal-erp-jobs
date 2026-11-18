import test from 'node:test'
import assert from 'node:assert/strict'
import {
  EMAIL_TEMPLATE_KEY,
  buildPreviewSrcDoc,
  canPublishDraft,
  contentDiff,
  filterTemplates,
  getEmptyEditorFields,
  hasContentChanges,
  isAuthorizedTemplate,
  logicalRouteFromHref,
  previewSnapshotMatches,
  serializeEditorContent,
} from '../src/components/admin/email/email-center-helpers.mjs'

const templates = [
  { locale: 'pt-BR', key: EMAIL_TEMPLATE_KEY, event: 'application.created', audience: 'company', country_code: 'br', name: 'Nova candidatura', status: 'draft', updated_at: '2026-11-18T15:00:00Z' },
  { locale: 'en', key: EMAIL_TEMPLATE_KEY, event: 'application.created', audience: 'company', country_code: null, name: 'New application', status: 'published', updated_at: '2026-11-17T15:00:00Z' },
  { locale: 'es', key: EMAIL_TEMPLATE_KEY, event: 'application.created', audience: 'company', country_code: null, name: 'Nueva candidatura', status: 'inactive', updated_at: '2026-11-16T15:00:00Z' },
  { locale: 'pt-BR', key: 'other.event', event: 'other.event', audience: 'company', country_code: 'br', name: 'Fora do catálogo', status: 'draft' },
]

test('filtra somente catálogo autorizado e preserva filtros por locale, status e país', () => {
  assert.equal(filterTemplates(templates).length, 3)
  assert.equal(filterTemplates(templates)[0].locale, 'pt-BR')
  assert.equal(filterTemplates(templates, { search: 'new application' })[0].locale, 'en')
  assert.equal(filterTemplates(templates, { locale: 'pt-BR', country: 'br' }).length, 1)
  assert.equal(filterTemplates(templates, { country: 'base' }).length, 2)
  assert.equal(isAuthorizedTemplate(templates[3]), false)
})

test('detecta diferenças de campos editoriais sem tratar revisão como conteúdo', () => {
  const before = { name: 'A', subject: 'S', html: '<p>A</p>', text: 'A' }
  const after = { name: 'B', subject: 'S', html: '<p>B</p>', text: 'A' }
  assert.equal(hasContentChanges(before, after), true)
  assert.deepEqual(contentDiff(before, after).name.changed, true)
  assert.deepEqual(contentDiff(before, after).subject.changed, false)
})

test('gera srcDoc isolado sem scripts, formulários ou recursos externos', () => {
  const srcDoc = buildPreviewSrcDoc('<script>alert(1)</script><form action="/x"><img src="https://x.test/a.png" onerror="x()"></form><p>ok</p>')
  assert.match(srcDoc, /default-src 'none'/)
  assert.doesNotMatch(srcDoc, /<script/i)
  assert.doesNotMatch(srcDoc, /<form/i)
  assert.doesNotMatch(srcDoc, /src=/i)
  assert.match(srcDoc, /<p>ok<\/p>/)
})

test('descarta resposta de prévia quando request, locale ou snapshot ficaram obsoletos', () => {
  const draft = { name: 'Nome', subject: 'Assunto', html: '<p>ok</p>', text: 'ok' }
  const snapshot = serializeEditorContent(draft)
  assert.equal(previewSnapshotMatches({ requestId: 3, latestRequestId: 3, locale: 'pt-BR', currentLocale: 'pt-BR', snapshot, currentContent: draft }), true)
  assert.equal(previewSnapshotMatches({ requestId: 2, latestRequestId: 3, locale: 'pt-BR', currentLocale: 'pt-BR', snapshot, currentContent: draft }), false)
  assert.equal(previewSnapshotMatches({ requestId: 3, latestRequestId: 3, locale: 'pt-BR', currentLocale: 'pt-BR', snapshot, currentContent: { ...draft, subject: 'Alterado' } }), false)
  assert.equal(previewSnapshotMatches({ requestId: 3, latestRequestId: 3, locale: 'pt-BR', currentLocale: 'en', snapshot, currentContent: draft }), false)
})

test('bloqueia publicação com draft local dirty e permite somente conteúdo persistido', () => {
  const template = { revision: 4, draft: { name: 'Nome', subject: 'Assunto', html: '<p>ok</p>', text: 'ok' } }
  const capabilities = { publish: true }
  assert.equal(canPublishDraft({ template, draft: template.draft, capabilities }), true)
  assert.equal(canPublishDraft({ template, draft: { ...template.draft, subject: 'Nova edição' }, capabilities }), false)
  assert.equal(canPublishDraft({ template, draft: template.draft, capabilities, saving: true }), false)
})

test('remove basename regional de links externos antes do navigate lógico', () => {
  assert.equal(logicalRouteFromHref('https://jobs.example/br/admin/emails?tab=rules#history', '/br'), '/admin/emails?tab=rules#history')
  assert.equal(logicalRouteFromHref('/admin/emails', '/br'), '/admin/emails')
  assert.equal(logicalRouteFromHref('/br', '/br'), '/')
})

test('identifica campos editoriais vazios sem considerar espaços como conteúdo', () => {
  assert.deepEqual(getEmptyEditorFields({ name: '  ', subject: 'Assunto', html: '', text: 'Texto' }), ['name', 'html'])
  assert.deepEqual(getEmptyEditorFields({ name: 'Nome', subject: 'Assunto', html: '<p>ok</p>', text: 'Texto' }), [])
})
