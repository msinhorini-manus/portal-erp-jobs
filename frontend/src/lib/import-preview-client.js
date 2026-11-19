import { appFetch } from './regional-runtime.js'

export const IMPORT_MAX_FILE_BYTES = 52428800
export const IMPORT_MAX_ROWS = 10000
export const IMPORT_FORMATS = ['json', 'csv', 'zip']
export const IMPORT_ACTION_LABELS = Object.freeze({ create: 'Proposta de criação', update: 'Proposta de atualização', ignore: 'Ignorar', error: 'Erro', review: 'Revisão pendente' })
export const IMPORT_ENTITY_LABELS = Object.freeze({ company: 'Empresa', job: 'Vaga', logo: 'Logo' })
export const EXTERNAL_ID_LIMITATION = 'Fonte e ID externo ainda não são persistidos no Jobs. A comparação auxiliar pode apontar possíveis duplicatas, mas não garante unicidade externa na base atual.'
const totalKeys = ['companies', 'jobs', 'logos', 'create', 'update', 'ignore', 'error', 'warnings']
const entityTotalKeys = Object.freeze({ company: 'companies', job: 'jobs', logo: 'logos' })
const errorMessages = {
  400: 'Formato de arquivo ou documento inválido. Revise o conteúdo e tente novamente.',
  401: 'Sua sessão administrativa expirou. Faça login novamente.',
  403: 'Sem permissão. A prévia exige um administrador de plataforma autorizado pela API.',
  404: 'Importações indisponíveis nesta região. Apenas o Brasil está habilitado nesta etapa.',
  413: 'O arquivo ou seu conteúdo descomprimido excede os limites permitidos.',
  422: 'O documento apresenta inconsistências estruturais. Corrija o arquivo antes de validar.',
  429: 'Limite de prévias atingido. Aguarde antes de tentar novamente.',
}

export class ImportPreviewError extends Error {
  constructor(message, code, status = 0) {
    super(message)
    this.name = 'ImportPreviewError'
    this.code = code
    this.status = status
  }
}

function invalidResponse() {
  return new ImportPreviewError('A API devolveu uma resposta incompatível com a etapa de prévia. Nenhuma execução está disponível.', 'invalid_response')
}

/** Plain text only; ignore unknown DTO fields and cap all presentation strings. */
export function importDisplayText(value, maxLength = 300) {
  if (typeof value !== 'string') return ''
  // eslint-disable-next-line no-control-regex -- Deliberately removes unsafe presentation controls.
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '').slice(0, maxLength)
}

export function validateImportCapabilities(data) {
  if (!data || data.country_code !== 'BR' || typeof data.preview_enabled !== 'boolean' || data.execution_enabled !== false ||
      !['platform_admin', 'agent'].includes(data.actor) || typeof data.agent_preview_configured !== 'boolean' ||
      !Number.isSafeInteger(data.max_file_bytes) || data.max_file_bytes <= 0 || data.max_file_bytes > IMPORT_MAX_FILE_BYTES ||
      !Number.isSafeInteger(data.max_rows) || data.max_rows <= 0 || data.max_rows > IMPORT_MAX_ROWS ||
      !Array.isArray(data.formats) || !data.formats.length || data.formats.some(format => !IMPORT_FORMATS.includes(format))) throw invalidResponse()
  return {
    country_code: 'BR', preview_enabled: data.preview_enabled, execution_enabled: false,
    actor: data.actor, agent_preview_configured: data.agent_preview_configured,
    max_file_bytes: data.max_file_bytes, max_rows: data.max_rows, formats: [...new Set(data.formats)],
  }
}

export function canAdminPreview(capabilities) {
  return capabilities?.actor === 'platform_admin' && capabilities?.country_code === 'BR' && capabilities?.preview_enabled === true && capabilities?.execution_enabled === false
}

