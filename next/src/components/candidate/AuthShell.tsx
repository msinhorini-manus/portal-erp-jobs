import Link from 'next/link'

import { BrandLockup } from '@/components/layout/BrandLockup'

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
    <section className="bg-[linear-gradient(135deg,#eff5f6_0%,#ffffff_52%,#fff7ec_100%)] px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-lg">
        <Link href="/" className="mx-auto mb-8 block w-fit" aria-label="Jobs by Portal ERP — início">
          <BrandLockup className="w-[220px] sm:w-[250px]" />
        </Link>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_22px_55px_rgba(15,37,48,0.13)] sm:p-8">
          <div className="mb-7 text-center">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-orange-700">O mercado de software trabalha aqui</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-portal-dark">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </section>
  )
}

export const inputClass = 'w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
export const buttonClass = 'inline-flex w-full items-center justify-center rounded-xl bg-[#0F2530] px-4 py-3 font-bold text-white transition hover:bg-[#173D49] disabled:cursor-not-allowed disabled:opacity-60'
