import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BarChart3, BriefcaseBusiness, Layers3, Newspaper } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Conteúdo e Inteligência de Carreira',
  description: 'Guias de carreira, mercado e tecnologia para profissionais e empresas do ecossistema Portal ERP.',
  alternates: { canonical: '/conteudo' },
}

const resources = [
  { href: '/tecnologias', title: 'Carreiras por tecnologia', description: 'Explore oportunidades por SAP, TOTVS, Oracle, desenvolvimento, cloud e outras competências.', icon: Layers3, external: false },
  { href: '/areas', title: 'Áreas de atuação', description: 'Navegue pelas especialidades do mercado de software de gestão e encontre vagas relacionadas.', icon: BriefcaseBusiness, external: false },
  { href: '/salarios', title: 'Guia de salários', description: 'Consulte referências de faixas salariais e combine os valores com os filtros de vagas.', icon: BarChart3, external: false },
  { href: 'https://portalerp.com/br', title: 'Inteligência Portal ERP', description: 'Acompanhe notícias, análises e conteúdo editorial especializado no mercado de ERP e software.', icon: Newspaper, external: true },
]

export default function ContentPage() {
  return <><section className="bg-gradient-to-r from-portal-dark to-portal-dark-light py-16 text-white"><div className="container mx-auto px-6"><p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-400">Ecossistema Portal ERP</p><h1 className="mt-3 text-4xl font-bold md:text-5xl">Conteúdo e inteligência de carreira</h1><p className="mt-4 max-w-3xl text-xl text-white/90">Informação prática para profissionais e empresas tomarem melhores decisões no mercado de software.</p></div></section><section className="container mx-auto px-6 py-12"><div className="grid gap-6 md:grid-cols-2">{resources.map(resource => { const Icon = resource.icon; return <Link key={resource.href} href={resource.href} target={resource.external ? '_blank' : undefined} rel={resource.external ? 'noopener noreferrer' : undefined} className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><Icon className="h-8 w-8 text-orange-600"/><h2 className="mt-5 text-2xl font-bold text-portal-dark">{resource.title}</h2><p className="mt-3 leading-7 text-slate-600">{resource.description}</p><span className="mt-5 inline-flex items-center gap-2 font-semibold text-blue-700">Acessar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1"/></span></Link>})}</div></section></>
}