export function validateImportPreview(data) {
  if (!data || typeof data.preview_id !== 'string' || !data.preview_id || data.dry_run !== true || data.status !== 'preview_only' ||
      data.country_code !== 'BR' || data.execution_enabled !== false || !data.totals ||
      !Array.isArray(data.limitations) || data.limitations.length > 100 || data.limitations.some(value => typeof value !== 'string') ||
      !Array.isArray(data.items) || data.items.length > IMPORT_MAX_ROWS ||
      totalKeys.some(key => !Number.isSafeInteger(data.totals[key]) || data.totals[key] < 0 ||
        (key !== 'warnings' && data.totals[key] > data.items.length))) throw invalidResponse()
  const items = data.items.map(item => {
    if (!item || !Number.isSafeInteger(item.line) || item.line < 0 || !Object.hasOwn(IMPORT_ENTITY_LABELS, item.entity) ||
        !Object.hasOwn(IMPORT_ACTION_LABELS, item.action) || typeof item.key !== 'string' || typeof item.label !== 'string' ||
        !Array.isArray(item.messages) || item.messages.length > 100) throw invalidResponse()
    const messages = item.messages.map(message => {
      if (!message || !['warning', 'error'].includes(message.severity) ||
          ['code', 'field', 'message'].some(key => typeof message[key] !== 'string')) throw invalidResponse()
      return { code: importDisplayText(message.code, 80), field: importDisplayText(message.field, 80), severity: message.severity, message: importDisplayText(message.message, 600) }
    })
    return { line: item.line, entity: item.entity, action: item.action, key: importDisplayText(item.key, 160), label: importDisplayText(item.label, 240), messages }
  })
  // Match build_preview: entities/actions count items; warnings count messages.
  // review is a pending subset with no total, not a create/error proposal.
  const totals = Object.fromEntries(totalKeys.map(key => [key, 0]))
  for (const item of items) {
    totals[entityTotalKeys[item.entity]] += 1
    if (item.action !== 'review') totals[item.action] += 1
    for (const message of item.messages) {
      if (message.severity === 'warning') totals.warnings += 1
    }
  }
  if (totalKeys.some(key => data.totals[key] !== totals[key])) throw invalidResponse()
  return {
    preview_id: importDisplayText(data.preview_id, 160), dry_run: true, status: 'preview_only', country_code: 'BR', execution_enabled: false,
    totals,
    limitations: data.limitations.map(value => importDisplayText(value, 800)), items,
  }
}

export function validateImportFile(file, capabilities) {
  if (!file || typeof file.name !== 'string' || !Number.isSafeInteger(file.size) || file.size <= 0) {
    throw new ImportPreviewError('Selecione um arquivo ZIP, JSON ou CSV não vazio.', 'file_required')
  }
  const extension = file.name.split('.').pop().toLowerCase()
  const formats = capabilities?.formats || IMPORT_FORMATS
  if (!formats.includes(extension)) throw new ImportPreviewError('Formato não permitido. Selecione ZIP, JSON ou CSV.', 'unsupported_format')
  const limit = Math.min(capabilities?.max_file_bytes || IMPORT_MAX_FILE_BYTES, IMPORT_MAX_FILE_BYTES)
  if (file.size > limit) throw new ImportPreviewError('Arquivo acima do limite de 50 MiB (ou do limite menor informado pela API).', 'file_too_large', 413)
  return file
}

export function validatePastedImportJson(text, capabilities) {
  if (typeof text !== 'string' || !text.trim()) throw new ImportPreviewError('Cole um documento JSON antes de validar.', 'json_required')
  const limit = Math.min(capabilities?.max_file_bytes || IMPORT_MAX_FILE_BYTES, IMPORT_MAX_FILE_BYTES)
  if (new TextEncoder().encode(text).byteLength > limit) throw new ImportPreviewError('JSON acima do limite permitido.', 'file_too_large', 413)
  let payload
  try { payload = JSON.parse(text) } catch { throw new ImportPreviewError('JSON inválido. Verifique a sintaxe antes de enviar.', 'invalid_json') }
  if (!payload || typeof payload !== 'object') throw new ImportPreviewError('O JSON deve conter um objeto ou uma lista.', 'invalid_json')
  return payload
}

function abortIfNeeded(signal) {
  if (signal?.aborted) throw new DOMException('Operação cancelada.', 'AbortError')
}

