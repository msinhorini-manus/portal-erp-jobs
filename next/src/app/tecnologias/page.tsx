import { Metadata } from 'next'
import Link from 'next/link'
import { getTechnologies } from '@/lib/api'

export const metadata: Metadata = {
  title: 'Tecnologias',
  description: 'Encontre vagas por tecnologia: SAP, Oracle, Protheus, Python, Java, React, Angular, AWS, Azure e muito mais.',
}

export default async function TechnologiesPage() {
  let technologies: any[] = []

  try {
    technologies = await getTechnologies()
  } catch (e) {
    console.error('Failed to fetch technologies:', e)
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-r from-portal-dark to-portal-dark-light text-white py-16">
        <div className="container mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Tecnologias</h1>
          <p className="text-xl text-white/90 mb-4">
            Encontre vagas pela tecnologia que você domina
          </p>
          <div className="flex items-center gap-2 text-lg">
            <div className="w-2 h-2 bg-portal-orange rounded-full"></div>
            <span>{technologies.length} tecnologias cadastradas</span>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="container mx-auto px-6 py-12">
        {technologies.length === 0 ? (
          <p className="text-center text-gray-500 py-12">Nenhuma tecnologia cadastrada ainda.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {technologies.map((tech: any) => (
              <Link
                key={tech.id}
                href={`/vagas?tech=${encodeURIComponent(tech.name)}`}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all p-4 border border-gray-100 hover:border-portal-orange text-center group"
              >
                <h3 className="font-semibold text-portal-dark group-hover:text-portal-orange transition-colors">
                  {tech.name}
                </h3>
                {tech.category && (
                  <p className="text-gray-500 text-xs mt-1">{tech.category}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
