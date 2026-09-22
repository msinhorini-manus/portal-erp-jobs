import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

/**
 * MainLayout - Layout principal que envolve todas as páginas públicas
 * Garante que Navbar e Footer estejam sempre presentes
 */
export default function MainLayout({ showFooter = true }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navbar global - sempre presente */}
      <Navbar />

      {/* Conteúdo da página */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer global - opcional */}
      {showFooter && <Footer />}
    </div>
  )
}