/** No agent credential support. Backend remains the authority, never localStorage roles. */
export function createImportPreviewClient({ fetcher = appFetch, getAdminToken = () => globalThis.localStorage?.getItem('authToken') } = {}) {
  async function request(path, { signal, body, json = false } = {}) {
    abortIfNeeded(signal)
    let token
    try { token = getAdminToken() } catch { /* Unavailable browser storage is an unauthenticated session. */ }
    if (!token) throw new ImportPreviewError(errorMessages[401], 'session_required', 401)
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    if (json) headers['Content-Type'] = 'application/json'
    let response
    try {
      response = await fetcher(`/api/admin/importacoes/${path}`, {
        method: body === undefined ? 'GET' : 'POST', headers, body, signal,
        cache: 'no-store', credentials: 'omit', redirect: 'error',
      })
    } catch (error) {
      abortIfNeeded(signal)
      if (error.name === 'AbortError') throw error
      throw new ImportPreviewError('Não foi possível conectar à API. Verifique a conexão e tente novamente.', 'network_error')
    }
    abortIfNeeded(signal)
    // Do not render arbitrary server error strings, raw payload, private paths or tracebacks.
    if (!response.ok) throw new ImportPreviewError(errorMessages[response.status] || 'A API não conseguiu analisar o documento. Tente novamente mais tarde.', `http_${response.status}`, response.status)
    let data
    try { data = await response.json() } catch {
      abortIfNeeded(signal)
      throw invalidResponse()
    }
    abortIfNeeded(signal)
    return path === 'capabilities' ? validateImportCapabilities(data) : validateImportPreview(data)
  }
  return {
    capabilities: ({ signal } = {}) => request('capabilities', { signal }),
    preview: ({ file, jsonText, capabilities, signal } = {}) => {
      if (!canAdminPreview(capabilities)) throw new ImportPreviewError(errorMessages[403], 'access_denied', 403)
      if (file && jsonText !== undefined) throw new ImportPreviewError('Escolha apenas um arquivo ou o JSON colado.', 'ambiguous_input')
      if (file) {
        validateImportFile(file, capabilities)
        const body = new FormData()
        body.append('file', file)
        return request('preview', { signal, body }) // Browser sets multipart boundary; no manual Content-Type.
      }
      if (!capabilities.formats.includes('json')) throw new ImportPreviewError('JSON colado não está habilitado pela API.', 'unsupported_format')
      validatePastedImportJson(jsonText, capabilities)
      return request('preview', { signal, body: jsonText, json: true })
    },
  }
}

/** Synchronous lock plus identity/abort checks, even when a transport ignores abort. */
export function createImportRequestGate() {
  let active = null
  let sequence = 0
  return {
    begin() {
      if (active) return null
      active = { id: ++sequence, controller: new AbortController() }
      return active
    },
    isCurrent(ticket) { return active === ticket && !ticket.controller.signal.aborted },
    finish(ticket) { if (active === ticket) active = null },
    invalidate() { active?.controller.abort(); active = null; sequence += 1 },
  }
}

export function filterImportItems(items, { action = '', entity = '', severity = '', search = '' } = {}) {
  const query = search.trim().toLocaleLowerCase('pt-BR')
  return items.filter(item => (!action || item.action === action) && (!entity || item.entity === entity) &&
    (!severity || item.messages.some(message => message.severity === severity)) &&
    (!query || [item.key, item.label, ...item.messages.map(message => `${message.code} ${message.field} ${message.message}`)].some(value => value.toLocaleLowerCase('pt-BR').includes(query))))
}

export function paginateImportItems(items, page = 1, pageSize = 25) {
  const size = Number.isSafeInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 25
  const pages = Math.max(1, Math.ceil(items.length / size))
  const currentPage = Math.max(1, Math.min(Number.isSafeInteger(page) ? page : 1, pages))
  const offset = (currentPage - 1) * size
  return { items: items.slice(offset, offset + size), page: currentPage, pages, total: items.length, first: items.length ? offset + 1 : 0, last: Math.min(offset + size, items.length) }
}

/** Quote every field and neutralize formula prefixes, including whitespace/control obfuscation. */
export function importCsvCell(value) {
  let text = importDisplayText(String(value ?? ''), 4000)
  // eslint-disable-next-line no-control-regex -- Detects obfuscated spreadsheet formulas.
  if (/^[\s\u0000-\u0020]*[=+\-@]/u.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function buildImportReportCsv(preview, items = preview.items) {
  const rows = [['referencia_previa', 'modo', 'gravacao', 'linha', 'entidade', 'chave', 'rotulo', 'acao_proposta', 'severidade', 'codigo', 'campo', 'mensagem']]
  for (const item of items) {
    for (const message of item.messages.length ? item.messages : [null]) {
      rows.push([preview.preview_id, 'preview_only', 'nenhuma', item.line, IMPORT_ENTITY_LABELS[item.entity], item.key, item.label, IMPORT_ACTION_LABELS[item.action], message?.severity || '', message?.code || '', message?.field || '', message?.message || ''])
    }
  }
  return `\ufeff${rows.map(row => row.map(importCsvCell).join(';')).join('\r\n')}\r\n`
}
