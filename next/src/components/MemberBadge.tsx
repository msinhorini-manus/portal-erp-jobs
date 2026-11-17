type Props = {
  isMember?: unknown
  variant?: 'card' | 'inline'
}

/** Public membership is affirmative only; malformed/truthy flags never confer it. */
export function MemberBadge({ isMember, variant = 'inline' }: Props) {
  if (isMember !== true) return null

  return (
    <span
      data-member-badge={variant}
      className={variant === 'card'
        ? 'block min-w-0 max-w-full whitespace-normal break-words rounded-t-[11px] bg-portal-dark px-3 py-2 text-[11px] font-semibold leading-4 text-white'
        : 'mt-2 block min-w-0 max-w-full whitespace-normal break-words text-sm leading-5 text-white/80'}
    >
      Membro Ecossistema Portal ERP
    </span>
  )
}
