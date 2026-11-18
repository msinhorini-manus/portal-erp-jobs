import { Edit3, Eye, History, Search } from 'lucide-react'
import EmailStatusBadge from './EmailStatusBadge'
import { EMAIL_LOCALES, formatDate, localeShortLabel } from './email-center-helpers.mjs'

const inputClass = 'h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-[#F7941D] focus:ring-2 focus:ring-orange-100'

export default function EmailTemplateList({ templates, total, filters, onFiltersChange, onEdit, onVersions, canEdit, canHistory, loading }) {
  return (
    <section className="space-y-5" aria-labelledby="email-templates-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="email-templates-title" className="text-xl font-bold text-[#1F3B47]">Catálogo de templates</h2>
          <p className="mt-1 text-sm text-gray-600">Catálogo fixo: application.created.company · somente público company nesta fase.</p>
        </div>
        <span className="text-sm text-gray-500">{loading ? 'Carregando…' : `${templates.length} de ${total ?? templates.length} registros`}</span>
      </div>
      <div className="grid min-w-0 gap-3 rounded-xl border bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-5">
        <label className="sm:col-span-2 xl:col-span-1"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Buscar</span><span className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" /><input className={`${inputClass} pl-9`} placeholder="Nome ou chave…" value={filters.search} onChange={event => onFiltersChange({ search: event.target.value })} /></span></label>
        <Filter label="Idioma" value={filters.locale} onChange={value => onFiltersChange({ locale: value })} options={[['all', 'Todos'], ...EMAIL_LOCALES.map(locale => [locale.value, locale.label])]} />
        <Filter label="Estado" value={filters.status} onChange={value => onFiltersChange({ status: value })} options={[['all', 'Todos'], ['draft', 'Rascunho'], ['published', 'Publicado'], ['published_with_draft', 'Publicado com rascunho'], ['inactive', 'Inativo']]} />
        <Filter label="Público" value={filters.audience} onChange={value => onFiltersChange({ audience: value })} options={[['all', 'Todos'], ['company', 'Empresa']]} />
        <Filter label="País" value={filters.country} onChange={value => onFiltersChange({ country: value })} options={[['all', 'Todos'], ['br', 'Brasil'], ['base', 'Base editorial']]} />
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-[920px] w-full text-left text-sm">
          <caption className="sr-only">Templates de e-mail autorizados</caption>
          <thead className="bg-[#1F3B47] text-white"><tr><th className="p-4 font-semibold">Nome / chave</th><th className="p-4 font-semibold">Público</th><th className="p-4 font-semibold">Idioma / país</th><th className="p-4 font-semibold">Estado</th><th className="p-4 font-semibold">Versão</th><th className="p-4 font-semibold">Atualizado</th><th className="p-4 font-semibold">Ações</th></tr></thead>
          <tbody>
            {templates.map(template => <tr key={template.locale} className="border-t align-top hover:bg-slate-50"><td className="p-4"><p className="font-semibold text-gray-900">{template.name || 'Sem nome'}</p><p className="mt-1 font-mono text-xs text-gray-500">{template.key}</p><p className="mt-1 text-xs text-gray-500">Evento: {template.event}</p></td><td className="p-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">Empresa</span><p className="mt-2 text-xs text-gray-500">{template.operational ? 'Operacional' : 'Não integrado'}</p></td><td className="p-4"><p className="font-semibold">{localeShortLabel(template.locale)}</p><p className="text-xs text-gray-500">{String(template.country_code || '').toLowerCase() === 'br' ? 'Brasil' : 'Base editorial'}</p></td><td className="p-4"><EmailStatusBadge status={template.status} /><p className="mt-2 text-xs text-gray-500">{template.draft ? 'Rascunho editável' : 'Sem rascunho'}</p></td><td className="p-4">{template.published?.version ? `v${template.published.version}` : '—'}<p className="mt-1 text-xs text-gray-500">Rev. {template.revision ?? 0}</p></td><td className="p-4 text-xs text-gray-600"><p>{formatDate(template.updated_at)}</p><p className="mt-1">{template.author || '—'}</p></td><td className="space-y-2 p-4"><button type="button" className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold text-[#1F3B47] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={!canEdit} onClick={() => onEdit(template)}><Edit3 className="h-4 w-4" aria-hidden="true" />{canEdit ? 'Editar' : 'Editar indisponível'}</button><button type="button" className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={!canHistory} onClick={() => onVersions(template)}><History className="h-4 w-4" aria-hidden="true" />Versões</button><button type="button" className="flex w-full items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs font-semibold text-gray-500 disabled:cursor-not-allowed disabled:opacity-50" disabled={!canEdit} onClick={() => onEdit(template)}><Eye className="h-4 w-4" aria-hidden="true" />Prévia no editor</button></td></tr>)}
            {!loading && !templates.length && <tr><td colSpan={7} className="p-10 text-center text-sm text-gray-500">Nenhum template corresponde aos filtros. Limpe os filtros ou verifique o escopo autorizado.</td></tr>}
            {loading && <tr><td colSpan={7} className="p-10 text-center text-sm text-gray-500">Consultando catálogo autorizado…</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Filter({ label, value, onChange, options }) {
  return <label><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">{label}</span><select className={inputClass} value={value} onChange={event => onChange(event.target.value)}>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>
}
