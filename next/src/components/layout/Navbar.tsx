'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, Search, Building2, User } from 'lucide-react'
import type { RegionalSite } from '@/lib/site'
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
    <header className="bg-portal-dark text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-portal-orange rounded-full flex items-center justify-center font-bold text-white text-sm">
              P
            </div>
            <div className="text-lg font-bold">
              Portal <span className="text-portal-orange">ERP</span> Jobs
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white/90 hover:text-portal-orange transition-colors text-sm font-medium"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <SiteSelector currentSite={currentSite} sites={sites} />
            <Link
              href="/candidato/login"
              className="flex items-center gap-1.5 text-sm text-white/90 hover:text-white transition-colors"
            >
              <User className="w-4 h-4" />
              Candidato
            </Link>
            <Link
              href="/empresa/login"
              className="flex items-center gap-1.5 bg-portal-orange hover:bg-portal-orange-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Building2 className="w-4 h-4" />
              Empresa
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-white/10 pt-4">
            <div className="flex flex-col gap-3">
              <SiteSelector currentSite={currentSite} sites={sites} compact />
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white/90 hover:text-portal-orange transition-colors text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <hr className="border-white/10 my-2" />
              <Link
                href="/candidato/login"
                className="text-white/90 hover:text-white text-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                Área do Candidato
              </Link>
              <Link
                href="/empresa/login"
                className="bg-portal-orange text-white px-4 py-2 rounded-lg text-sm font-medium text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Área da Empresa
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
