import { useEffect, useState } from 'react'
import { appFetch, getRegionalRuntime } from '@/lib/regional-runtime.js'
import { assertPublicRegionalCompany, canonicalCompanyId, companyCollection } from '@/lib/public-company-url.js'
import { publicCompanyLink } from '@/lib/public-company-link.js'
import { publicJobLink } from '@/lib/public-job-link.js'
import { Link, useParams } from 'react-router-dom'
import { MapPin, Users, Globe, Building, Briefcase, ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function CompanyDetailPage({ collection = 'empresas' }) {
  const { id, companySlug } = useParams()
  const [company, setCompany] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setCompany(null)
    setError('')
    const load = async () => {
      const runtime = getRegionalRuntime()
      if (collection !== companyCollection(runtime.site?.locale)) throw new Error('Empresa não encontrada')
      const companyId = canonicalCompanyId(id)
      const response = await appFetch(`/api/companies/${companyId}`, { credentials: 'omit', cache: 'no-store', redirect: 'error' })
      if (!response.ok) throw new Error(response.status >= 500 ? 'Serviço de empresas indisponível' : 'Empresa não encontrada')
      const data = await response.json()
      assertPublicRegionalCompany(data, runtime.site, companyId)
      const target = publicCompanyLink(data)
      const current = globalThis.location.pathname.replace(runtime.basename || '', '')
      if (current !== target) throw new Error('Empresa não encontrada')
      if (active) setCompany({
        ...data, name: data.company_name || data.trade_name || data.name,
        logo: data.logo_url, size: data.company_size || data.size,
        location: data.location || [data.city, data.state].filter(Boolean).join(', '),
        about: data.about || data.description, benefits: data.benefits || [], culture: data.culture || [],
        openJobs: (data.jobs || []).filter(job => !job.is_company_hidden && job.is_active !== false && (!job.status || ['active', 'approved'].includes(job.status)) && (!job.expires_at || new Date(job.expires_at).getTime() > Date.now())),
      })
    }
    load().catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [id, companySlug, collection])
  if (error) return <div role="alert" className="p-8">{error}</div>
  if (!company) return <div role="status" className="p-8">Carregando empresa...</div>

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
              <Link to="/vagas" className="hover:text-[#F7941D] transition-colors font-medium">Vagas</Link>
              <Link to="/empresas" className="text-[#F7941D] font-medium">Empresas</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Back Button */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <Link to="/empresas" className="flex items-center gap-2 text-gray-600 hover:text-[#F7941D] transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Voltar para Empresas</span>
          </Link>
        </div>
      </div>

      {/* Company Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <img
              src={company.logo || '/brand/jobs-by-portal-erp-clean-light.svg'}
              alt={company.name}
              className="w-32 h-32 rounded-lg shadow-md"
            />
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-[#1F3B47] mb-4">{company.name}</h1>
              <div className="flex flex-wrap gap-4 text-gray-600 mb-6">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-[#F7941D]" />
                  <span>{company.sector}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#F7941D]" />
                  <span>{company.size}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#F7941D]" />
                  <span>{company.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#F7941D]" />
                  <a href={/^https?:\/\//.test(company.website || '') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#F7941D] transition-colors">
                    {company.website}
                  </a>
                </div>
              </div>
              <p className="text-lg text-gray-700">{company.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-[#1F3B47] mb-4">Sobre a Empresa</h2>
                <div className="prose max-w-none text-gray-700 whitespace-pre-line">
                  {company.about}
                </div>
              </CardContent>
            </Card>

            {/* Open Jobs */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[#1F3B47]">
                    Vagas Abertas ({company.openJobs.length})
                  </h2>
                </div>
                <div className="space-y-4">
                  {company.openJobs.map((job) => (
                    <Card key={job.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-xl text-[#1F3B47] mb-2">{job.title}</h3>
                            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>{job.location}</span>
                              </div>
                              <span>•</span>
                              <span>{job.modality}</span>
                              <span>•</span>
                              <span>{job.level}</span>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                            {job.type}
                          </span>
                        </div>
                        <div className="mb-4">
                          <div className="text-sm text-gray-600 mb-1">Faixa salarial:</div>
                          <div className="text-lg font-bold text-[#F7941D]">{job.salary}</div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t">
                          <span className="text-sm text-gray-500">
                            Publicada em {new Date(job.postedAt).toLocaleDateString('pt-BR')}
                          </span>
                          <Link to={publicJobLink(job)}>
                            <Button className="bg-[#F7941D] hover:bg-[#E67E22] text-white">
                              Ver Detalhes
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Benefits */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-[#1F3B47] mb-4">Benefícios</h3>
                <ul className="space-y-2">
                  {company.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-2 text-gray-700">
                      <div className="w-2 h-2 bg-[#F7941D] rounded-full"></div>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Culture */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-[#1F3B47] mb-4">Cultura</h3>
                <ul className="space-y-2">
                  {company.culture.map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-gray-700">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-[#1F3B47] mb-4">Estatísticas</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Vagas abertas</div>
                    <div className="text-2xl font-bold text-[#F7941D]">{company.openJobs.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Setor</div>
                    <div className="text-lg font-semibold text-gray-700">{company.sector}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Tamanho</div>
                    <div className="text-lg font-semibold text-gray-700">{company.size}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#1F3B47] text-white py-8 mt-12">
        <div className="container mx-auto px-6 text-center">
          <p className="text-white/80">© 2025 Portal ERP Jobs. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
