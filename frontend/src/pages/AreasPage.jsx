import { Link } from 'react-router-dom'
import { Code2, Settings, Headphones, Users, TrendingUp, FileText, Cloud, Database, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import LanguageSelector from '../components/LanguageSelector'

export default function AreasPage() {
  const { t } = useTranslation()
  
  const areas = [
    { 
      id: 1,
      icon: Code2, 
      nameKey: 'areas.development',
      descKey: 'areas.development_desc',
      vagas: 3500,
      color: 'bg-blue-500'
    },
    { 
      id: 2,
      icon: Settings, 
      nameKey: 'areas.consulting_erp',
      descKey: 'areas.consulting_erp_desc',
      vagas: 2800,
      color: 'bg-green-500'
    },
    { 
      id: 3,
      icon: Headphones, 
      nameKey: 'areas.support_infrastructure',
      descKey: 'areas.support_infrastructure_desc',
      vagas: 2200,
      color: 'bg-orange-500'
    },
    { 
      id: 4,
      icon: Users, 
      nameKey: 'areas.management_leadership',
      descKey: 'areas.management_leadership_desc',
      vagas: 1800,
      color: 'bg-purple-500'
    },
    { 
      id: 5,
      icon: TrendingUp, 
      nameKey: 'areas.sales_presales',
      descKey: 'areas.sales_presales_desc',
      vagas: 1500,
      color: 'bg-pink-500'
    },
    { 
      id: 6,
      icon: FileText, 
      nameKey: 'areas.administrative',
      descKey: 'areas.administrative_desc',
      vagas: 900,
      color: 'bg-yellow-500'
    },
    { 
      id: 7,
      icon: Cloud, 
      nameKey: 'areas.devops_cloud',
      descKey: 'areas.devops_cloud_desc',
      vagas: 2100,
      color: 'bg-cyan-500'
    },
    { 
      id: 8,
      icon: Database, 
      nameKey: 'areas.data_analytics',
      descKey: 'areas.data_analytics_desc',
      vagas: 1600,
      color: 'bg-indigo-500'
    },
    { 
      id: 9,
      icon: Shield, 
      nameKey: 'areas.security',
      descKey: 'areas.security_desc',
      vagas: 800,
      color: 'bg-red-500'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1F3B47] text-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-10 h-10 bg-[#F7941D] rounded-full flex items-center justify-center font-bold text-white">
                  P
                </div>
                <div className="text-xl font-bold">
                  Portal <span className="text-[#F7941D]">ERP</span> Jobs
                </div>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/vagas" className="hover:text-[#F7941D] transition-colors font-medium">{t('nav.jobs')}</Link>
              <Link to="/empresas" className="hover:text-[#F7941D] transition-colors font-medium">{t('nav.companies')}</Link>
              <Link to="/areas" className="text-[#F7941D] font-medium">{t('nav.areas')}</Link>
              <Link to="/tecnologias" className="hover:text-[#F7941D] transition-colors font-medium">{t('nav.technologies')}</Link>
              <Link to="/salarios" className="hover:text-[#F7941D] transition-colors font-medium">{t('nav.salaries')}</Link>
              <LanguageSelector />
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-[#1F3B47] to-[#2C5F7F] text-white py-16">
        <div className="container mx-auto px-6">
          <h1 className="text-5xl font-bold mb-4">{t('areas.title')}</h1>
          <p className="text-xl text-white/90 mb-6">
            {t('areas.subtitle')}
          </p>
          <div className="flex items-center gap-4 text-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#F7941D] rounded-full"></div>
              <span>9 {t('areas.available_areas')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#F7941D] rounded-full"></div>
              <span>15.000+ {t('areas.active_jobs')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Areas Grid */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {areas.map((area) => {
            const Icon = area.icon
            return (
              <Link 
                key={area.id}
                to={`/vagas?area=${encodeURIComponent(t(area.nameKey))}`}
                className="block"
              >
                <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 p-6 border-2 border-transparent hover:border-[#F7941D]">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`${area.color} p-3 rounded-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-xl text-[#1F3B47] mb-1">{t(area.nameKey)}</h3>
                      <p className="text-gray-600 text-sm">{t(area.descKey)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <div className="text-2xl font-bold text-[#F7941D]">{area.vagas.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">{t('areas.available_jobs')}</div>
                    </div>
                    <button className="px-4 py-2 bg-[#F7941D] hover:bg-[#E67E22] text-white rounded-lg font-semibold transition-colors">
                      {t('areas.view_jobs')}
                    </button>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#1F3B47] text-white py-8 mt-12">
        <div className="container mx-auto px-6 text-center">
          <p className="text-white/80">© 2025 Portal ERP Jobs. {t('footer.rights')}.</p>
        </div>
      </footer>
    </div>
  )
}

