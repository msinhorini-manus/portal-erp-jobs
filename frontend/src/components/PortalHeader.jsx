import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PortalHeader({ user, onLogout, showNav = true }) {
  const navigate = useNavigate()

  return (
    <header className="bg-[#1F3B47] text-white shadow-md">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-10 h-10 bg-[#F7941D] rounded-full flex items-center justify-center font-bold text-white">
                P
              </div>
              <div className="text-xl font-bold">
                Portal <span className="text-[#4CAF50]">ERP</span> Jobs
              </div>
            </div>
            <div className="text-xs text-white/70 ml-2">Software Careers</div>
          </Link>

          {showNav && !user && (
            <nav className="hidden md:flex items-center gap-8 text-sm">
              <Link to="/vagas" className="hover:text-[#F7941D] transition-colors font-medium">Vagas</Link>
              <Link to="/empresas" className="hover:text-[#F7941D] transition-colors font-medium">Empresas</Link>
              <Link to="/areas" className="hover:text-[#F7941D] transition-colors font-medium">Áreas</Link>
              <Link to="/tecnologias" className="hover:text-[#F7941D] transition-colors font-medium">Tecnologias</Link>
              <Link to="/salarios" className="hover:text-[#F7941D] transition-colors font-medium">Salários</Link>
              <Link to="/conteudo" className="hover:text-[#F7941D] transition-colors font-medium">Conteúdo</Link>
            </nav>
          )}

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{user?.name}</p>
                  <p className="text-xs text-white/70">{user?.email}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition text-sm font-medium shadow-md"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => navigate('/empresa/publicar-vaga')}
                  className="bg-[#F7941D] hover:bg-[#e8850d] text-white text-sm font-bold flex items-center gap-2 shadow-lg"
                >
                  <Plus size={18} />
                  Anunciar Vagas Grátis
                </Button>
                <Button 
                  onClick={() => navigate("/candidato/cadastro")} 
                  className="bg-white text-[#1F3B47] hover:bg-gray-100 text-sm font-medium"
                >
                  Cadastrar CV grátis
                </Button>
                <Button 
                  onClick={() => navigate("/candidato/login")}
                  variant="outline" 
                  className="border-pink-500 bg-pink-500 text-white hover:bg-pink-600 text-sm font-medium"
                >
                  Entrar
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

