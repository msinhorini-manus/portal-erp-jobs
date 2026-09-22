import Link from 'next/link'
import { BriefcaseBusiness } from 'lucide-react'

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-orange-50 px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2" aria-label="Portal ERP Jobs">
          <BriefcaseBusiness className="h-8 w-8 text-orange-500" />
          <span className="text-2xl font-bold text-[#003570]">Portal ERP <span className="text-orange-500">Jobs</span></span>
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </section>
  )
}

export const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
export const buttonClass = 'inline-flex w-full items-center justify-center rounded-lg bg-[#003570] px-4 py-3 font-semibold text-white transition hover:bg-[#002550] disabled:cursor-not-allowed disabled:opacity-60'
