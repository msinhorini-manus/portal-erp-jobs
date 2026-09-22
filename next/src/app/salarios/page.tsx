import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Guia de Salários',
  description: 'Guia de salários do mercado de software e ERP. Descubra faixas salariais por cargo, tecnologia e nível de experiência.',
}

const salaryRanges = [
  { id: 1, label: 'Até R$ 5.000', range: '0-5000', description: 'Estágio e Júnior', positions: 'Estagiário, Trainee, Desenvolvedor Jr' },
  { id: 2, label: 'R$ 5.000 - R$ 8.000', range: '5000-8000', description: 'Júnior a Pleno', positions: 'Desenvolvedor Jr/Pleno, Analista, Suporte N2' },
  { id: 3, label: 'R$ 8.000 - R$ 12.000', range: '8000-12000', description: 'Pleno', positions: 'Desenvolvedor Pleno, Consultor, Analista Sr' },
  { id: 4, label: 'R$ 12.000 - R$ 18.000', range: '12000-18000', description: 'Pleno a Sênior', positions: 'Desenvolvedor Sr, Consultor Sr, Tech Lead' },
  { id: 5, label: 'R$ 18.000 - R$ 25.000', range: '18000-25000', description: 'Sênior', positions: 'Arquiteto, Tech Lead, Gerente de Projetos' },
  { id: 6, label: 'Acima de R$ 25.000', range: '25000-999999', description: 'Especialista e Gestão', positions: 'CTO, VP Engineering, Diretor de TI' },
]

export default function SalariesPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-r from-portal-dark to-portal-dark-light text-white py-16">
        <div className="container mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Guia de Salários</h1>
          <p className="text-xl text-white/90 mb-4">
            Descubra faixas salariais do mercado de software e ERP
          </p>
        </div>
      </section>

      {/* Salary Ranges */}
      <section className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {salaryRanges.map((range) => (
            <Link
              key={range.id}
              href={`/vagas?salary=${range.range}`}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 p-6 border-2 border-transparent hover:border-portal-orange group"
            >
              <h3 className="text-xl font-bold text-portal-dark group-hover:text-portal-orange transition-colors mb-2">
                {range.label}
              </h3>
              <p className="text-portal-orange font-medium text-sm mb-2">{range.description}</p>
              <p className="text-gray-600 text-sm">{range.positions}</p>
              <div className="mt-4 text-sm text-gray-500 group-hover:text-portal-orange">
                Ver vagas nesta faixa →
              </div>
            </Link>
          ))}
        </div>

        {/* Info */}
        <div className="mt-12 bg-blue-50 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-portal-dark mb-4">Sobre o Guia de Salários</h2>
          <p className="text-gray-700 leading-relaxed">
            Os valores apresentados são estimativas baseadas em dados do mercado brasileiro de software e ERP.
            Os salários podem variar conforme a região, porte da empresa, tecnologia específica e nível de experiência.
            Valores referem-se a remuneração mensal bruta para regime CLT.
          </p>
        </div>
      </section>
    </>
  )
}
