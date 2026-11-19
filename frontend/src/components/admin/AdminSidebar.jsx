import { appFetch } from '@/lib/regional-runtime.js'
import { canAdminPreview, createImportPreviewClient } from '@/lib/import-preview-client.js'
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
  FileInput
} from 'lucide-react'

const importClient = createImportPreviewClient()

export default function AdminSidebar({ responsive = false }) {
  const location = useLocation()
  const [platformAdmin, setPlatformAdmin] = useState(false)
  const [importAllowed, setImportAllowed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    appFetch('/api/admin/access-capabilities', {
      headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      signal: controller.signal,
      cache: 'no-store',
    }).then(async response => {
      if (!response.ok) return
      const data = await response.json()
      if (active && !controller.signal.aborted) setPlatformAdmin(data.is_platform_admin === true)
    }).catch(() => {})
    importClient.capabilities({ signal: controller.signal }).then(capabilities => {
      if (active && !controller.signal.aborted) setImportAllowed(canAdminPreview(capabilities))
    }).catch(() => {})
    return () => { active = false; controller.abort() }
  }, [])

  const isActive = (path) => {
    return location.pathname === path
  }

  const linkClass = (path) => {
    return `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${
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
        ...(platformAdmin ? [{ path: '/admin/usuarios', icon: ShieldCheck, label: 'Usuários e acessos' }] : []),
        ...(importAllowed ? [{ path: '/admin/importacoes', icon: FileInput, label: 'Importações' }] : [])
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
    <aside className={responsive ? 'w-full bg-white shadow-lg md:min-h-[calc(100vh-72px)] md:w-64' : 'w-64 bg-white shadow-lg min-h-[calc(100vh-72px)]'}>
      <nav className="p-4" aria-label="Navegação administrativa">
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
                    aria-current={isActive(item.path) ? 'page' : undefined}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
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
