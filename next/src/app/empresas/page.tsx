import { Metadata } from 'next'
import Link from 'next/link'
import { getCompanies } from '@/lib/api'
import { Building2, MapPin, Users, Globe } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Empresas',
  description: 'Conheça as empresas que estão contratando no setor de software e ERP. Veja vagas abertas e perfis de empresas.',
}

export default async function EmpresasPage() {
  let companies: any[] = []

  try {
    const data = await getCompanies()
    companies = Array.isArray(data) ? data : data?.companies || []
  } catch (e) {
    console.error('Failed to fetch companies:', e)
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-r from-portal-dark to-portal-dark-light text-white py-16">
        <div className="container mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Empresas</h1>
          <p className="text-xl text-white/90 mb-4">
            Conheça as empresas que estão contratando
          </p>
          <div className="flex items-center gap-2 text-lg">
            <div className="w-2 h-2 bg-portal-orange rounded-full"></div>
            <span>{companies.length} empresas cadastradas</span>
          </div>
        </div>
      </section>

      {/* Companies Grid */}
      <section className="container mx-auto px-6 py-12">
        {companies.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nenhuma empresa cadastrada ainda.</p>
            <Link href="/empresa/cadastro" className="text-portal-orange hover:underline mt-2 inline-block">
              Cadastre sua empresa
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company: any) => (
              <Link
                key={company.id}
                href={`/empresas/${company.id}`}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-gray-100 hover:border-portal-orange/30 group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-portal-dark rounded-lg flex items-center justify-center">
                    <Building2 className="w-7 h-7 text-portal-orange" />
                  </div>
                  <div>
                    <h3 className="font-bold text-portal-dark group-hover:text-portal-orange transition-colors">
                      {company.company_name || company.trade_name || company.name}
                    </h3>
                    {company.sector && (
                      <p className="text-gray-500 text-sm">{company.sector}</p>
                    )}
                  </div>
                </div>
                {company.description && (
                  <p className="text-gray-600 text-sm line-clamp-2 mb-3">{company.description}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  {company.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {company.city}{company.state ? `, ${company.state}` : ''}
                    </span>
                  )}
                  {(company.company_size || company.size) && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {company.company_size || company.size}
                    </span>
                  )}
                  {company.website && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Site
                    </span>
                  )}
                </div>
                <div className="mt-4 text-portal-orange text-sm font-medium">
                  Ver perfil e vagas →
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
