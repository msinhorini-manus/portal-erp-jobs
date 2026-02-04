import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Plus, Menu, X, User, Building2, Shield, LogOut, Home, Briefcase, Users, BarChart3, FileText, Settings, ChevronDown, LayoutDashboard, Heart, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Navbar Inteligente - Componente de navegação global
 * Se adapta automaticamente ao tipo de usuário logado (candidato, empresa, admin)
 */
export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, userType, isAuthenticated, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  // Fechar menu do usuário ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Links públicos (sempre visíveis)
  const publicLinks = [
    { to: '/vagas', label: 'Vagas' },
    { to: '/empresas', label: 'Empresas' },
    { to: '/areas', label: 'Áreas' },
    { to: '/tecnologias', label: 'Tecnologias' },
    { to: '/salarios', label: 'Salários' },
    { to: '/conteudo', label: 'Conteúdo' },
  ]

  // Links específicos por tipo de usuário
  const candidateLinks = [
    { to: '/profissional/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/profissional/candidaturas', label: 'Candidaturas', icon: Send },
    { to: '/profissional/curriculo', label: 'Meu Currículo', icon: FileText },
    { to: '/profissional/vagas-salvas', label: 'Vagas Salvas', icon: Heart },
    { to: '/profissional/perfil', label: 'Perfil', icon: User },
  ]

  const companyLinks = [
    { to: '/empresa/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/empresa/vagas', label: 'Minhas Vagas', icon: Briefcase },
    { to: '/empresa/vagas/nova', label: 'Publicar Vaga', icon: Plus },
    { to: '/empresa/candidatos', label: 'Candidatos', icon: Users },
    { to: '/empresa/perfil', label: 'Perfil', icon: Building2 },
  ]

  const adminLinks = [
    { to: '/admin', label: 'Dashboard', icon: BarChart3 },
    { to: '/admin/empresas', label: 'Empresas', icon: Building2 },
    { to: '/admin/candidatos', label: 'Candidatos', icon: Users },
    { to: '/admin/vagas', label: 'Vagas', icon: Briefcase },
  ]

  // Determinar quais links mostrar baseado no tipo de usuário
  const getUserLinks = () => {
    if (!isAuthenticated) return []
    switch (userType) {
      case 'candidate': return candidateLinks
      case 'company': return companyLinks
      case 'admin': return adminLinks
      default: return []
    }
  }

  // Obter informações do usuário
  const getUserInfo = () => {
    switch (userType) {
      case 'candidate': 
        return { 
          label: 'Profissional', 
          color: 'bg-blue-500', 
          borderColor: 'border-blue-500',
          textColor: 'text-blue-500',
          icon: User,
          dashboardPath: '/profissional/dashboard'
        }
      case 'company': 
        return { 
          label: 'Empresa', 
          color: 'bg-emerald-500', 
          borderColor: 'border-emerald-500',
          textColor: 'text-emerald-500',
          icon: Building2,
          dashboardPath: '/empresa/dashboard'
        }
      case 'admin': 
        return { 
          label: 'Administrador', 
          color: 'bg-purple-500', 
          borderColor: 'border-purple-500',
          textColor: 'text-purple-500',
          icon: Shield,
          dashboardPath: '/admin'
        }
      default: return null
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
    setMobileMenuOpen(false)
    setUserMenuOpen(false)
  }

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const userInfo = getUserInfo()
  const userLinks = getUserLinks()

  return (
    <header className="bg-[#1F3B47] text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-9 h-9 bg-[#F7941D] rounded-full flex items-center justify-center font-bold text-white text-sm">
              P
            </div>
            <div className="hidden sm:block">
              <div className="text-lg font-bold leading-tight">
                Portal <span className="text-[#F7941D]">ERP</span> Jobs
              </div>
              <div className="text-[10px] text-white/60 -mt-1">Software Careers</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-5">
            {/* Links públicos ou links do usuário */}
            {isAuthenticated ? (
              // Mostrar links específicos do usuário
              <>
                {userLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors px-2 py-1 rounded ${
                      isActive(link.to) 
                        ? 'text-[#F7941D] bg-white/10' 
                        : 'text-white/90 hover:text-[#F7941D] hover:bg-white/5'
                    }`}
                  >
                    {link.icon && <link.icon size={16} />}
                    {link.label}
                  </Link>
                ))}
                <div className="w-px h-6 bg-white/20 mx-1" />
                <Link
                  to="/vagas"
                  className={`text-sm font-medium transition-colors px-2 py-1 rounded ${
                    location.pathname === '/vagas' ? 'text-[#F7941D] bg-white/10' : 'text-white/90 hover:text-[#F7941D] hover:bg-white/5'
                  }`}
                >
                  Buscar Vagas
                </Link>
              </>
            ) : (
              // Mostrar links públicos para visitantes
              publicLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm font-medium transition-colors ${
                    isActive(link.to) 
                      ? 'text-[#F7941D]' 
                      : 'text-white/90 hover:text-[#F7941D]'
                  }`}
                >
                  {link.label}
                </Link>
              ))
            )}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated && userInfo ? (
              // Usuário logado - Card de identificação
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border-2 ${userInfo.borderColor} bg-white/5 hover:bg-white/10 transition-all`}
                >
                  {/* Avatar com inicial */}
                  <div className={`w-9 h-9 ${userInfo.color} rounded-full flex items-center justify-center font-bold text-white text-sm shadow-lg`}>
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  
                  {/* Informações do usuário */}
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white leading-tight">
                      {user?.name || 'Usuário'}
                    </p>
                    <p className={`text-xs font-medium ${userInfo.textColor}`}>
                      {userInfo.label}
                    </p>
                  </div>
                  
                  {/* Seta do dropdown */}
                  <ChevronDown 
                    size={18} 
                    className={`text-white/70 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} 
                  />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 overflow-hidden">
                    {/* Header do dropdown */}
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${userInfo.color} rounded-full flex items-center justify-center font-bold text-white shadow`}>
                          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{user?.name || 'Usuário'}</p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Link destacado para Dashboard */}
                    <Link
                      to={userInfo.dashboardPath}
                      onClick={() => setUserMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 ${userInfo.color} text-white font-medium hover:opacity-90 transition mx-2 my-2 rounded-lg`}
                    >
                      <LayoutDashboard size={18} />
                      Ir para o Dashboard
                    </Link>

                    <div className="h-px bg-gray-100 mx-2" />

                    {/* Links do menu */}
                    {userLinks.slice(1).map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition"
                      >
                        {link.icon && <link.icon size={16} className="text-gray-400" />}
                        {link.label}
                      </Link>
                    ))}

                    <div className="h-px bg-gray-100 mx-2 my-1" />

                    {/* Botão de logout */}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 transition w-full text-left"
                    >
                      <LogOut size={16} />
                      Sair da conta
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Visitante não logado
              <>
                <Button 
                  onClick={() => navigate('/empresa/publicar-vaga')}
                  className="bg-[#F7941D] hover:bg-[#e8850d] text-white text-xs font-semibold gap-1.5 h-8"
                >
                  <Plus size={14} />
                  Anunciar Vagas
                </Button>
                <Button 
                  onClick={() => navigate('/candidato/cadastro')} 
                  variant="outline"
                  className="border-white/50 bg-white text-[#1F3B47] hover:bg-gray-100 text-xs h-8 font-semibold"
                >
                  Cadastrar CV
                </Button>
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => navigate('/candidato/login')}
                    variant="ghost"
                    className="text-white hover:bg-white/10 text-xs h-8 gap-1"
                  >
                    <User size={14} />
                    Profissional
                  </Button>
                  <Button 
                    onClick={() => navigate('/empresa/login')}
                    className="bg-white text-[#1F3B47] hover:bg-gray-100 text-xs h-8 gap-1"
                  >
                    <Building2 size={14} />
                    Empresa
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-white/10">
            <nav className="flex flex-col gap-2">
              {/* Links do usuário ou públicos */}
              {isAuthenticated && userInfo ? (
                <>
                  {/* Card do usuário no mobile */}
                  <div className={`flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border-2 ${userInfo.borderColor} mb-3`}>
                    <div className={`w-12 h-12 ${userInfo.color} rounded-full flex items-center justify-center font-bold text-white text-lg shadow-lg`}>
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-semibold text-white">{user?.name || 'Usuário'}</p>
                      <p className={`text-sm font-medium ${userInfo.textColor}`}>{userInfo.label}</p>
                    </div>
                  </div>

                  {/* Botão destacado para Dashboard */}
                  <Link
                    to={userInfo.dashboardPath}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 ${userInfo.color} text-white font-semibold rounded-xl shadow-lg mb-2`}
                  >
                    <LayoutDashboard size={20} />
                    Ir para o Dashboard
                  </Link>
                  
                  {userLinks.slice(1).map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive(link.to) 
                          ? 'bg-[#F7941D] text-white' 
                          : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      {link.icon && <link.icon size={20} />}
                      {link.label}
                    </Link>
                  ))}
                  
                  <div className="h-px bg-white/10 my-2" />
                  
                  <Link
                    to="/vagas"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/90 hover:bg-white/10"
                  >
                    <Briefcase size={20} />
                    Buscar Vagas
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 mt-2"
                  >
                    <LogOut size={20} />
                    Sair da conta
                  </button>
                </>
              ) : (
                <>
                  {publicLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-4 py-3 rounded-lg transition-colors ${
                        isActive(link.to) 
                          ? 'bg-[#F7941D] text-white' 
                          : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  
                  <div className="h-px bg-white/10 my-2" />
                  
                  <div className="flex flex-col gap-2 mt-2">
                    <Button 
                      onClick={() => { navigate('/empresa/publicar-vaga'); setMobileMenuOpen(false); }}
                      className="bg-[#F7941D] hover:bg-[#e8850d] text-white w-full justify-center gap-2 h-12"
                    >
                      <Plus size={18} />
                      Anunciar Vagas Grátis
                    </Button>
                    <Button 
                      onClick={() => { navigate('/candidato/cadastro'); setMobileMenuOpen(false); }}
                      variant="outline"
                      className="border-white/50 text-white hover:bg-white/10 w-full h-12"
                    >
                      Cadastrar CV grátis
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        onClick={() => { navigate('/candidato/login'); setMobileMenuOpen(false); }}
                        variant="outline"
                        className="border-white/50 text-white hover:bg-white/10 gap-1 h-12"
                      >
                        <User size={16} />
                        Profissional
                      </Button>
                      <Button 
                        onClick={() => { navigate('/empresa/login'); setMobileMenuOpen(false); }}
                        className="bg-white text-[#1F3B47] hover:bg-gray-100 gap-1 h-12"
                      >
                        <Building2 size={16} />
                        Empresa
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
