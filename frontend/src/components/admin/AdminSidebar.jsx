import { appFetch } from '@/lib/regional-runtime.js'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  Tags,
  Code,
  GraduationCap,
  MapPin,
  ShieldCheck,
  Database,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  X
} from 'lucide-react'

export default function AdminSidebar({ mobileOpen = false, collapsed = false, onClose, onToggleCollapsed }) {
  const location = useLocation()
  const [platformAdmin, setPlatformAdmin] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    appFetch('/api/admin/access-capabilities', {
      headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      signal: controller.signal,
      cache: 'no-store',
    }).then(async response => {
      if (response.ok) setPlatformAdmin(Boolean((await response.json()).is_platform_admin))
    }).catch(() => {})
    return () => controller.abort()
  }, [])

  const isActive = (path) => {
    return location.pathname === path
  }

  const linkClass = (path) => {
    return `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      isActive(path)
        ? 'bg-[#F7941D] text-white font-semibold'
        : 'text-gray-700 hover:bg-gray-100'
    }`
  }

  const menuItems = [
    {
      section: null,
      items: [
        { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' }
      ]
    },
    {
      section: 'Gestão',
      items: [
        { path: '/admin/empresas', icon: Building2, label: 'Empresas' },
        { path: '/admin/candidatos', icon: Users, label: 'Candidatos' },
        { path: '/admin/vagas', icon: Briefcase, label: 'Vagas' },
        ...(platformAdmin ? [{ path: '/admin/usuarios', icon: ShieldCheck, label: 'Usuários e acessos' }] : [])
      ]
    },
    {
      section: 'Configurações',
      items: [
        { path: '/admin/levels', icon: GraduationCap, label: 'Níveis de Experiência' },
        { path: '/admin/modalities', icon: MapPin, label: 'Modalidades' },
        { path: '/admin/technologies', icon: Code, label: 'Tecnologias' },
        { path: '/admin/areas', icon: Briefcase, label: 'Áreas de Atuação' },
        { path: '/admin/tags', icon: Tags, label: 'Tags/Keywords' },
        { path: '/admin/softwares', icon: Database, label: 'Softwares/ERPs' },
        { path: '/admin/emails', icon: Mail, label: 'Central de E-mails' }
      ]
    }
  ]

  return (
    <aside className={`fixed inset-y-0 left-0 top-16 z-40 min-h-[calc(100vh-4rem)] bg-white shadow-lg transition-transform lg:static lg:top-auto lg:min-h-[calc(100vh-72px)] lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'lg:w-20' : 'w-64 lg:w-64'}`}>
      <nav className="p-3 lg:p-4">
        <div className="mb-2 flex items-center justify-between border-b pb-3 lg:border-0 lg:pb-0">
          {!collapsed && <span className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Navegação</span>}
          <div className="ml-auto flex items-center gap-1">
            <button type="button" className="rounded-md p-2 text-gray-600 hover:bg-gray-100 lg:hidden" aria-label="Fechar menu administrativo" onClick={onClose}><X className="h-5 w-5" /></button>
            <button type="button" className="hidden rounded-md p-2 text-gray-600 hover:bg-gray-100 lg:inline-flex" aria-label={collapsed ? 'Expandir menu administrativo' : 'Recolher menu administrativo'} aria-expanded={!collapsed} onClick={onToggleCollapsed}>{collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}</button>
          </div>
        </div>
        <div className="space-y-1">
          {menuItems.map((group, groupIndex) => (
            <div key={groupIndex}>
              {group.section && (
                <div className={`pt-4 pb-2 px-4 text-xs font-semibold text-gray-500 uppercase ${collapsed ? 'lg:sr-only' : ''}`}>
                  {group.section}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`${linkClass(item.path)} ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}
                    title={collapsed ? item.label : undefined}
                    onClick={onClose}
                  >
                    <Icon className="w-5 h-5" />
                    <span className={collapsed ? 'lg:sr-only' : ''}>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      </nav>
    </aside>
  )
}
