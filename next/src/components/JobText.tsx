import { hasJobText, jobBulletItems } from '@/lib/job-presentation'

type Props = {
  text?: string | null
  variant?: 'list' | 'chips' | 'text'
  className?: string
}

/** Editorial text is escaped by React, never treated as HTML or summarized. */
export function JobText({ text, variant = 'list', className = '' }: Props) {
  if (!hasJobText(text)) return null
  const items = variant === 'text' ? null : jobBulletItems(text)
  if (!items) {
    return <div className={`whitespace-pre-wrap break-words text-slate-600 leading-7 ${className}`}>{text}</div>
  }
  return (
    <ul className={variant === 'chips' ? `flex flex-wrap gap-3 ${className}` : `space-y-2 ${className}`}>
      {items.map((item, index) => (
        <li
          key={index}
          className={variant === 'chips'
            ? 'min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm leading-6 text-slate-700'
            : 'flex min-w-0 items-start gap-3 text-slate-600 leading-7'}
        >
          {variant !== 'chips' && <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-teal-600" aria-hidden="true" />}
          <span className="min-w-0 whitespace-pre-wrap break-words">{item}</span>
        </li>
      ))}
    </ul>
  )
}
