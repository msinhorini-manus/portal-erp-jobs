import { Link } from 'react-router-dom'

/**
 * Footer Global - Rodapé padrão do Portal ERP Jobs
 */
export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-[#1F3B47] text-white py-12 mt-auto">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo e descrição */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-[#F7941D] rounded-full flex items-center justify-center font-bold">
                P
              </div>
              <div className="text-xl font-bold">
                Portal <span className="text-[#F7941D]">ERP</span> Jobs
              </div>
            </Link>
            <p className="text-sm text-white/60">
              A plataforma de empregos especializada no setor de software e ERP.
            </p>
          </div>

          {/* Links para Candidatos */}
          <div>
            <h4 className="font-semibold mb-4 text-[#F7941D]">Para Candidatos</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link to="/vagas" className="hover:text-white transition-colors">Buscar Vagas</Link></li>
              <li><Link to="/candidato/cadastro" className="hover:text-white transition-colors">Cadastrar Currículo</Link></li>
              <li><Link to="/areas" className="hover:text-white transition-colors">Áreas de Atuação</Link></li>
              <li><Link to="/tecnologias" className="hover:text-white transition-colors">Tecnologias</Link></li>
              <li><Link to="/salarios" className="hover:text-white transition-colors">Guia de Salários</Link></li>
            </ul>
          </div>

          {/* Links para Empresas */}
          <div>
            <h4 className="font-semibold mb-4 text-[#F7941D]">Para Empresas</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link to="/empresa/publicar-vaga" className="hover:text-white transition-colors">Publicar Vaga</Link></li>
              <li><Link to="/empresa/cadastro" className="hover:text-white transition-colors">Cadastrar Empresa</Link></li>
              <li><Link to="/empresas" className="hover:text-white transition-colors">Empresas Cadastradas</Link></li>
              <li><Link to="/conteudo" className="hover:text-white transition-colors">Blog & Conteúdo</Link></li>
            </ul>
          </div>

          {/* Links Institucionais */}
          <div>
            <h4 className="font-semibold mb-4 text-[#F7941D]">Institucional</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link to="/sobre" className="hover:text-white transition-colors">Sobre Nós</Link></li>
              <li><Link to="/contato" className="hover:text-white transition-colors">Contato</Link></li>
              <li><Link to="/termos" className="hover:text-white transition-colors">Termos de Uso</Link></li>
              <li><Link to="/privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link></li>
            </ul>
          </div>
        </div>

        {/* Linha divisória */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-white/60">
              © {currentYear} Portal ERP Jobs. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-4 text-sm text-white/60">
              <span>Parte do ecossistema</span>
              <a
                href="https://erpsummit.online"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#F7941D] hover:underline font-medium"
              >
                ERPSummit.online
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
