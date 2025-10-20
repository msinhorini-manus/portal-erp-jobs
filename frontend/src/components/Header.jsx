import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Briefcase } from 'lucide-react';

export default function Header({ userType = null }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-gradient-to-r from-teal-800 to-teal-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="bg-orange-500 p-2 rounded-lg group-hover:bg-orange-600 transition">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">Portal ERP</h1>
              <p className="text-xs text-teal-200 leading-tight">Jobs</p>
            </div>
            <span className="text-xs text-teal-300 ml-2">Software Careers</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/vagas" className="text-teal-100 hover:text-white transition text-sm font-medium">
              Vagas
            </Link>
            <Link to="/empresas" className="text-teal-100 hover:text-white transition text-sm font-medium">
              Empresas
            </Link>
            <Link to="/areas" className="text-teal-100 hover:text-white transition text-sm font-medium">
              Áreas
            </Link>
            <Link to="/tecnologias" className="text-teal-100 hover:text-white transition text-sm font-medium">
              Tecnologias
            </Link>
            <Link to="/salarios" className="text-teal-100 hover:text-white transition text-sm font-medium">
              Salários
            </Link>
            <Link to="/conteudo" className="text-teal-100 hover:text-white transition text-sm font-medium">
              Conteúdo
            </Link>
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-3">
            {user ? (
              <>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-teal-200">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition text-sm font-medium shadow-md"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                {userType === 'company' ? (
                  <Link
                    to="/empresa/cadastro-vaga"
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm font-medium shadow-md"
                  >
                    Anunciar Vagas Grátis
                  </Link>
                ) : (
                  <Link
                    to="/candidato/cadastro"
                    className="px-4 py-2 bg-white text-teal-800 rounded-lg hover:bg-gray-100 transition text-sm font-medium shadow-md"
                  >
                    Cadastrar CV grátis
                  </Link>
                )}
                <Link
                  to="/login"
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition text-sm font-medium shadow-md"
                >
                  Entrar
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

