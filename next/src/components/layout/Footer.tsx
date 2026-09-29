import Link from 'next/link'

import { BrandLockup } from './BrandLockup'

export function Footer() {
  return (
    <footer className="bg-portal-dark py-12 text-white">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 gap-9 md:grid-cols-2 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <Link href="/" aria-label="Jobs by Portal ERP — início" className="inline-block">
              <BrandLockup onDark className="w-[220px]" />
            </Link>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/65">
              Carreiras, talentos e empresas conectados pela autoridade do Portal ERP.
            </p>
            <p className="mt-3 font-display text-xl font-extrabold text-white">O mercado de software trabalha aqui.</p>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-portal-orange">Profissionais</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/vagas" className="text-white/65 hover:text-white">Buscar vagas</Link></li>
              <li><Link href="/candidato/cadastro" className="text-white/65 hover:text-white">Cadastrar currículo</Link></li>
              <li><Link href="/areas" className="text-white/65 hover:text-white">Áreas de atuação</Link></li>
              <li><a href="https://portalerp.me/" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-300 hover:text-white">Conhecer Portal ERP Pro</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-portal-orange">Empresas</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/empresa/cadastro" className="text-white/65 hover:text-white">Publicar vaga</Link></li>
              <li><Link href="/empresas" className="text-white/65 hover:text-white">Empresas cadastradas</Link></li>
              <li><a href="https://membro.portalerp.com.br/" target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-300 hover:text-white">Programa de Membros</a></li>
              <li><a href="https://softhub.portalerp.com/" target="_blank" rel="noopener noreferrer" className="text-white/65 hover:text-white">SoftHub</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-portal-orange">Portal ERP</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="https://portalerp.com.br/" target="_blank" rel="noopener noreferrer" className="text-white/65 hover:text-white">Conteúdo e mercado</a></li>
              <li><Link href="/conteudo" className="text-white/65 hover:text-white">Conteúdo de carreira</Link></li>
              <li><a href="https://erpsummit.online" target="_blank" rel="noopener noreferrer" className="text-white/65 hover:text-white">ERP Summit</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-7 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Jobs by Portal ERP. Todos os direitos reservados.</p>
          <p>Portal ERP | SoftHub | Jobs</p>
        </div>
      </div>
    </footer>
  )
}
