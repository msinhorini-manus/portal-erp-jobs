import { Metadata } from 'next'
import Link from 'next/link'
import { Building2, Globe, MapPin, Search, Users } from 'lucide-react'

import { getCompanies } from '@/lib/api'

type Params = Promise<{ [key: string]: string | string[] | undefined }>
const value = (input: string | string[] | undefined) => (Array.isArray(input) ? input[0] : input) || ''

export const metadata: Metadata = {
  title: 'Empresas',
  description: 'Conheça e pesquise empresas que estão contratando no setor de software e ERP.',
}

export default async function EmpresasPage({ searchParams }: { searchParams: Params }) {
  const resolved = await searchParams
  const params: Record<string, string> = {}
  for (const key of ['q', 'sector', 'city', 'state', 'page']) {
    const item = value(resolved[key]).trim()
    if (item) params[key] = item
  }
  params.per_page = '20'

  let pageData: any = { companies: [], total: 0, pages: 0, current_page: 1 }
  try { pageData = await getCompanies(params) } catch (error) { console.error('Failed to fetch companies:', error) }
  const companies = Array.isArray(pageData) ? pageData : pageData.companies || []
  const total = Array.isArray(pageData) ? pageData.length : pageData.total || 0
  const currentPage = Number(pageData.current_page || 1)
  const pages = Number(pageData.pages || 0)

  function pageUrl(page: number) {
    const next = new URLSearchParams(params); next.delete('per_page'); next.set('page', String(page))
    return `/empresas?${next.toString()}`
  }

  return <>
    <section className="bg-gradient-to-r from-portal-dark to-portal-dark-light py-16 text-white"><div className="container mx-auto px-6"><h1 className="mb-4 text-4xl font-bold md:text-5xl">Empresas</h1><p className="mb-4 text-xl text-white/90">Conheça as empresas que estão contratando</p><div className="flex items-center gap-2 text-lg"><div className="h-2 w-2 rounded-full bg-portal-orange" /><span>{total} empresas encontradas</span></div></div></section>
    <section className="container mx-auto px-6 py-10">
      <form action="/empresas" className="mb-8 grid gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-5">
        <label className="relative lg:col-span-2"><span className="sr-only">Buscar empresa</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input name="q" defaultValue={value(resolved.q)} placeholder="Nome ou descrição" className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3" /></label>
        <input name="sector" defaultValue={value(resolved.sector)} placeholder="Setor" className="rounded-lg border border-gray-200 px-3 py-2.5" />
        <input name="city" defaultValue={value(resolved.city)} placeholder="Cidade" className="rounded-lg border border-gray-200 px-3 py-2.5" />
        <div className="flex gap-2"><input name="state" defaultValue={value(resolved.state)} placeholder="UF" maxLength={2} className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2.5 uppercase" /><button className="rounded-lg bg-portal-orange px-4 py-2.5 font-semibold text-white">Buscar</button></div>
        <div className="lg:col-span-5"><Link href="/empresas" className="text-sm font-semibold text-gray-600 hover:text-portal-orange">Limpar filtros</Link></div>
      </form>

      {companies.length === 0 ? <div className="py-16 text-center"><Building2 className="mx-auto mb-4 h-16 w-16 text-gray-300" /><p className="text-lg text-gray-500">Nenhuma empresa encontrada com os filtros selecionados.</p><Link href="/empresas" className="mt-2 inline-block text-portal-orange hover:underline">Limpar filtros</Link></div> : <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{companies.map((company: any) => <Link key={company.id} href={`/empresas/${company.id}`} className="group rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:border-portal-orange/30 hover:shadow-lg"><div className="mb-4 flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-lg bg-portal-dark"><Building2 className="h-7 w-7 text-portal-orange" /></div><div><h3 className="font-bold text-portal-dark transition-colors group-hover:text-portal-orange">{company.company_name || company.trade_name || company.name}</h3>{company.sector && <p className="text-sm text-gray-500">{company.sector}</p>}</div></div>{company.description && <p className="mb-3 line-clamp-2 text-sm text-gray-600">{company.description}</p>}<div className="flex flex-wrap gap-3 text-xs text-gray-500">{company.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{company.city}{company.state ? `, ${company.state}` : ''}</span>}{(company.company_size || company.size) && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{company.company_size || company.size}</span>}{company.website && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />Site</span>}{typeof company.active_jobs_count === 'number' && <span>{company.active_jobs_count} vaga(s) ativa(s)</span>}</div><div className="mt-4 text-sm font-medium text-portal-orange">Ver perfil e vagas →</div></Link>)}</div>}

      {pages > 1 && <nav aria-label="Paginação das empresas" className="mt-8 flex items-center justify-center gap-3"><Link aria-disabled={currentPage <= 1} href={pageUrl(Math.max(1, currentPage - 1))} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${currentPage <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-gray-50'}`}>Anterior</Link><span className="text-sm text-gray-600">Página {currentPage} de {pages}</span><Link aria-disabled={currentPage >= pages} href={pageUrl(Math.min(pages, currentPage + 1))} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${currentPage >= pages ? 'pointer-events-none opacity-40' : 'hover:bg-gray-50'}`}>Próxima</Link></nav>}
    </section>
  </>
}
