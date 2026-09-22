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
  Settings,
  Database
} from 'lucide-react'

export default function AdminSidebar() {
  const location = useLocation()

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
        { path: '/admin/vagas', icon: Briefcase, label: 'Vagas' }
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
        { path: '/admin/softwares', icon: Database, label: 'Softwares/ERPs' }
      ]
    }
  ]

  return (
    <aside className="w-64 bg-white shadow-lg min-h-[calc(100vh-72px)]">
      <nav className="p-4">
        <div className="space-y-1">
          {menuItems.map((group, groupIndex) => (
            <div key={groupIndex}>
              {group.section && (
                <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-500 uppercase">
                  {group.section}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={linkClass(item.path)}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
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
