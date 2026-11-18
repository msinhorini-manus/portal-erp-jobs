import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { compareFields, formatDate, localeLabel } from './email-center-helpers.mjs'

const fieldLabels = { name: 'Nome', subject: 'Assunto', html: 'HTML', text: 'Texto simples' }

export default function EmailVersionsDialog({ open, template, versions, loading, draft, canRestore, onOpenChange, onLoad, onRestore }) {
  const [selectedVersion, setSelectedVersion] = useState(null)
  useEffect(() => {
    if (open) {
      setSelectedVersion(null)
      onLoad()
    }
  }, [open, onLoad])
  const selected = versions.find(version => String(version.version) === String(selectedVersion))
  const changedFields = selected ? compareFields(selected, draft) : []
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader><DialogTitle>Versões · {localeLabel(template?.locale)}</DialogTitle><DialogDescription>Versões publicadas são imutáveis. Restaurar cria um novo rascunho; não reescreve histórico nem ativa disparos.</DialogDescription></DialogHeader>
        {loading && <p role="status" className="rounded-lg bg-slate-50 p-4 text-sm text-gray-600">Carregando versões…</p>}
        {!loading && !versions.length && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">Nenhuma versão publicada registrada para este locale.</p>}
        {!loading && versions.length > 0 && <div className="grid gap-4 md:grid-cols-[minmax(220px,0.75fr)_minmax(0,1.25fr)]"><div className="space-y-2" aria-label="Lista de versões">{versions.map(version => <button type="button" key={version.version} className={`w-full rounded-lg border p-3 text-left text-sm ${String(selectedVersion) === String(version.version) ? 'border-[#F7941D] bg-orange-50' : 'hover:bg-slate-50'}`} onClick={() => setSelectedVersion(version.version)}><p className="font-semibold">Versão {version.version}</p><p className="text-xs text-gray-600">{formatDate(version.published_at)} · {version.author || 'Autor não informado'}</p><p className="mt-1 truncate text-xs text-gray-500">{version.name || 'Sem nome'}</p></button>)}</div><div className="min-w-0 rounded-lg border bg-slate-50 p-4">{!selected && <p className="text-sm text-gray-600">Selecione uma versão para comparar com o rascunho local atual.</p>}{selected && <div className="space-y-4"><div><p className="font-semibold text-gray-900">Comparação com o rascunho atual</p><p className="mt-1 text-sm text-gray-600">Campos diferentes: {changedFields.length ? changedFields.map(field => fieldLabels[field]).join(', ') : 'nenhum'}</p></div>{['subject', 'html', 'text'].map(field => <div key={field} className="grid gap-2 lg:grid-cols-2"><div><p className="mb-1 text-xs font-semibold uppercase text-gray-500">Versão {selected.version} · {fieldLabels[field]}</p><pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded border bg-white p-2 text-xs">{selected[field] || '—'}</pre></div><div><p className="mb-1 text-xs font-semibold uppercase text-gray-500">Rascunho atual · {fieldLabels[field]}</p><pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded border bg-white p-2 text-xs">{draft?.[field] || '—'}</pre></div></div>)}<button type="button" className="inline-flex items-center gap-2 rounded-md border border-[#1F3B47] px-3 py-2 text-sm font-semibold text-[#1F3B47] disabled:cursor-not-allowed disabled:opacity-50" disabled={!canRestore} onClick={() => onRestore(selected)}><RotateCcw className="h-4 w-4" aria-hidden="true" />Restaurar como novo rascunho</button></div>}</div></div>}
        <DialogFooter><button type="button" className="rounded-md border px-4 py-2 text-sm font-semibold" onClick={() => onOpenChange(false)}>Fechar</button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
