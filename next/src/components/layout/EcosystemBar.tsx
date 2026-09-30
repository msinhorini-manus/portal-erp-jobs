import Link from 'next/link'

const ecosystemLinks = [
  { href: 'https://portalerp.com/br', label: 'Inteligência' },
  { href: 'https://membro.portalerp.com.br/', label: 'Programa de Membros' },
  { href: 'https://portalerp.me/', label: 'Portal ERP Pro' },
]

export function EcosystemBar() {
  return (
    <div className="border-b border-slate-200 bg-[#f4f2ee] text-[#0F2530]">
      <div className="container mx-auto flex min-h-8 items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="https://portalerp.com/br"
          target="_blank"
          rel="noreferrer"
          className="text-[10px] font-extrabold uppercase tracking-[0.18em] transition-colors hover:text-portal-orange sm:text-[11px] sm:tracking-[0.22em]"
        >
          Ecossistema Portal ERP
        </Link>

        <nav className="hidden items-center gap-4 text-[11px] font-semibold text-slate-600 md:flex" aria-label="Ecossistema Portal ERP">
          {ecosystemLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-portal-orange"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
