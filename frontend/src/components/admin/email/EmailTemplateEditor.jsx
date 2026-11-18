import { useRef, useState } from 'react'
import { ArrowLeft, Ban, Bold, Eye, History, Link as LinkIcon, List, Pilcrow, Save, Send, Upload } from 'lucide-react'
import EmailPreviewPanel from './EmailPreviewPanel'
import EmailVariablePalette from './EmailVariablePalette'
import EmailStatusBadge from './EmailStatusBadge'
import { canPublishDraft, formatDate, hasContentChanges, localeLabel, templateContent } from './email-center-helpers.mjs'

const fieldClass = 'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#F7941D] focus:ring-2 focus:ring-orange-100 disabled:bg-gray-50'

export default function EmailTemplateEditor({
  template,
  draft,
  capabilities,
  variables,
  fieldErrors,
  error,
  message,
  preview,
  previewing,
  saving,
  mutating,
  onChange,
  onPreview,
  onSave,
  onPublish,
  onInactivate,
  onVersions,
  onBack,
}) {
  const subjectRef = useRef(null)
  const htmlRef = useRef(null)
  const textRef = useRef(null)
  const [focusedField, setFocusedField] = useState('subject')
  const [mobilePanel, setMobilePanel] = useState('editor')
  const [announcement, setAnnouncement] = useState('')
  const refs = { subject: subjectRef, html: htmlRef, text: textRef }
  const operationBusy = saving || mutating
  const editable = capabilities.edit && !operationBusy
  const dirty = hasContentChanges(templateContent(template), draft)
  const canPublish = canPublishDraft({ template, draft, capabilities, saving, mutating })
  const canPreview = capabilities.view && capabilities.edit && !previewing && !operationBusy
  const canInactivate = capabilities.publish && Number(template?.revision) > 0 && template?.status !== 'inactive' && !dirty && !operationBusy
  const actionDisabledReason = saving
    ? 'Salvando o rascunho… o editor, idioma e navegação estão bloqueados para preservar a resposta do backend.'
    : mutating
      ? 'Operação em andamento… o editor, idioma e navegação estão bloqueados até a conclusão.'
      : dirty
        ? 'Salve o rascunho antes de publicar, inativar ou restaurar uma versão.'
        : !capabilities.edit
          ? 'Sua sessão não possui email.edit.'
          : ''

  function focusField(field) {
    setFocusedField(field)
  }

  function insertVariable(variable) {
    const field = focusedField === 'name' ? 'subject' : focusedField
    const ref = refs[field]?.current
    const value = draft[field] || ''
    const start = ref?.selectionStart ?? value.length
    const end = ref?.selectionEnd ?? value.length
    const token = `{{${variable.key}}}`
    onChange(field, `${value.slice(0, start)}${token}${value.slice(end)}`)
    setAnnouncement(`Variável ${variable.label} inserida no campo ${field === 'html' ? 'HTML' : field === 'text' ? 'Texto simples' : 'Assunto'}.`)
    window.requestAnimationFrame(() => {
      if (!ref) return
      ref.focus()
      const cursor = start + token.length
      ref.setSelectionRange(cursor, cursor)
    })
  }

  function applyMarkup(kind) {
    const ref = htmlRef.current
    const value = draft.html || ''
    const start = ref?.selectionStart ?? value.length
    const end = ref?.selectionEnd ?? value.length
    const selected = value.slice(start, end) || 'texto'
    const snippets = {
      bold: [`<strong>${selected}</strong>`, 'negrito'],
      paragraph: [`<p>${selected}</p>`, 'parágrafo'],
      list: [`<ul><li>${selected}</li></ul>`, 'lista'],
      link: [`<a href="{{painel_url}}">${selected}</a>`, 'link interno'],
    }
    const [replacement, label] = snippets[kind]
    onChange('html', `${value.slice(0, start)}${replacement}${value.slice(end)}`)
    window.requestAnimationFrame(() => {
      if (!ref) return
      ref.focus()
      const cursor = start + replacement.length
      ref.setSelectionRange(cursor, cursor)
    })
    setFocusedField('html')
    setAnnouncement(`Formatação de ${label} inserida no campo HTML.`)
    return label
  }

  return (
    <section className="space-y-5" aria-labelledby="email-editor-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <button type="button" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#1F3B47] hover:underline disabled:cursor-not-allowed disabled:opacity-50" disabled={operationBusy} aria-describedby={operationBusy ? 'email-editor-lock-reason' : undefined} onClick={onBack}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Voltar ao catálogo</button>
          <h2 id="email-editor-title" className="break-words text-2xl font-bold text-gray-900">{draft.name || template?.name || 'Template sem nome'}</h2>
          <p className="mt-1 break-all font-mono text-xs text-gray-500">{template?.key} · evento {template?.event}</p>
        </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600"><EmailStatusBadge status={template?.status} /><span className="rounded-full border px-2.5 py-1">{localeLabel(template?.locale)}</span><span>{String(template?.country_code || '').toUpperCase() === 'BR' ? 'País: Brasil · disparos não ativados' : 'País: base editorial · nenhum país ativado'}</span></div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>Separação editorial/operacional:</strong> salvar e publicar somente persistem conteúdo editorial. Nenhuma dessas ações ativa regra, worker, país, backlog ou envio.</div>

      {actionDisabledReason && <p id="email-editor-lock-reason" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950" role="status">{actionDisabledReason}</p>}

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div>}
      {message && <div role="status" aria-live="polite" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{message}</div>}

      <div className="flex items-center gap-1 rounded-lg border bg-white p-1 shadow-sm lg:hidden" role="tablist" aria-label="Painel do editor">
        <button type="button" role="tab" aria-selected={mobilePanel === 'editor'} className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${mobilePanel === 'editor' ? 'bg-[#1F3B47] text-white' : 'text-gray-700'}`} onClick={() => setMobilePanel('editor')}>Edição</button>
        <button type="button" role="tab" aria-selected={mobilePanel === 'preview'} className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${mobilePanel === 'preview' ? 'bg-[#1F3B47] text-white' : 'text-gray-700'}`} onClick={() => setMobilePanel('preview')}>Prévia</button>
      </div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <div className={`min-w-0 space-y-5 ${mobilePanel === 'preview' ? 'hidden lg:block' : ''}`}>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold text-[#1F3B47]">Conteúdo · {localeLabel(template?.locale)}</h3><p className="mt-1 text-xs text-gray-500">Revisão de edição: {template?.revision ?? 0} · {template?.updated_at ? `atualizado ${formatDate(template.updated_at)}` : 'sem atualização registrada'}</p></div><span className="text-xs text-gray-500">Identidade do catálogo é fixa</span></div>
            <div className="space-y-4">
              <FieldError field="name" errors={fieldErrors} />
              <label className="block text-sm font-semibold text-gray-800" htmlFor="email-template-name">Nome administrativo<input id="email-template-name" className={fieldClass} value={draft.name || ''} maxLength={180} disabled={!editable} onFocus={() => focusField('name')} onChange={event => onChange('name', event.target.value)} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'email-error-name' : operationBusy ? 'email-editor-lock-reason' : undefined} /></label>
              <FieldError field="subject" errors={fieldErrors} />
              <label className="block text-sm font-semibold text-gray-800" htmlFor="email-template-subject">Assunto<input id="email-template-subject" ref={subjectRef} className={fieldClass} value={draft.subject || ''} maxLength={240} disabled={!editable} onFocus={() => focusField('subject')} onChange={event => onChange('subject', event.target.value)} aria-invalid={Boolean(fieldErrors.subject)} aria-describedby={fieldErrors.subject ? 'email-error-subject' : operationBusy ? 'email-editor-lock-reason' : undefined} /></label>
              <FieldError field="html" errors={fieldErrors} />
              <div><label className="block text-sm font-semibold text-gray-800" htmlFor="email-template-html">HTML controlado</label><div className="mt-1 flex flex-wrap gap-1 rounded-t-md border border-b-0 border-gray-300 bg-gray-50 p-2"><ToolButton label="Negrito" icon={<Bold className="h-4 w-4" />} onClick={() => applyMarkup('bold')} disabled={!editable} /><ToolButton label="Parágrafo" icon={<Pilcrow className="h-4 w-4" />} onClick={() => applyMarkup('paragraph')} disabled={!editable} /><ToolButton label="Lista" icon={<List className="h-4 w-4" />} onClick={() => applyMarkup('list')} disabled={!editable} /><ToolButton label="Link para painel_url" icon={<LinkIcon className="h-4 w-4" />} onClick={() => applyMarkup('link')} disabled={!editable} /></div><textarea id="email-template-html" ref={htmlRef} className={`${fieldClass} mt-0 min-h-64 rounded-t-none font-mono text-xs`} value={draft.html || ''} maxLength={30000} disabled={!editable} onFocus={() => focusField('html')} onChange={event => onChange('html', event.target.value)} aria-invalid={Boolean(fieldErrors.html)} aria-describedby={fieldErrors.html ? 'email-error-html' : operationBusy ? 'email-editor-lock-reason' : undefined} /></div>
              <FieldError field="text" errors={fieldErrors} />
              <label className="block text-sm font-semibold text-gray-800" htmlFor="email-template-text">Texto simples<textarea id="email-template-text" ref={textRef} className={`${fieldClass} min-h-40`} value={draft.text || ''} maxLength={30000} disabled={!editable} onFocus={() => focusField('text')} onChange={event => onChange('text', event.target.value)} aria-invalid={Boolean(fieldErrors.text)} aria-describedby={fieldErrors.text ? 'email-error-text' : operationBusy ? 'email-editor-lock-reason' : undefined} /></label>
            </div>
          </div>
          <EmailVariablePalette variables={variables} focusedField={focusedField} announcement={announcement} onInsert={insertVariable} disabled={!editable} />
          <div className="rounded-xl border bg-white p-5 shadow-sm"><h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">Estado operacional</h3><p className="mt-2 text-sm text-gray-600">Não integrado. Este template não possui destinatários, remetente, credenciais ou ativação configuráveis nesta Central.</p><p id="email-test-disabled-reason" className="mt-3 text-xs text-gray-500">Enviar teste: indisponível nesta fase porque o transporte e o destinatário autorizado não foram liberados.</p></div>
          <div className="flex flex-wrap gap-2 rounded-xl border bg-white p-4 shadow-sm"><button type="button" className="inline-flex items-center gap-2 rounded-md bg-[#F7941D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e58915] disabled:cursor-not-allowed disabled:opacity-50" disabled={!editable} aria-describedby={operationBusy ? 'email-editor-lock-reason' : undefined} onClick={onSave}><Save className="h-4 w-4" aria-hidden="true" />{saving ? 'Salvando…' : 'Salvar rascunho'}</button><button type="button" className="inline-flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold text-[#1F3B47] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={!canPreview} aria-describedby={operationBusy ? 'email-editor-lock-reason' : undefined} onClick={onPreview}><Eye className="h-4 w-4" aria-hidden="true" />Visualizar</button><button type="button" className="inline-flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold text-gray-500 disabled:cursor-not-allowed disabled:opacity-50" disabled aria-describedby="email-test-disabled-reason"><Send className="h-4 w-4" aria-hidden="true" />Enviar teste</button><button type="button" className="inline-flex items-center gap-2 rounded-md border border-emerald-700 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={!canPublish} aria-describedby={!canPublish ? 'email-publish-disabled-reason' : undefined} onClick={onPublish}><Upload className="h-4 w-4" aria-hidden="true" />{template?.status === 'inactive' ? 'Publicar e reativar versão editorial' : 'Publicar versão'}</button><button type="button" className="inline-flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={!capabilities.history || operationBusy} aria-describedby={operationBusy ? 'email-editor-lock-reason' : undefined} onClick={onVersions}><History className="h-4 w-4" aria-hidden="true" />Versões</button><button type="button" className="inline-flex items-center gap-2 rounded-md border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={!canInactivate} aria-describedby={!canInactivate ? 'email-publish-disabled-reason' : undefined} onClick={onInactivate}><Ban className="h-4 w-4" aria-hidden="true" />Inativar</button></div>
          {!canPublish && <p id="email-publish-disabled-reason" className="mt-2 text-xs text-gray-600">{dirty ? 'Salve o rascunho antes de publicar, inativar ou restaurar uma versão.' : operationBusy ? 'Aguarde a operação em andamento terminar.' : 'Publicação exige permissão, rascunho persistido e revisão válida.'}</p>}
        </div>
        <div className={mobilePanel === 'editor' ? 'hidden lg:block' : ''}><EmailPreviewPanel preview={preview} loading={previewing} onPreview={onPreview} canPreview={canPreview} /></div>
      </div>
    </section>
  )
}

function ToolButton({ label, icon, onClick, disabled }) {
  return <button type="button" className="inline-flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Inserir ${label}`} title={label} disabled={disabled} onClick={onClick}>{icon}<span className="sr-only">{label}</span></button>
}

function FieldError({ field, errors }) {
  if (!errors?.[field]) return null
  return <p id={`email-error-${field}`} role="alert" className="mb-1 text-xs font-medium text-red-700">{errors[field]}</p>
}
