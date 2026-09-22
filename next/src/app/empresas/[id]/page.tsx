import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCompanyById } from '@/lib/api'
import { Building2, MapPin, Users, Globe, Mail, Phone, ArrowLeft, Briefcase } from 'lucide-react'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params
    const company = await getCompanyById(id)
    const companyName = company.company_name || company.trade_name || company.name || 'Empresa'
    return {
      title: `${companyName} - Empresa`,
      description: company.description?.substring(0, 160) || `Perfil da empresa ${companyName} no Portal ERP Jobs`,
    }
  } catch {
    return { title: 'Empresa não encontrada' }
  }
}

export default async function CompanyDetailPage({ params }: Props) {
  let company: any

  try {
    const { id } = await params
    company = await getCompanyById(id)
  } catch (e) {
    notFound()
  }

  if (!company) notFound()

  const companyName = company.company_name || company.trade_name || company.name || 'Empresa'

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <section className="bg-portal-dark text-white py-8">
        <div className="container mx-auto px-6">
          <Link href="/empresas" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Voltar para empresas
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center">
              <Building2 className="w-8 h-8 text-portal-orange" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{companyName}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-1 text-white/80">
                {company.sector && <span>{company.sector}</span>}
                {company.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {company.city}{company.state ? `, ${company.state}` : ''}
                  </span>
                )}
                {company.size && (
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {company.size}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-portal-dark mb-4">Sobre a Empresa</h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {company.description || 'Descrição não disponível.'}
              </p>
            </div>

            {/* Jobs */}
            {company.jobs && company.jobs.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-portal-dark mb-4">
                  Vagas Abertas ({company.jobs.length})
                </h2>
                <div className="space-y-3">
                  {company.jobs.map((job: any) => (
                    <Link
                      key={job.id}
                      href={`/vagas/${job.id}`}
                      className="block p-4 border border-gray-100 rounded-lg hover:border-portal-orange/30 hover:bg-gray-50 transition-all"
                    >
                      <h3 className="font-semibold text-portal-dark hover:text-portal-orange">
                        {job.title}
                      </h3>
                      <div className="flex gap-3 mt-1 text-sm text-gray-500">
                        {job.location && <span>{job.location}</span>}
                        {job.contract_type && <span>{job.contract_type}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-portal-dark mb-4">Informações</h3>
              <div className="space-y-3 text-sm">
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-portal-orange hover:underline"
                  >
                    <Globe className="w-4 h-4" />
                    {company.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                {company.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    {company.email}
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    {company.phone}
                  </div>
                )}
                {company.founded_year && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Briefcase className="w-4 h-4" />
                    Fundada em {company.founded_year}
                  </div>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-portal-orange/10 rounded-xl p-6 border border-portal-orange/20">
              <h3 className="font-bold text-portal-dark mb-2">Quer trabalhar aqui?</h3>
              <p className="text-gray-600 text-sm mb-4">
                Cadastre seu currículo e candidate-se às vagas desta empresa.
              </p>
              <Link
                href="/candidato/cadastro"
                className="block text-center bg-portal-orange hover:bg-portal-orange-dark text-white py-2.5 rounded-lg font-medium transition-colors"
              >
                Cadastrar Currículo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
