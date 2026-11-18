import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import AdminSidebar from './AdminSidebar'
import { LogOut, Menu } from 'lucide-react'

/**
 * AdminLayout - Layout específico para o painel administrativo
 * Inclui sidebar de navegação e navbar própria do admin
 */
export default function AdminLayout() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/admin/login')
    } catch {
      window.alert('Não foi possível encerrar a sessão. Tente novamente.')
    }
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
              <button type="button" className="rounded-md p-2 text-white hover:bg-white/10 lg:hidden" aria-label="Abrir menu administrativo" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></button>
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
      <div className="relative flex min-w-0">
        {/* Sidebar */}
        {sidebarOpen && <button type="button" className="fixed inset-0 top-16 z-30 bg-black/30 lg:hidden" aria-label="Fechar menu administrativo" onClick={() => setSidebarOpen(false)} />}
        <AdminSidebar mobileOpen={sidebarOpen} collapsed={sidebarCollapsed} onClose={() => setSidebarOpen(false)} onToggleCollapsed={() => setSidebarCollapsed(value => !value)} />

        {/* Page Content */}
        <main className="min-w-0 w-full flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
