import { useState } from 'react'
import { Monitor, Smartphone } from 'lucide-react'
import { buildPreviewSrcDoc } from './email-center-helpers.mjs'

export default function EmailPreviewPanel({ preview, loading, onPreview, canPreview }) {
  const [mode, setMode] = useState('desktop')
  const hasPreview = Boolean(preview?.html || preview?.text || preview?.subject)

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-white shadow-sm" aria-labelledby="email-preview-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 id="email-preview-title" className="text-lg font-bold text-[#1F3B47]">Prévia</h2>
          <p className="text-xs text-gray-500">{preview?.notice || 'Prévia — dados fictícios; nenhum e-mail enviado'}</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-gray-50 p-1" aria-label="Largura da prévia">
          <button type="button" className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${mode === 'desktop' ? 'bg-white text-[#1F3B47] shadow-sm' : 'text-gray-600'}`} aria-pressed={mode === 'desktop'} onClick={() => setMode('desktop')}>
            <Monitor className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />Desktop
          </button>
          <button type="button" className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${mode === 'mobile' ? 'bg-white text-[#1F3B47] shadow-sm' : 'text-gray-600'}`} aria-pressed={mode === 'mobile'} onClick={() => setMode('mobile')}>
            <Smartphone className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />Mobile
          </button>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-5">
        {loading && <p role="status" className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">Gerando prévia segura…</p>}
        {!loading && !hasPreview && <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">Edite o conteúdo e selecione “Visualizar” para solicitar uma prévia do backend.</div>}
        {!loading && hasPreview && (
          <>
            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Assunto</p>
              <p className="mt-1 break-words font-medium text-gray-900">{preview.subject || '—'}</p>
            </div>
            <div className={`mx-auto overflow-hidden rounded-lg border bg-white shadow-sm transition-all ${mode === 'mobile' ? 'max-w-[390px]' : 'w-full'}`}>
              <iframe
                title="Prévia HTML do e-mail, conteúdo isolado"
                className="h-[380px] w-full border-0"
                sandbox=""
                srcDoc={buildPreviewSrcDoc(preview.html)}
              />
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Texto simples</p>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-sans text-sm text-gray-700">{preview.text || '—'}</pre>
            </div>
          </>
        )}
        <button type="button" className="w-full rounded-md border border-[#1F3B47] px-4 py-2.5 text-sm font-semibold text-[#1F3B47] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={!canPreview || loading} onClick={onPreview}>
          {loading ? 'Gerando prévia…' : 'Visualizar conteúdo atual'}
        </button>
      </div>
    </section>
  )
}
