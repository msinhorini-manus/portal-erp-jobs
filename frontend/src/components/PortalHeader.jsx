import { Link, useNavigate } from 'react-router-dom'
import { Plus, LayoutDashboard, Briefcase, FileText, Users, Building2, LogOut, ChevronDown, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useRef, useEffect } from 'react'

export default function PortalHeader({ user, onLogout, showNav = true }) {
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    setDropdownOpen(false)
    onLogout()
  }

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

          {/* Menu para usuário NÃO logado */}
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

          {/* Menu para EMPRESA logada */}
          {showNav && user && user.type === 'company' && (
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link to="/empresa/dashboard" className="hover:text-[#F7941D] transition-colors font-medium flex items-center gap-1.5">
                <LayoutDashboard size={16} />
                Dashboard
              </Link>
              <Link to="/empresa/vagas" className="hover:text-[#F7941D] transition-colors font-medium flex items-center gap-1.5">
                <Briefcase size={16} />
                Minhas Vagas
              </Link>
              <Link to="/empresa/vagas/nova" className="hover:text-[#F7941D] transition-colors font-medium flex items-center gap-1.5">
                <Plus size={16} />
                Publicar Vaga
              </Link>
              <Link to="/empresa/candidatos" className="hover:text-[#F7941D] transition-colors font-medium flex items-center gap-1.5">
                <Users size={16} />
                Candidatos
              </Link>
            </nav>
          )}

          {/* Menu para CANDIDATO logado */}
          {showNav && user && user.type === 'candidate' && (
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link to="/candidato/dashboard" className="hover:text-[#F7941D] transition-colors font-medium flex items-center gap-1.5">
                <LayoutDashboard size={16} />
                Dashboard
              </Link>
              <Link to="/vagas" className="hover:text-[#F7941D] transition-colors font-medium flex items-center gap-1.5">
                <Briefcase size={16} />
                Buscar Vagas
              </Link>
              <Link to="/candidato/curriculo" className="hover:text-[#F7941D] transition-colors font-medium flex items-center gap-1.5">
                <FileText size={16} />
                Meu Currículo
              </Link>
              <Link to="/candidato/candidaturas" className="hover:text-[#F7941D] transition-colors font-medium flex items-center gap-1.5">
                <Users size={16} />
                Candidaturas
              </Link>
            </nav>
          )}

          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition"
                >
                  <div className="w-8 h-8 bg-[#F7941D] rounded-full flex items-center justify-center font-bold text-white text-sm">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium text-white">{user?.name || 'Usuário'}</p>
                    <p className="text-xs text-white/70">{user?.type === 'company' ? 'Empresa' : 'Profissional'}</p>
                  </div>
                  <ChevronDown size={16} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {user.type === 'company' ? (
                      <>
                        <Link
                          to="/empresa/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                        >
                          <LayoutDashboard size={16} />
                          Dashboard
                        </Link>
                        <Link
                          to="/empresa/vagas"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                        >
                          <Briefcase size={16} />
                          Minhas Vagas
                        </Link>
                        <Link
                          to="/empresa/vagas/nova"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                        >
                          <Plus size={16} />
                          Publicar Vaga
                        </Link>
                        <Link
                          to="/empresa/perfil"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                        >
                          <Building2 size={16} />
                          Perfil da Empresa
                        </Link>
                        <hr className="my-2 border-gray-200" />
                      </>
                    ) : (
                      <>
                        <Link
                          to="/candidato/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                        >
                          <LayoutDashboard size={16} />
                          Dashboard
                        </Link>
                        <Link
                          to="/candidato/curriculo"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                        >
                          <FileText size={16} />
                          Meu Currículo
                        </Link>
                        <Link
                          to="/candidato/candidaturas"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                        >
                          <Users size={16} />
                          Minhas Candidaturas
                        </Link>
                        <Link
                          to="/candidato/perfil"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                        >
                          <User size={16} />
                          Meu Perfil
                        </Link>
                        <hr className="my-2 border-gray-200" />
                      </>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 transition w-full text-left"
                    >
                      <LogOut size={16} />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Button 
                  onClick={() => navigate('/empresa/publicar-vaga')}
                  className="bg-[#F7941D] hover:bg-[#e8850d] text-white text-xs font-semibold flex items-center gap-1.5 shadow-md px-3 py-1.5 h-8"
                >
                  <Plus size={14} />
                  Anunciar Vagas
                </Button>
                <Button 
                  onClick={() => navigate("/candidato/cadastro")} 
                  className="bg-white text-[#1F3B47] hover:bg-gray-100 text-xs font-medium px-3 py-1.5 h-8"
                >
                  Cadastrar CV
                </Button>
                <div className="flex items-center gap-1.5">
                  <Button 
                    onClick={() => navigate("/candidato/login")}
                    variant="outline" 
                    className="border-pink-500 text-pink-500 hover:bg-pink-50 text-xs font-medium px-3 py-1.5 h-8"
                    title="Entrar como Profissional"
                  >
                    👤 Profissional
                  </Button>
                  <Button 
                    onClick={() => navigate("/empresa/login")}
                    className="bg-pink-500 text-white hover:bg-pink-600 text-xs font-medium px-3 py-1.5 h-8"
                    title="Entrar como Empresa"
                  >
                    🏢 Empresa
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
