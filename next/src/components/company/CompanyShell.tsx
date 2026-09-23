'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BriefcaseBusiness, Building2, LayoutDashboard, LogOut, Menu, UserRoundSearch, UsersRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { clearLegacyCompanySession, companyAuthPath, companyFetch, CompanySession, statusLabel } from '@/lib/company-client'

const NAV = [
  { href: '/empresa/dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/empresa/vagas', label: 'Vagas', icon: BriefcaseBusiness },
  { href: '/empresa/candidatos', label: 'Candidatos', icon: UserRoundSearch },
  { href: '/empresa/perfil', label: 'Perfil', icon: Building2 },
  { href: '/empresa/usuarios', label: 'Equipe', icon: UsersRound },
]

export function CompanyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [session, setSession] = useState<CompanySession | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    clearLegacyCompanySession()
    companyFetch<CompanySession>(companyAuthPath('me')).then(setSession).catch(reason => {
      if ([401, 403].includes((reason as { status?: number }).status || 0)) router.replace(`/empresa/login?redirect=${encodeURIComponent(pathname)}`)
    })
  }, [pathname, router])

  async function logout() {
    try { await companyFetch(companyAuthPath('logout'), { method: 'POST' }) } finally {
      clearLegacyCompanySession()
      router.replace('/empresa/login')
      router.refresh()
    }
  }

  return (
    <section className="min-h-[75vh] bg-slate-50">
      <div className="border-b border-slate-200 bg-[#0d2f3b] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Portal empresarial {session?.site_code ? `· ${session.site_code}` : ''}</p><h1 className="mt-1 text-xl font-bold">{session?.company_name || 'Área da empresa'}</h1></div>
          <div className="flex items-center gap-3"><span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs font-semibold sm:inline">{statusLabel(session?.site_status)}</span><button onClick={() => setOpen(value => !value)} className="rounded-lg border border-white/20 p-2 lg:hidden" aria-label="Abrir menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button><button onClick={logout} className="hidden items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold hover:bg-white/10 lg:flex"><LogOut className="h-4 w-4" /> Sair</button></div>
        </div>
        <nav className={`${open ? 'flex' : 'hidden'} mx-auto max-w-7xl flex-col gap-1 px-4 pb-4 lg:flex lg:flex-row lg:pb-0`}>
          {NAV.map(item => { const active = pathname === item.href || (item.href !== '/empresa/dashboard' && pathname.startsWith(`${item.href}/`)); return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${active ? 'border-orange-400 text-orange-300' : 'border-transparent text-slate-200 hover:text-white'}`}><item.icon className="h-4 w-4" />{item.label}</Link> })}
          <button onClick={logout} className="flex items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-200 lg:hidden"><LogOut className="h-4 w-4" /> Sair</button>
        </nav>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8">{children}</div>
    </section>
  )
}
