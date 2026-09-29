'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Building2, Menu, User, X } from 'lucide-react'

import type { RegionalSite } from '@/lib/site'
import { BrandLockup } from './BrandLockup'
import { SiteSelector } from './SiteSelector'

const navLinks = [
  { href: '/vagas', label: 'Vagas' },
  { href: '/empresas', label: 'Empresas' },
  { href: '/areas', label: 'Áreas' },
  { href: '/tecnologias', label: 'Tecnologias' },
  { href: '/salarios', label: 'Salários' },
  { href: '/conteudo', label: 'Conteúdo' },
]

type NavbarProps = {
  currentSite: RegionalSite
  sites: RegionalSite[]
}

export function Navbar({ currentSite, sites }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-portal-dark text-white shadow-[0_10px_30px_rgba(15,37,48,0.16)]">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex min-h-[76px] items-center justify-between gap-4">
          <Link href="/" aria-label="Jobs by Portal ERP — início" className="shrink-0">
            <BrandLockup onDark priority className="w-[176px] sm:w-[204px]" />
          </Link>

          <nav className="hidden items-center gap-5 xl:flex" aria-label="Navegação principal">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-white/78 transition-colors hover:text-portal-orange"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 xl:flex">
            <SiteSelector currentSite={currentSite} sites={sites} />
            <Link
              href="/candidato/login"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <User className="h-4 w-4" />
              Candidato
            </Link>
            <Link
              href="/empresa/login"
              className="flex items-center gap-1.5 rounded-xl bg-portal-orange px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-portal-orange-dark"
            >
              <Building2 className="h-4 w-4" />
              Empresa
            </Link>
          </div>

          <button
            type="button"
            className="rounded-lg border border-white/15 p-2 text-white transition hover:bg-white/10 xl:hidden"
            onClick={() => setMobileMenuOpen(value => !value)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="border-t border-white/10 py-5 xl:hidden" aria-label="Navegação móvel">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="sm:col-span-2"><SiteSelector currentSite={currentSite} sites={sites} compact /></div>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/candidato/login"
                className="mt-2 rounded-lg border border-white/20 px-4 py-3 text-center text-sm font-semibold text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                Área do candidato
              </Link>
              <Link
                href="/empresa/login"
                className="mt-2 rounded-lg bg-portal-orange px-4 py-3 text-center text-sm font-bold text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                Área da empresa
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
