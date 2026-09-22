import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-portal-dark text-white py-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-portal-orange rounded-full flex items-center justify-center font-bold text-white text-sm">
                P
              </div>
              <span className="text-lg font-bold">
                Portal <span className="text-portal-orange">ERP</span> Jobs
              </span>
            </Link>
            <p className="text-white/60 text-sm">
              A plataforma de empregos especializada no setor de software e ERP.
            </p>
          </div>

          {/* Para Candidatos */}
          <div>
            <h4 className="font-semibold mb-4 text-white/90">Para Candidatos</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/vagas" className="text-white/60 hover:text-white transition-colors">Buscar Vagas</Link></li>
              <li><Link href="/candidato/cadastro" className="text-white/60 hover:text-white transition-colors">Cadastrar Currículo</Link></li>
              <li><Link href="/areas" className="text-white/60 hover:text-white transition-colors">Áreas de Atuação</Link></li>
              <li><Link href="/tecnologias" className="text-white/60 hover:text-white transition-colors">Tecnologias</Link></li>
              <li><Link href="/salarios" className="text-white/60 hover:text-white transition-colors">Guia de Salários</Link></li>
            </ul>
          </div>

          {/* Para Empresas */}
          <div>
            <h4 className="font-semibold mb-4 text-white/90">Para Empresas</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/empresa/cadastro" className="text-white/60 hover:text-white transition-colors">Publicar Vaga</Link></li>
              <li><Link href="/empresa/cadastro" className="text-white/60 hover:text-white transition-colors">Cadastrar Empresa</Link></li>
              <li><Link href="/empresas" className="text-white/60 hover:text-white transition-colors">Empresas Cadastradas</Link></li>
              <li><Link href="/conteudo" className="text-white/60 hover:text-white transition-colors">Blog & Conteúdo</Link></li>
            </ul>
          </div>

          {/* Institucional */}
          <div>
            <h4 className="font-semibold mb-4 text-white/90">Institucional</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/sobre" className="text-white/60 hover:text-white transition-colors">Sobre Nós</Link></li>
              <li><Link href="/contato" className="text-white/60 hover:text-white transition-colors">Contato</Link></li>
              <li><Link href="/termos" className="text-white/60 hover:text-white transition-colors">Termos de Uso</Link></li>
              <li><Link href="/privacidade" className="text-white/60 hover:text-white transition-colors">Política de Privacidade</Link></li>
              <li><a href="https://erpsummit.online" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">ERPSummit.online</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 text-center">
          <p className="text-white/50 text-sm">
            © {new Date().getFullYear()} Portal ERP Jobs. Todos os direitos reservados. Uma empresa do Portal ERP Group.
          </p>
        </div>
      </div>
    </footer>
  )
}
