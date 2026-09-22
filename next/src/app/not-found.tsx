import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-portal-orange mb-4">404</h1>
        <h2 className="text-2xl font-bold text-portal-dark mb-4">Página não encontrada</h2>
        <p className="text-gray-600 mb-8">
          A página que você está procurando não existe ou foi movida.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="bg-portal-orange hover:bg-portal-orange-dark text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Ir para Home
          </Link>
          <Link
            href="/vagas"
            className="border border-portal-dark text-portal-dark px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Ver Vagas
          </Link>
        </div>
      </div>
    </div>
  )
}
