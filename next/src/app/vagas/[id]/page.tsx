import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getJobById } from '@/lib/api'
import { MapPin, Building2, Clock, DollarSign, Briefcase, Globe, Users, ArrowLeft } from 'lucide-react'
import { ApplyButton } from '@/components/ApplyButton'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params
    const job = await getJobById(id)
    return {
      title: `${job.title} - ${job.company_name || 'Portal ERP Jobs'}`,
      description: job.description?.substring(0, 160) || `Vaga de ${job.title} no Portal ERP Jobs`,
      openGraph: {
        title: `${job.title} - ${job.company_name || ''}`,
        description: job.description?.substring(0, 160),
        type: 'article',
      },
    }
  } catch {
    return { title: 'Vaga não encontrada' }
  }
}

export default async function JobDetailPage({ params }: Props) {
  let job: any

  try {
    const { id } = await params
    job = await getJobById(id)
  } catch (e) {
    notFound()
  }

  if (!job) notFound()

  const modalityLabel: Record<string, string> = {
    remote: 'Remoto',
    hybrid: 'Híbrido',
    onsite: 'Presencial',
  }

  const levelLabel: Record<string, string> = {
    junior: 'Júnior',
    pleno: 'Pleno',
    senior: 'Sênior',
    tech_lead: 'Tech Lead',
    manager: 'Gerente',
  }

  const formatSalary = (value?: number) => {
    if (!value) return null
    return `R$ ${value.toLocaleString('pt-BR')}`
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <section className="bg-portal-dark text-white py-8">
        <div className="container mx-auto px-6">
          <Link href="/vagas" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Voltar para vagas
          </Link>
          <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-white/80">
            {job.company_name && (
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                {job.company_name}
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {job.location}
              </span>
            )}
            {job.work_modality && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                {modalityLabel[job.work_modality] || job.work_modality}
              </span>
            )}
            {job.seniority_level && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                {levelLabel[job.seniority_level] || job.seniority_level}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-portal-dark mb-4">Descrição da Vaga</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{job.description || 'Descrição não disponível.'}</p>
              </div>
            </div>

            {/* Requirements */}
            {job.requirements && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-portal-dark mb-4">Requisitos</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{job.requirements}</p>
              </div>
            )}

            {/* Technologies */}
            {job.technologies && (Array.isArray(job.technologies) ? job.technologies : []).length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-portal-dark mb-4">Tecnologias</h2>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(job.technologies) ? job.technologies : []).map((tech: string, i: number) => (
                    <span key={i} className="bg-portal-orange/10 text-portal-orange px-3 py-1.5 rounded-lg text-sm font-medium">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Benefits */}
            {job.benefits && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-portal-dark mb-4">Benefícios</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{job.benefits}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply Card */}
            <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-portal-orange/20">
              {(job.salary_min || job.salary_max) && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">Faixa Salarial</p>
                  <p className="text-2xl font-bold text-portal-orange">
                    {formatSalary(job.salary_min)} - {formatSalary(job.salary_max)}
                  </p>
                </div>
              )}
              <ApplyButton jobId={job.id} />
              <p className="text-xs text-gray-400 mt-3 text-center">
                Publicada em {formatDate(job.created_at)}
              </p>
            </div>

            {/* Job Info */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-portal-dark mb-4">Informações da Vaga</h3>
              <div className="space-y-3 text-sm">
                {job.contract_type && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Contrato</span>
                    <span className="font-medium">{job.contract_type}</span>
                  </div>
                )}
                {job.area && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Área</span>
                    <span className="font-medium">{job.area}</span>
                  </div>
                )}
                {job.work_modality && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Modalidade</span>
                    <span className="font-medium">{modalityLabel[job.work_modality] || job.work_modality}</span>
                  </div>
                )}
                {job.seniority_level && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Nível</span>
                    <span className="font-medium">{levelLabel[job.seniority_level] || job.seniority_level}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Company Info */}
            {job.company_name && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-portal-dark mb-4">Sobre a Empresa</h3>
                <p className="font-medium text-lg mb-2">{job.company_name}</p>
                {job.company_description && (
                  <p className="text-gray-600 text-sm">{job.company_description}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
