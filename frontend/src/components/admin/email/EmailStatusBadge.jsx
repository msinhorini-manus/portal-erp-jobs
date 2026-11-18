import { STATUS_LABELS, STATUS_TONES } from './email-center-helpers.mjs'

export default function EmailStatusBadge({ status }) {
  const label = STATUS_LABELS[status] || 'Estado desconhecido'
  const tone = STATUS_TONES[status] || 'border-slate-200 bg-slate-100 text-slate-700'
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>
}
