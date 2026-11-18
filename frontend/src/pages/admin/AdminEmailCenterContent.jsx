import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Mail, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getRegionalRuntime } from '@/lib/regional-runtime.js'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import EmailConflictDialog from '@/components/admin/email/EmailConflictDialog'
import EmailHistoryTab from '@/components/admin/email/EmailHistoryTab'
import EmailInactivateDialog from '@/components/admin/email/EmailInactivateDialog'
import EmailNavigationGuard from '@/components/admin/email/EmailNavigationGuard'
import EmailPublishDialog from '@/components/admin/email/EmailPublishDialog'
import EmailRulesTab from '@/components/admin/email/EmailRulesTab'
import EmailTemplateEditor from '@/components/admin/email/EmailTemplateEditor'
import EmailTemplateList from '@/components/admin/email/EmailTemplateList'
import EmailVersionsDialog from '@/components/admin/email/EmailVersionsDialog'
import { emailApi, isConflictError, isPermissionError } from '@/components/admin/email/emailApi'
import {
  ALLOWED_VARIABLES,
  EMAIL_LOCALES,
  draftFromTemplate,
  errorFields,
  filterTemplates,
  hasContentChanges,
  isAuthorizedTemplate,
  logicalRouteFromHref,
  previewSnapshotMatches,
  serializeEditorContent,
} from '@/components/admin/email/email-center-helpers.mjs'

const EMPTY_FILTERS = { search: '', locale: 'all', status: 'all', audience: 'all', country: 'all' }
const EMPTY_DRAFT = { name: '', subject: '', html: '', text: '' }

