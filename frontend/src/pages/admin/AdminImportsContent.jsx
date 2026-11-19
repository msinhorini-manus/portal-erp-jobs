import { useEffect, useMemo, useRef, useState } from 'react'
import { Upload, FileSearch, Download, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react'
import {
  buildImportReportCsv, canAdminPreview, createImportPreviewClient, createImportRequestGate,
  EXTERNAL_ID_LIMITATION, filterImportItems, IMPORT_ACTION_LABELS, IMPORT_ENTITY_LABELS,
  importDisplayText, paginateImportItems, validateImportFile,
} from '@/lib/import-preview-client.js'

const defaultClient = createImportPreviewClient()
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
const inputClass = 'w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 disabled:bg-gray-100'
const actionColors = { create: 'bg-blue-50 text-blue-900', update: 'bg-purple-50 text-purple-900', ignore: 'bg-gray-100 text-gray-700', error: 'bg-red-50 text-red-900', review: 'bg-amber-50 text-amber-900' }
const totalsLabels = { companies: 'Empresas analisadas', jobs: 'Vagas analisadas', logos: 'Logos analisados', create: 'Propostas de criação', update: 'Propostas de atualização', ignore: 'Itens a ignorar', error: 'Erros', warnings: 'Avisos' }

export default function AdminImportsContent({ client = defaultClient }) {
  const [capabilities, setCapabilities] = useState(null)
  const [accessLoading, setAccessLoading] = useState(true)
  const [accessError, setAccessError] = useState(null)
  const [capabilityVersion, setCapabilityVersion] = useState(0)
  const [mode, setMode] = useState('file')
  const [file, setFile] = useState(null)
  const [jsonText, setJsonText] = useState('')
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState('')
  const [action, setAction] = useState('')
  const [entity, setEntity] = useState('')
  const [severity, setSeverity] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const gate = useRef(createImportRequestGate())
  const fileInput = useRef(null)
  const resultHeading = useRef(null)
  const resultFocusTicket = useRef(null)
  const allowed = canAdminPreview(capabilities)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const currentGate = gate.current
    currentGate.invalidate()
    resultFocusTicket.current = null
    setBusy(false)
    setPreview(null)
    setError(null)
    setCapabilities(null)
    setAccessLoading(true)
    setAccessError(null)
    client.capabilities({ signal: controller.signal }).then(result => {
      if (active && !controller.signal.aborted) setCapabilities(result)
    }).catch(err => {
      if (active && !controller.signal.aborted && err.name !== 'AbortError') setAccessError(err)
    }).finally(() => { if (active && !controller.signal.aborted) setAccessLoading(false) })
    return () => { active = false; controller.abort(); currentGate.invalidate() }
  }, [client, capabilityVersion])

  const filtered = useMemo(() => filterImportItems(preview?.items || [], { action, entity, severity, search }), [preview, action, entity, severity, search])
  const pagination = useMemo(() => paginateImportItems(filtered, page, pageSize), [filtered, page, pageSize])

  function clearResult() {
    gate.current.invalidate()
    resultFocusTicket.current = null
    setBusy(false)
    setPreview(null)
    setError(null)
    setNotice('')
    setPage(1)
  }

  function selectFile(nextFile) {
    clearResult()
    setFile(null)
    if (!nextFile) return
    try { validateImportFile(nextFile, capabilities); setFile(nextFile) } catch (err) {
      setError(err)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function switchMode(nextMode) {
    clearResult()
    setMode(nextMode)
    setFile(null)
    setJsonText('')
    if (fileInput.current) fileInput.current.value = ''
  }

  function cancelPreview() {
    clearResult()
    setNotice('Análise cancelada. Respostas antigas serão descartadas; nenhuma gravação foi realizada.')
  }

  async function validatePreview() {
    if (!allowed) return
    const ticket = gate.current.begin()
    if (!ticket) return // Same-tick double clicks cannot dispatch a second POST.
    resultFocusTicket.current = null
    setBusy(true)
    setPreview(null)
    setError(null)
    setNotice('')
    try {
      const result = await client.preview({
        ...(mode === 'file' ? { file } : { jsonText }), capabilities, signal: ticket.controller.signal,
      })
      if (!gate.current.isCurrent(ticket)) return
      setPreview(result)
      setAction('')
      setEntity('')
      setSeverity('')
      setSearch('')
      setPage(1)
      setNotice('Prévia concluída. Nenhuma gravação foi realizada.')
      // Focus after render, with a fresh identity check if input/navigation has changed.
      resultFocusTicket.current = ticket
      requestAnimationFrame(() => { if (resultFocusTicket.current === ticket && !ticket.controller.signal.aborted) resultHeading.current?.focus() })
    } catch (err) {
      if (!gate.current.isCurrent(ticket) || err.name === 'AbortError') return
      setError(err)
      if ([401, 403, 404].includes(err.status)) {
        setCapabilities(null)
        setAccessError(err)
        setFile(null)
        setJsonText('')
      }
    } finally {
      if (gate.current.isCurrent(ticket)) { gate.current.finish(ticket); setBusy(false) }
    }
  }

  function downloadReport(items) {
    if (!preview) return
    const blob = new Blob([buildImportReportCsv(preview, items)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'relatorio-previa-importacoes.csv'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <section className="min-w-0 space-y-6" aria-labelledby="imports-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h1 id="imports-title" className="text-2xl font-bold text-gray-900 sm:text-3xl">Importações</h1><p className="mt-2 text-sm text-gray-600">Etapa 1 · Validação e comparação de empresas, vagas e logos · Brasil</p></div>
        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900">Somente prévia</span>
      </div>
      <div role="note" className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="flex items-start gap-2 font-semibold"><AlertTriangle size={20} className="shrink-0" aria-hidden="true" />Nenhuma gravação será realizada nesta etapa.</p>
        <p>Criações e atualizações são apenas propostas. Não serão publicadas empresas ou vagas, aplicados limites ou membros, emitidos convites nem enviados e-mails. Esta prévia é temporária, sem fila ou histórico persistido.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4">
        <button type="button" disabled aria-describedby="execution-disabled-reason" className={buttonClass}>Confirmar importação</button>
        <p id="execution-disabled-reason" className="text-sm font-semibold text-gray-700">Gravação ainda não habilitada nesta etapa</p>
      </div>

      {accessLoading && <p role="status" className="flex items-center gap-2 text-gray-700"><Loader2 size={20} className="animate-spin" aria-hidden="true" />Verificando permissão na API regional...</p>}
      {!accessLoading && !allowed && <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
        <p role="alert">{accessError?.message || (capabilities?.actor === 'agent' ? 'A sessão de agente não autoriza acesso a esta tela Admin. Use uma sessão de administrador de plataforma.' : 'Prévia indisponível. Somente administradores de plataforma autorizados pela API podem analisar arquivos no Brasil.')}</p>
        <button type="button" className={buttonClass} onClick={() => setCapabilityVersion(value => value + 1)}>Verificar acesso novamente</button>
      </div>}

      {allowed && <div className="space-y-4 rounded-xl border bg-white p-4 shadow-sm sm:p-6" aria-busy={busy}>
        <div className="flex items-start gap-2 text-sm text-gray-700"><ShieldCheck size={20} className="shrink-0 text-green-700" aria-hidden="true" /><p>Acesso de administrador de plataforma confirmado pela API. Prévia habilitada; execução desabilitada.</p></div>
        <p id="import-file-help" className="text-sm text-gray-600">Formatos: {capabilities.formats.map(value => value.toUpperCase()).join(', ')}. Até {Math.floor(capabilities.max_file_bytes / 1048576)} MiB e {capabilities.max_rows.toLocaleString('pt-BR')} linhas. O servidor também valida tamanho descomprimido, estrutura e segurança. Não envie candidatos, currículos, senhas ou tokens.</p>
        <fieldset disabled={busy} className="min-w-0 space-y-4">
          <legend className="mb-2 text-sm font-semibold text-gray-900">Origem do documento</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex cursor-pointer items-center gap-2"><input type="radio" name="import-source" value="file" checked={mode === 'file'} onChange={() => switchMode('file')} />Arquivo ZIP, JSON ou CSV</label>
            {capabilities.formats.includes('json') && <label className="flex cursor-pointer items-center gap-2"><input type="radio" name="import-source" value="json" checked={mode === 'json'} onChange={() => switchMode('json')} />Colar JSON (opcional)</label>}
          </div>
          {mode === 'file' ? <div className="min-w-0 space-y-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4">
            <label htmlFor="import-file" className="flex items-center gap-2 text-sm font-semibold"><Upload size={18} aria-hidden="true" />Selecionar arquivo para prévia</label>
            <input ref={fileInput} id="import-file" type="file" accept={capabilities.formats.map(value => `.${value}`).join(',')} aria-describedby="import-file-help import-file-selection" className={`${inputClass} file:mr-3 file:rounded file:border-0 file:bg-gray-200 file:px-3 file:py-1`} onChange={event => selectFile(event.target.files?.[0])} />
            <p id="import-file-selection" className="break-all text-sm text-gray-600">{file ? `Selecionado: ${importDisplayText(file.name, 160)} (${(file.size / 1048576).toFixed(2)} MiB)` : 'Nenhum arquivo selecionado. Selecionar não envia o arquivo.'}</p>
            {file && <button type="button" className={buttonClass} onClick={() => { selectFile(null); if (fileInput.current) fileInput.current.value = '' }}>Remover arquivo</button>}
          </div> : <div className="space-y-2">
            <label htmlFor="import-json" className="block text-sm font-semibold">Documento JSON</label>
            <textarea id="import-json" rows={10} spellCheck={false} autoComplete="off" aria-describedby="import-file-help import-json-help" className={`${inputClass} font-mono`} value={jsonText} onChange={event => { clearResult(); setJsonText(event.target.value) }} />
            <p id="import-json-help" className="text-xs text-gray-600">Cole o objeto ou a lista completos. O conteúdo não é salvo no navegador e só será enviado ao clicar em Validar prévia.</p>
          </div>}
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={validatePreview} disabled={busy || (mode === 'file' ? !file : !jsonText.trim())} className={`${buttonClass} border-blue-700 bg-blue-700 text-white hover:bg-blue-800`}><FileSearch size={18} aria-hidden="true" />{busy ? 'Validando prévia...' : 'Validar prévia'}</button>
          {busy && <button type="button" onClick={cancelPreview} className={buttonClass}>Cancelar análise</button>}
        </div>
        {busy && <p role="status" className="text-sm text-gray-600">Analisando documento, sem gravar dados. Não envie novamente enquanto a análise estiver em andamento.</p>}
      </div>}

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><p className="font-semibold">Não foi possível gerar a prévia do documento</p><p className="mt-1">{error.message}</p><p className="mt-1">Nenhuma gravação foi realizada. Erros do arquivo/API são diferentes das pendências por item exibidas em uma prévia válida.</p></div>}
      {notice && <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">{notice}</p>}

      {preview && <div className="min-w-0 space-y-6">
        <div><h2 ref={resultHeading} tabIndex={-1} className="text-xl font-bold text-gray-900 outline-offset-4">Resultado da prévia — nenhuma gravação</h2><p className="mt-1 break-all text-xs text-gray-600">Referência temporária: {preview.preview_id} · preview_only · BR · dry_run=true · execution_enabled=false</p></div>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Object.entries(totalsLabels).map(([key, label]) => <div key={key} className="rounded-xl border bg-white p-3 sm:p-4"><dt className="text-xs font-medium text-gray-600">{label}</dt><dd className="mt-1 text-2xl font-bold text-gray-900">{preview.totals[key].toLocaleString('pt-BR')}</dd></div>)}</dl>
        <p className="text-sm text-gray-700">{preview.items.filter(item => item.action === 'review').length.toLocaleString('pt-BR')} itens com revisão pendente. Revisão não significa criação ou aprovação.</p>
        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><h3 className="font-semibold">Limitações desta análise</h3><p>{EXTERNAL_ID_LIMITATION}</p><ul className="list-disc space-y-1 pl-5">{preview.limitations.map((limitation, index) => <li key={index} className="break-words">{limitation}</li>)}</ul><p>Corrija os bloqueios e valide novamente. A referência não é um lote salvo e não pode ser usada para executar uma importação.</p></div>
        <div className="space-y-4 rounded-xl border bg-white p-4">
          <h3 id="imports-filters-title" className="font-semibold">Itens e pendências</h3>
          <fieldset className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-labelledby="imports-filters-title">
            <label className="min-w-0 text-sm">Ação proposta<select className={`${inputClass} mt-1`} value={action} onChange={event => { setAction(event.target.value); setPage(1) }}><option value="">Todas as ações</option>{Object.entries(IMPORT_ACTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="min-w-0 text-sm">Tipo de item<select className={`${inputClass} mt-1`} value={entity} onChange={event => { setEntity(event.target.value); setPage(1) }}><option value="">Todos os tipos</option>{Object.entries(IMPORT_ENTITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="min-w-0 text-sm">Mensagens<select className={`${inputClass} mt-1`} value={severity} onChange={event => { setSeverity(event.target.value); setPage(1) }}><option value="">Todas as mensagens</option><option value="error">Com erro</option><option value="warning">Com aviso</option></select></label>
            <label className="min-w-0 text-sm">Buscar no relatório<input type="search" maxLength={160} className={`${inputClass} mt-1`} value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder="Rótulo, chave ou mensagem" /></label>
          </fieldset>
          <div className="flex flex-wrap gap-2"><button type="button" className={buttonClass} onClick={() => downloadReport(preview.items)}><Download size={16} aria-hidden="true" />Baixar relatório completo (CSV)</button><button type="button" disabled={!filtered.length} className={buttonClass} onClick={() => downloadReport(filtered)}>Baixar itens filtrados (CSV)</button></div>
          <p className="text-xs text-gray-600">CSV de prévia, com ações propostas e mensagens, sem o documento bruto. Células são protegidas contra fórmulas de planilha.</p>
        </div>
        <div role="region" aria-label="Tabela de itens da prévia; role horizontalmente em telas pequenas" tabIndex={0} className="min-w-0 overflow-x-auto rounded-xl border bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">
          <table className="w-full min-w-[640px] table-fixed text-left text-sm">
            <caption className="sr-only">Itens da prévia filtrados. Criação e atualização são apenas propostas; nada foi gravado.</caption>
            <thead className="bg-gray-100 text-gray-700"><tr><th scope="col" className="w-20 p-3">Linha</th><th scope="col" className="w-1/4 p-3">Item</th><th scope="col" className="w-40 p-3">Ação proposta</th><th scope="col" className="p-3">Mensagens</th></tr></thead>
            <tbody>{pagination.items.map((item, index) => <tr key={`${item.line}-${item.entity}-${index}`} className="border-t align-top">
              <td className="p-3">{item.line}</td><th scope="row" className="break-words p-3 font-normal"><span className="block text-xs text-gray-500">{IMPORT_ENTITY_LABELS[item.entity]}</span><span className="block font-semibold">{item.label || 'Sem rótulo'}</span><span className="mt-1 block break-all text-xs text-gray-500">{item.key || 'Sem chave'}</span></th>
              <td className="p-3"><span className={`inline-block rounded px-2 py-1 text-xs font-semibold ${actionColors[item.action]}`}>{IMPORT_ACTION_LABELS[item.action]}</span></td>
              <td className="break-words p-3">{item.messages.length ? <ul className="space-y-2">{item.messages.map((message, messageIndex) => <li key={messageIndex} className={message.severity === 'error' ? 'text-red-900' : 'text-amber-900'}><span className="font-semibold">{message.severity === 'error' ? 'Erro' : 'Aviso'}: </span>{message.message}<span className="mt-1 block break-all text-xs">{message.code}{message.field ? ` · Campo: ${message.field}` : ''}</span></li>)}</ul> : <span className="text-gray-500">Sem mensagens.</span>}</td>
            </tr>)}{!pagination.items.length && <tr><td colSpan={4} className="p-6 text-center text-gray-600">Nenhum item corresponde aos filtros.</td></tr>}</tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p role="status">{pagination.first}–{pagination.last} de {pagination.total.toLocaleString('pt-BR')} itens · Página {pagination.page} de {pagination.pages}</p>
          <div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2">Por página<select className={`${inputClass} w-auto`} value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1) }}>{[10, 25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label><button type="button" className={buttonClass} disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)}>Anterior</button><button type="button" className={buttonClass} disabled={pagination.page >= pagination.pages} onClick={() => setPage(pagination.page + 1)}>Próxima</button></div>
        </div>
      </div>}
    </section>
  )
}
