import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import AdminSidebar from './AdminSidebar'
import { LogOut } from 'lucide-react'

/**
 * AdminLayout - Layout específico para o painel administrativo
 * Inclui sidebar de navegação e navbar própria do admin
 */
export default function AdminLayout() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Navbar */}
      <header className="bg-[#1F3B47] text-white shadow-md sticky top-0 z-50">
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/admin" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-9 h-9 bg-[#F7941D] rounded-full flex items-center justify-center font-bold text-white text-sm">
                P
              </div>
              <div className="hidden sm:block">
                <div className="text-lg font-bold leading-tight">
                  Portal <span className="text-[#F7941D]">ERP</span> Jobs
                </div>
                <div className="text-xs text-gray-300">Painel Administrativo</div>
              </div>
            </Link>

            {/* User Info */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium">Administrador</div>
                <div className="text-xs text-gray-300">{user?.email || 'admin@portalerpjobs.com'}</div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Page Content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
