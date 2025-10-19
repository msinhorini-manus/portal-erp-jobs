import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSelector from '../components/LanguageSelector'

export default function TechnologiesPage() {
  const { t } = useTranslation()
  
  const technologies = [
    { id: 1, name: 'React', category: t('technologies.frontend'), vagas: 2800, color: 'bg-blue-500' },
    { id: 2, name: 'Node.js', category: t('technologies.backend'), vagas: 2400, color: 'bg-green-600' },
    { id: 3, name: 'Python', category: t('technologies.backend'), vagas: 2200, color: 'bg-yellow-500' },
    { id: 4, name: 'Java', category: t('technologies.backend'), vagas: 2100, color: 'bg-red-600' },
    { id: 5, name: 'SAP', category: t('technologies.erp'), vagas: 1900, color: 'bg-blue-700' },
    { id: 6, name: 'JavaScript', category: t('technologies.frontend'), vagas: 3200, color: 'bg-yellow-400' },
    { id: 7, name: 'TypeScript', category: t('technologies.frontend'), vagas: 2600, color: 'bg-blue-600' },
    { id: 8, name: 'Angular', category: t('technologies.frontend'), vagas: 1800, color: 'bg-red-500' },
    { id: 9, name: 'Vue.js', category: t('technologies.frontend'), vagas: 1500, color: 'bg-green-500' },
    { id: 10, name: 'AWS', category: t('technologies.cloud'), vagas: 2300, color: 'bg-orange-500' },
    { id: 11, name: 'Azure', category: t('technologies.cloud'), vagas: 1700, color: 'bg-blue-400' },
    { id: 12, name: 'Docker', category: t('technologies.devops'), vagas: 2000, color: 'bg-cyan-500' },
    { id: 13, name: 'Kubernetes', category: t('technologies.devops'), vagas: 1600, color: 'bg-indigo-500' },
    { id: 14, name: 'SQL', category: t('technologies.database'), vagas: 2500, color: 'bg-gray-600' },
    { id: 15, name: 'MongoDB', category: t('technologies.database'), vagas: 1400, color: 'bg-green-700' },
    { id: 16, name: 'PostgreSQL', category: t('technologies.database'), vagas: 1300, color: 'bg-blue-800' },
    { id: 17, name: 'Oracle', category: t('technologies.database'), vagas: 1200, color: 'bg-red-700' },
    { id: 18, name: 'C#', category: t('technologies.backend'), vagas: 1900, color: 'bg-purple-600' },
    { id: 19, name: '.NET', category: t('technologies.backend'), vagas: 1800, color: 'bg-purple-700' },
    { id: 20, name: 'PHP', category: t('technologies.backend'), vagas: 1600, color: 'bg-indigo-600' },
    { id: 21, name: 'Ruby', category: t('technologies.backend'), vagas: 900, color: 'bg-red-600' },
    { id: 22, name: 'Go', category: t('technologies.backend'), vagas: 1100, color: 'bg-cyan-600' },
    { id: 23, name: 'Rust', category: t('technologies.backend'), vagas: 600, color: 'bg-orange-700' },
    { id: 24, name: 'Kotlin', category: t('technologies.mobile'), vagas: 1000, color: 'bg-purple-500' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
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
              <Link to="/areas" className="hover:text-[#F7941D] transition-colors font-medium">{t('nav.areas')}</Link>
              <Link to="/tecnologias" className="text-[#F7941D] font-medium">{t('nav.technologies')}</Link>
              <Link to="/salarios" className="hover:text-[#F7941D] transition-colors font-medium">{t('nav.salaries')}</Link>
              <LanguageSelector />
            </nav>
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-r from-[#1F3B47] to-[#2C5F7F] text-white py-16">
        <div className="container mx-auto px-6">
          <h1 className="text-5xl font-bold mb-4">{t('technologies.title')}</h1>
          <p className="text-xl text-white/90">{t('technologies.subtitle')}</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {technologies.map((tech) => (
            <Link key={tech.id} to={`/vagas?tech=${encodeURIComponent(tech.name)}`} className="block">
              <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all p-6 border-2 border-transparent hover:border-[#F7941D]">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`${tech.color} w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg`}>
                    {tech.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[#1F3B47]">{tech.name}</h3>
                    <p className="text-sm text-gray-600">{tech.category}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <div className="text-xl font-bold text-[#F7941D]">{tech.vagas.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">{t('technologies.jobs')}</div>
                  </div>
                  <button className="px-3 py-1 bg-[#F7941D] hover:bg-[#E67E22] text-white rounded text-sm font-semibold">
                    {t('technologies.view')}
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <footer className="bg-[#1F3B47] text-white py-8 mt-12">
        <div className="container mx-auto px-6 text-center">
          <p className="text-white/80">© 2025 Portal ERP Jobs. {t('footer.rights')}.</p>
        </div>
      </footer>
    </div>
  )
}

