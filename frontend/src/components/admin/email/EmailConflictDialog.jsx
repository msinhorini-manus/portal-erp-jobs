import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { contentDiff, localeLabel } from './email-center-helpers.mjs'

const fields = { name: 'Nome', subject: 'Assunto', html: 'HTML', text: 'Texto simples' }

export default function EmailConflictDialog({ open, locale, localDraft, remoteTemplate, onOpenChange, onReload }) {
  const [busy, setBusy] = useState(false)
  const remoteDraft = remoteTemplate?.draft || remoteTemplate?.published || {}
  const diff = contentDiff(remoteDraft, localDraft)
  async function reload() {
    setBusy(true)
    try { await onReload() } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>Conflito de edição · {localeLabel(locale)}</DialogTitle><DialogDescription>Outra alteração foi persistida antes desta operação. Seu texto local foi preservado. Compare e escolha explicitamente se deseja recarregar a versão do servidor.</DialogDescription></DialogHeader>
        <div className="space-y-3 text-sm"><div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">Nenhuma alteração local foi sobrescrita.</div>{remoteTemplate ? <div className="space-y-2">{Object.entries(fields).map(([field, label]) => <div key={field} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-3"><strong>{label}</strong><span className={diff[field].changed ? 'font-semibold text-amber-800' : 'text-emerald-700'}>{diff[field].changed ? 'Diferente' : 'Igual'}</span></div>{diff[field].changed && <div className="mt-2 grid gap-2 md:grid-cols-2"><pre className="max-h-28 overflow-auto whitespace-pre-wrap break-words rounded bg-orange-50 p-2 text-xs">Local: {localDraft?.[field] || '—'}</pre><pre className="max-h-28 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-50 p-2 text-xs">Servidor: {remoteDraft?.[field] || '—'}</pre></div>}</div>)}</div> : <p className="rounded-lg border p-3 text-gray-600">O backend não retornou a versão concorrente. Você pode recarregar o catálogo para obtê-la; o rascunho local só será substituído após sua confirmação.</p>}</div>
        <DialogFooter><button type="button" className="rounded-md border px-4 py-2 text-sm font-semibold" disabled={busy} onClick={() => onOpenChange(false)}>Manter edição local</button><button type="button" className="rounded-md bg-[#1F3B47] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy} onClick={reload}>{busy ? 'Recarregando…' : 'Recarregar versão atual'}</button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