export default function AdminEmailCenterContent() {
  const navigate = useNavigate()
  const [capabilities, setCapabilities] = useState(null)
  const [context, setContext] = useState(null)
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState('')
  const [capabilitiesError, setCapabilitiesError] = useState('')
  const [activeTab, setActiveTab] = useState('templates')
  const [templates, setTemplates] = useState([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [templatesError, setTemplatesError] = useState('')
  const [drafts, setDrafts] = useState({})
  const [selectedLocale, setSelectedLocale] = useState('pt-BR')
  const [editorOpen, setEditorOpen] = useState(false)
  const [preview, setPreview] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [editorError, setEditorError] = useState('')
  const [editorMessage, setEditorMessage] = useState('')
  const [pendingNavigation, setPendingNavigation] = useState(null)
  const [publishOpen, setPublishOpen] = useState(false)
  const [inactivateOpen, setInactivateOpen] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versions, setVersions] = useState([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [conflict, setConflict] = useState(null)
  const [rules, setRules] = useState(null)
  const [rulesLoading, setRulesLoading] = useState(false)
  const [rulesError, setRulesError] = useState('')
  const [history, setHistory] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const rulesAttemptedRef = useRef(false)
  const historyAttemptedRef = useRef(false)
  const currentDraftRef = useRef(null)
  const selectedLocaleRef = useRef(selectedLocale)
  const previewRequestRef = useRef(0)
  const previewAbortRef = useRef(null)
  const conflictHydrationRef = useRef(0)

  const selectedTemplate = useMemo(() => templates.find(template => template.locale === selectedLocale) || null, [selectedLocale, templates])
  const currentDraft = drafts[selectedLocale] || (selectedTemplate ? draftFromTemplate(selectedTemplate) : EMPTY_DRAFT)
  const dirty = Boolean(editorOpen && selectedTemplate && hasContentChanges(draftFromTemplate(selectedTemplate), currentDraft))
  const filteredTemplates = useMemo(() => filterTemplates(templates, filters), [filters, templates])
  currentDraftRef.current = currentDraft
  selectedLocaleRef.current = selectedLocale
  const operationBusy = saving || mutating

  const loadCapabilities = useCallback(async signal => {
    setCapabilitiesLoading(true)
    try {
      const result = await emailApi.getCapabilities(signal)
      const nextCapabilities = normalizeCapabilities(result.capabilities)
      setCapabilities(nextCapabilities)
      setContext({ site: result.site || null, dispatch: result.dispatch || null })
      setAccessDenied(nextCapabilities.view ? '' : 'Sua sessão não possui a capacidade email.view. Nenhum catálogo foi consultado.')
      setCapabilitiesError('')
    } catch (error) {
      if (error.name !== 'AbortError') {
        if (isPermissionError(error)) setAccessDenied('Acesso não autorizado à Central de E-mails. Nenhum metadado de template, regra ou histórico foi consultado.')
        else setCapabilitiesError('Não foi possível validar as capacidades da Central de E-mails. Tente novamente.')
      }
    } finally {
      if (!signal?.aborted) setCapabilitiesLoading(false)
    }
  }, [])

  const loadTemplates = useCallback(async ({ preserveLocal = true, signal } = {}) => {
    setTemplatesLoading(true)
    setTemplatesError('')
    try {
      const result = await emailApi.getTemplates(signal)
      const authorizedTemplates = (result.templates || []).filter(isAuthorizedTemplate)
      setTemplates(authorizedTemplates)
      setTotal(Number.isFinite(result.total) ? result.total : authorizedTemplates.length)
      setDrafts(previous => {
        const next = { ...previous }
        authorizedTemplates.forEach(template => {
          if (!preserveLocal || !next[template.locale]) next[template.locale] = draftFromTemplate(template)
        })
        return next
      })
    } catch (error) {
      if (error.name !== 'AbortError') {
        setTemplates([])
        setTotal(0)
        setTemplatesError(isPermissionError(error) ? 'Acesso não autorizado ao catálogo. Nenhum metadado foi exibido.' : 'Não foi possível carregar o catálogo de templates.')
      }
    } finally {
      if (!signal?.aborted) setTemplatesLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadCapabilities(controller.signal)
    return () => controller.abort()
  }, [loadCapabilities])

  useEffect(() => {
    if (!capabilities?.view) return undefined
    const controller = new AbortController()
    loadTemplates({ signal: controller.signal })
    return () => controller.abort()
  }, [capabilities?.view, loadTemplates])

  useEffect(() => () => {
    previewRequestRef.current += 1
    previewAbortRef.current?.abort()
  }, [])

  const loadRules = useCallback(async () => {
    setRulesLoading(true)
    setRulesError('')
    try { setRules(await emailApi.getRules()) } catch (error) { if (error.name !== 'AbortError') setRulesError(isPermissionError(error) ? 'Acesso não autorizado às regras. Nenhum metadado foi exibido.' : 'Não foi possível carregar as regras de disparo.') } finally { setRulesLoading(false) }
  }, [])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError('')
    try { setHistory(await emailApi.getHistory()) } catch (error) { if (error.name !== 'AbortError') setHistoryError(isPermissionError(error) ? 'Acesso não autorizado ao histórico. Nenhum registro foi exibido.' : 'Não foi possível carregar o histórico de envios.') } finally { setHistoryLoading(false) }
  }, [])

  useEffect(() => {
    if (activeTab === 'rules' && capabilities?.rules && !rulesAttemptedRef.current) {
      rulesAttemptedRef.current = true
      loadRules()
    }
    if (activeTab === 'history' && capabilities?.history && !historyAttemptedRef.current) {
      historyAttemptedRef.current = true
      loadHistory()
    }
  }, [activeTab, capabilities?.history, capabilities?.rules, loadHistory, loadRules])

  function normalizeCapabilities(source = {}) {
    return { view: Boolean(source.view ?? source['email.view']), edit: Boolean(source.edit ?? source['email.edit']), publish: Boolean(source.publish ?? source['email.publish']), rules: Boolean(source.rules ?? source['email.rules']), history: Boolean(source.history ?? source['email.history']), test: false }
  }

  function updateFilters(change) { setFilters(previous => ({ ...previous, ...change })) }

  function resetCurrentLocaleDraft() {
    if (!selectedTemplate) return
    setDrafts(previous => ({ ...previous, [selectedLocale]: draftFromTemplate(selectedTemplate) }))
  }

  function applyNavigation(action, { discardCurrentDraft = false } = {}) {
    if (operationBusy) {
      setEditorError('Aguarde a operação em andamento terminar antes de navegar. O editor está bloqueado para preservar o conteúdo local.')
      return
    }
    if (discardCurrentDraft) resetCurrentLocaleDraft()
    if (action.kind === 'locale') setSelectedLocale(action.value)
    if (action.kind === 'tab') { setActiveTab(action.value); if (action.value !== 'templates') setEditorOpen(false) }
    if (action.kind === 'back') setEditorOpen(false)
    if (action.kind === 'external') {
      navigate(logicalRouteFromHref(action.href, getRegionalRuntime().basename))
    }
    setPendingNavigation(null)
    setEditorError('')
    setEditorMessage('')
  }

  function requestNavigation(action) {
    if (operationBusy) {
      setEditorError('Aguarde a operação em andamento terminar antes de navegar. O editor está bloqueado para preservar o conteúdo local.')
      return false
    }
    if (dirty) {
      setPendingNavigation(action)
      return false
    }
    applyNavigation(action)
    return true
  }

  function confirmPendingNavigation() {
    if (!pendingNavigation) return
    applyNavigation(pendingNavigation, { discardCurrentDraft: true })
  }

  function changeTab(value) {
    if (value === activeTab) return
    requestNavigation({ kind: 'tab', value })
  }

  function openEditor(template) {
    setSelectedLocale(template.locale)
    setDrafts(previous => ({ ...previous, [template.locale]: previous[template.locale] || draftFromTemplate(template) }))
    setEditorOpen(true)
    setActiveTab('templates')
    setEditorError('')
    setEditorMessage('')
    setFieldErrors({})
    setPreview(null)
  }

  function openLocale(locale) {
    if (locale === selectedLocale) return
    if (!requestNavigation({ kind: 'locale', value: locale })) return
    setPreview(null)
    setEditorError('')
    setEditorMessage('')
    setFieldErrors({})
  }

  function handleDraftChange(field, value) {
    setDrafts(previous => ({ ...previous, [selectedLocale]: { ...(previous[selectedLocale] || EMPTY_DRAFT), [field]: value } }))
    setPreview(null)
    setEditorMessage('')
    setFieldErrors(previous => ({ ...previous, [field]: undefined }))
  }

  function replaceTemplate(template) {
    if (!template) return
    setTemplates(previous => previous.map(item => item.locale === template.locale ? template : item))
    setDrafts(previous => ({ ...previous, [template.locale]: draftFromTemplate(template) }))
    setSelectedLocale(template.locale)
    setPreview(null)
  }

  const hydrateConflict = useCallback(async locale => {
    const hydrationId = conflictHydrationRef.current + 1
    conflictHydrationRef.current = hydrationId
    try {
      const result = await emailApi.getTemplates()
      if (hydrationId !== conflictHydrationRef.current) return
      const remoteTemplate = (result.templates || []).filter(isAuthorizedTemplate).find(template => template.locale === locale) || null
      setConflict(previous => previous?.locale === locale ? { ...previous, remoteTemplate } : previous)
    } catch {
      // The conflict modal remains actionable even when the read-only comparison fetch fails.
    }
  }, [])

  function handleMutationError(error, fallback) {
    if (isConflictError(error)) {
      const locale = selectedLocale
      const remoteTemplate = error.payload?.template || error.payload?.current_template || null
      setConflict({ locale, remoteTemplate })
      if (!remoteTemplate) void hydrateConflict(locale)
      setEditorError('Conflito de edição: sua alteração local foi preservada. Compare ou recarregue explicitamente a versão atual.')
      return
    }
    if (error.status === 422) {
      setFieldErrors(errorFields(error.payload))
      setEditorError(error.payload?.error || 'Revise os campos indicados pelo backend.')
      return
    }
    setEditorError(isPermissionError(error) ? 'Acesso não autorizado para esta operação. O conteúdo local foi preservado.' : fallback)
  }

  async function saveDraft() {
    if (!selectedTemplate || !capabilities?.edit || saving) return
    setSaving(true); setEditorError(''); setEditorMessage(''); setFieldErrors({})
    try {
      const result = await emailApi.saveDraft(selectedLocale, { revision: selectedTemplate.revision, name: currentDraft.name, subject: currentDraft.subject, html: currentDraft.html, text: currentDraft.text })
      if (result.template) replaceTemplate(result.template)
      else await loadTemplates({ preserveLocal: false })
      setEditorMessage(result.message || 'Rascunho salvo pelo backend.')
    } catch (error) { if (error.name !== 'AbortError') handleMutationError(error, 'Não foi possível salvar o rascunho. O conteúdo local foi preservado.') } finally { setSaving(false) }
  }

  async function requestPreview() {
    if (!selectedTemplate || previewing || operationBusy) return
    const locale = selectedLocale
    const draftSnapshot = { ...currentDraft }
    const snapshot = serializeEditorContent(draftSnapshot)
    const requestId = previewRequestRef.current + 1
    previewRequestRef.current = requestId
    previewAbortRef.current?.abort()
    const controller = new AbortController()
    previewAbortRef.current = controller
    setPreviewing(true); setEditorError(''); setFieldErrors({}); setPreview(null)
    try {
      const result = await emailApi.preview(locale, draftSnapshot, controller.signal)
      const current = previewSnapshotMatches({
        requestId,
        latestRequestId: previewRequestRef.current,
        locale,
        currentLocale: selectedLocaleRef.current,
        snapshot,
        currentContent: currentDraftRef.current,
      })
      if (current) setPreview({ ...result, locale })
      else if (requestId === previewRequestRef.current) setEditorMessage('A prévia foi descartada porque o conteúdo mudou durante a solicitação. Solicite uma nova prévia.')
    } catch (error) {
      if (error.name !== 'AbortError' && requestId === previewRequestRef.current) handleMutationError(error, 'Não foi possível gerar a prévia. O conteúdo local foi preservado.')
    } finally {
      if (requestId === previewRequestRef.current) {
        setPreviewing(false)
        if (previewAbortRef.current === controller) previewAbortRef.current = null
      }
    }
  }

  function requireCleanDraft(action) {
    if (!dirty) return true
    setEditorError(`Salve o rascunho antes de ${action}. A operação usa somente o rascunho persistido e não pode descartar sua edição local.`)
    return false
  }

  function openPublish() {
    if (requireCleanDraft('publicar')) setPublishOpen(true)
  }

  function openInactivate() {
    if (requireCleanDraft('inativar o template')) setInactivateOpen(true)
  }

  async function confirmPublish() {
    if (!selectedTemplate || mutating || !requireCleanDraft('publicar')) return
    setMutating(true); setEditorError('')
    try {
      const result = await emailApi.publish(selectedLocale, selectedTemplate.revision)
      if (result.template) replaceTemplate(result.template)
      else await loadTemplates({ preserveLocal: false })
      setPublishOpen(false)
      setEditorMessage(result.message || 'Versão publicada pelo backend. Nenhum disparo foi realizado.')
    } catch (error) { if (error.name !== 'AbortError') handleMutationError(error, 'Não foi possível publicar. A versão vigente foi preservada.') } finally { setMutating(false) }
  }

  async function confirmInactivate() {
    if (!selectedTemplate || mutating || !requireCleanDraft('inativar o template')) return
    setMutating(true); setEditorError('')
    try {
      const result = await emailApi.inactivate(selectedLocale, selectedTemplate.revision)
      if (result.template) replaceTemplate(result.template)
      else await loadTemplates({ preserveLocal: false })
      setInactivateOpen(false)
      setEditorMessage(result.message || 'Template inativado pelo backend. Nenhum disparo foi realizado.')
    } catch (error) { if (error.name !== 'AbortError') handleMutationError(error, 'Não foi possível inativar o template. O conteúdo local foi preservado.') } finally { setMutating(false) }
  }

  const loadVersions = useCallback(async () => {
    if (!selectedTemplate) return
    setVersionsLoading(true)
    try { const result = await emailApi.getVersions(selectedTemplate.locale); setVersions(result.versions || []) } catch (error) { setEditorError(isPermissionError(error) ? 'Acesso não autorizado às versões.' : 'Não foi possível carregar as versões.') } finally { setVersionsLoading(false) }
  }, [selectedTemplate])

  async function restoreVersion(version) {
    if (!selectedTemplate || mutating || !requireCleanDraft('restaurar uma versão')) return
    setMutating(true); setEditorError('')
    try {
      const result = await emailApi.restore(selectedTemplate.locale, selectedTemplate.revision, version.version)
      if (result.template) replaceTemplate(result.template)
      else await loadTemplates({ preserveLocal: false })
      setVersionsOpen(false)
      setEditorMessage(result.message || 'Versão restaurada como novo rascunho. Nenhum disparo foi realizado.')
    } catch (error) { if (error.name !== 'AbortError') handleMutationError(error, 'Não foi possível restaurar a versão. O conteúdo local foi preservado.') } finally { setMutating(false) }
  }

  async function reloadConflict() {
    try {
      const result = await emailApi.getTemplates()
      const remote = (result.templates || []).filter(isAuthorizedTemplate).find(template => template.locale === conflict?.locale)
      if (!remote) {
        setEditorError('A versão atual não foi encontrada no catálogo autorizado; sua edição local permanece.')
        return
      }
      replaceTemplate(remote)
      setConflict(null)
      setEditorError('Versão atual recarregada explicitamente. Você pode editar e salvar novamente.')
    } catch (error) { setEditorError(isPermissionError(error) ? 'Acesso não autorizado ao recarregar a versão.' : 'Não foi possível recarregar a versão atual; sua edição local permanece.') }
  }

  if (capabilitiesLoading) return <div role="status" className="flex min-h-64 items-center justify-center rounded-xl border bg-white p-8 text-sm text-gray-600">Validando capacidades da Central de E-mails…</div>
  if (accessDenied) return <SafeDenied message={accessDenied} />
  if (capabilitiesError) return <ErrorPanel message={capabilitiesError} onRetry={() => loadCapabilities()} />

  const dispatchReason = context?.dispatch?.reason || 'Disparos não implementados nesta fase.'
  return (
    <div className="min-w-0 space-y-6">
      <EmailNavigationGuard dirty={dirty} blocked={operationBusy} onRequestNavigation={({ href }) => requestNavigation({ kind: 'external', href })} />
      <header className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-3"><span className="rounded-lg bg-[#1F3B47] p-2 text-white"><Mail className="h-5 w-5" aria-hidden="true" /></span><div><h1 className="break-words text-3xl font-bold text-gray-900">Central de E-mails</h1><p className="mt-1 text-sm text-gray-600">Templates editoriais e regras de notificação do Portal ERP Jobs.</p></div></div></div><div className="rounded-lg border bg-white px-4 py-3 text-sm shadow-sm"><p className="font-semibold text-[#1F3B47]">Contexto: {context?.site?.name || context?.site?.code || 'região autorizada'}</p><p className="mt-1 text-xs text-gray-500">{context?.site?.country_code || 'BR'} · escopo regional validado pelo backend</p></div></div><div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /><p><strong>Disparos não implementados.</strong> {dispatchReason} Esta Central não envia mensagens, não configura remetentes ou credenciais e não ativa países.</p></div></header>
      <Tabs value={activeTab} onValueChange={changeTab} className="min-w-0"><TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-lg bg-white p-1 shadow-sm"><TabsTrigger value="templates" disabled={operationBusy} className="min-w-[130px] flex-1 py-2.5">Templates</TabsTrigger><TabsTrigger value="rules" disabled={operationBusy} className="min-w-[160px] flex-1 py-2.5">Regras de disparo</TabsTrigger><TabsTrigger value="history" disabled={operationBusy} className="min-w-[120px] flex-1 py-2.5">Histórico</TabsTrigger></TabsList><TabsContent value="templates" className="mt-5 min-w-0">{editorOpen && selectedTemplate ? <div className="space-y-5"><div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white p-2 shadow-sm" role="tablist" aria-label="Idioma do conteúdo"><span className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Idioma do conteúdo</span>{EMAIL_LOCALES.map(locale => <button type="button" key={locale.value} role="tab" aria-selected={selectedLocale === locale.value} disabled={operationBusy} aria-describedby={operationBusy ? 'email-editor-lock-reason' : undefined} className={`rounded-md px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${selectedLocale === locale.value ? 'bg-[#1F3B47] text-white' : 'text-gray-700 hover:bg-slate-100'}`} onClick={() => openLocale(locale.value)}>{locale.label}</button>)}</div><EmailTemplateEditor template={selectedTemplate} draft={currentDraft} capabilities={capabilities} variables={ALLOWED_VARIABLES} fieldErrors={fieldErrors} error={editorError} message={editorMessage} preview={preview} previewing={previewing} saving={saving} mutating={mutating} onChange={handleDraftChange} onPreview={requestPreview} onSave={saveDraft} onPublish={openPublish} onInactivate={openInactivate} onVersions={() => setVersionsOpen(true)} onBack={() => requestNavigation({ kind: 'back' })} /></div> : <><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-[#1F3B47]">Templates</h2><p className="mt-1 text-sm text-gray-600">Apenas registros do catálogo autorizado são exibidos. Variantes EN/ES são bases editoriais sem país ativado.</p></div><button type="button" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-60" disabled={!capabilities.edit} title={!capabilities.edit ? 'Sua sessão não possui email.edit' : undefined}><RefreshCw className="h-4 w-4" aria-hidden="true" />Novo template indisponível</button></div>{templatesError && <ErrorPanel message={templatesError} onRetry={() => loadTemplates()} />}{!templatesError && <EmailTemplateList templates={filteredTemplates} total={total} filters={filters} onFiltersChange={updateFilters} onEdit={openEditor} onVersions={template => { openEditor(template); setVersionsOpen(true) }} canEdit={capabilities.edit} canHistory={capabilities.history} loading={templatesLoading} />}</>}</TabsContent><TabsContent value="rules" className="mt-5 min-w-0"><EmailRulesTab data={rules} loading={rulesLoading} error={rulesError} canManageRules={capabilities.rules} onRetry={loadRules} onOpenTemplate={locale => { const template = templates.find(item => item.locale === locale); if (template) openEditor(template) }} /></TabsContent><TabsContent value="history" className="mt-5 min-w-0"><EmailHistoryTab data={history} loading={historyLoading} error={historyError} canViewHistory={capabilities.history} onRetry={loadHistory} /></TabsContent></Tabs>
      <EmailPublishDialog open={publishOpen} template={selectedTemplate} draft={currentDraft} busy={mutating} onCancel={() => setPublishOpen(false)} onConfirm={confirmPublish} />
      <EmailInactivateDialog open={inactivateOpen} template={selectedTemplate} busy={mutating} onCancel={() => setInactivateOpen(false)} onConfirm={confirmInactivate} />
      <EmailVersionsDialog open={versionsOpen} template={selectedTemplate} versions={versions} loading={versionsLoading} draft={currentDraft} canRestore={capabilities.edit && !dirty && !operationBusy} onOpenChange={setVersionsOpen} onLoad={loadVersions} onRestore={restoreVersion} />
      <EmailConflictDialog open={Boolean(conflict)} locale={conflict?.locale} localDraft={drafts[conflict?.locale] || currentDraft} remoteTemplate={conflict?.remoteTemplate} onOpenChange={open => { if (!open) setConflict(null) }} onReload={reloadConflict} />
      <UnsavedDialog open={Boolean(pendingNavigation)} busy={operationBusy} onCancel={() => setPendingNavigation(null)} onConfirm={confirmPendingNavigation} />
      <p className="sr-only" aria-live="polite">{dirty ? 'Há alterações não salvas neste editor.' : ''}</p>
    </div>
  )
}

function SafeDenied({ message }) { return <section className="rounded-xl border border-red-200 bg-red-50 p-6" role="alert"><h1 className="text-xl font-bold text-red-900">Central de E-mails indisponível</h1><p className="mt-2 text-sm text-red-800">{message}</p></section> }
function ErrorPanel({ message, onRetry }) { return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><p>{message}</p><button type="button" className="mt-3 inline-flex items-center gap-2 rounded-md border border-red-300 px-3 py-2 font-semibold" onClick={onRetry}><RefreshCw className="h-4 w-4" aria-hidden="true" />Tentar novamente</button></div> }
function UnsavedDialog({ open, busy, onCancel, onConfirm }) {
  return <AlertDialog open={open} onOpenChange={value => { if (!value && !busy) onCancel() }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Alterações não salvas</AlertDialogTitle><AlertDialogDescription>Seu trabalho local ainda não foi confirmado pelo backend. Deseja sair e descartar essas alterações?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Continuar editando</AlertDialogCancel><AlertDialogAction className="bg-red-700 hover:bg-red-800" disabled={busy} onClick={event => { event.preventDefault(); onConfirm() }}>Sair sem salvar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
}
