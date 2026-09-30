import { Globe2 } from 'lucide-react'

const ecosystemLinks = [
  { href: 'https://portalerp.com/br', label: 'Inteligência' },
  { href: 'https://membro.portalerp.com.br/', label: 'Programa de Membros' },
  { href: 'https://portalerp.me/', label: 'Portal ERP Pro' },
]

export default function EcosystemBar() {
  return (
    <div className="border-b border-slate-200 bg-[#f4f2ee] text-[#0F2530]">
      <div className="container mx-auto flex min-h-8 items-center justify-between gap-4 px-4 lg:px-6">
        <a
          href="https://portalerp.com/br"
          target="_blank"
          rel="noreferrer"
          className="text-[10px] font-extrabold uppercase tracking-[0.18em] transition-colors hover:text-[#F7941D] sm:text-[11px] sm:tracking-[0.22em]"
        >
          Ecossistema Portal ERP
        </a>

        <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-600 sm:text-[11px]">
          <nav className="hidden items-center gap-4 md:flex" aria-label="Ecossistema Portal ERP">
            {ecosystemLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-[#F7941D]"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <span className="hidden h-3 w-px bg-slate-300 md:block" aria-hidden="true" />
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Globe2 className="h-3 w-3" aria-hidden="true" />
            Brasil
            <span className="text-slate-300" aria-hidden="true">·</span>
            PT
          </span>
        </div>
      </div>
    </div>
  )
}
