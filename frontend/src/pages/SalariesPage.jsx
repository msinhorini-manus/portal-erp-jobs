import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSelector from '../components/LanguageSelector'

export default function SalariesPage() {
  const { t } = useTranslation()
  
  const salaryRanges = [
    { id: 1, range: `${t('salaries.up_to')} 3.000`, min: 0, max: 3000, vagas: 2500, color: 'bg-gray-500' },
    { id: 2, range: 'R$ 3.000 - R$ 5.000', min: 3000, max: 5000, vagas: 3200, color: 'bg-blue-500' },
    { id: 3, range: 'R$ 5.000 - R$ 8.000', min: 5000, max: 8000, vagas: 2800, color: 'bg-green-500' },
    { id: 4, range: 'R$ 8.000 - R$ 12.000', min: 8000, max: 12000, vagas: 2100, color: 'bg-yellow-500' },
    { id: 5, range: 'R$ 12.000 - R$ 18.000', min: 12000, max: 18000, vagas: 1600, color: 'bg-orange-500' },
    { id: 6, range: 'R$ 18.000 - R$ 25.000', min: 18000, max: 25000, vagas: 900, color: 'bg-red-500' },
    { id: 7, range: `${t('salaries.above')} 25.000`, min: 25000, max: 999999, vagas: 400, color: 'bg-purple-600' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1F3B47] text-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-10 h-10 bg-[#F7941D] rounded-full flex items-center justify-center font-bold text-white">P</div>
                <div className="text-xl font-bold">Portal <span className="text-[#F7941D]">ERP</span> Jobs</div>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/vagas" className="hover:text-[#F7941D] transition-colors font-medium">{t('nav.jobs')}</Link>
              <Link to="/empresas" className="hover:text-[#F7941D] transition-colors font-medium">{t('nav.companies')}</Link>
              <Link to="/areas" className="hover:text-[#F7941D] transition-colors font-medium">{t('nav.areas')}</Link>
              <Link to="/tecnologias" className="hover:text-[#F7941D] transition-colors font-medium">{t('nav.technologies')}</Link>
              <Link to="/salarios" className="text-[#F7941D] font-medium">{t('nav.salaries')}</Link>
              <LanguageSelector />
            </nav>
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-r from-[#1F3B47] to-[#2C5F7F] text-white py-16">
        <div className="container mx-auto px-6">
          <h1 className="text-5xl font-bold mb-4">{t('salaries.title')}</h1>
          <p className="text-xl text-white/90">{t('salaries.subtitle')}</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {salaryRanges.map((salary) => (
            <Link key={salary.id} to={`/vagas?salaryMin=${salary.min}&salaryMax=${salary.max}`} className="block">
              <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all p-6 border-2 border-transparent hover:border-[#F7941D]">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`${salary.color} w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-2xl`}>R$</div>
                  <div>
                    <h3 className="font-bold text-lg text-[#1F3B47]">{salary.range}</h3>
                    <p className="text-sm text-gray-600">{t('salaries.salary_range')}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <div className="text-2xl font-bold text-[#F7941D]">{salary.vagas.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">{t('salaries.available_jobs')}</div>
                  </div>
                  <button className="px-4 py-2 bg-[#F7941D] hover:bg-[#E67E22] text-white rounded font-semibold">{t('salaries.view_jobs')}</button>
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

