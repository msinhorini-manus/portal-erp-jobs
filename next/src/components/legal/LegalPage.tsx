import Link from 'next/link'

type Section = { title: string; paragraphs: React.ReactNode[] }

export function LegalPage({ eyebrow, title, introduction, updated, sections }: { eyebrow: string; title: string; introduction: React.ReactNode; updated?: string; sections: Section[] }) {
  return <article className="bg-slate-50 py-12 sm:py-16"><div className="mx-auto max-w-4xl px-5"><div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10"><p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-600">{eyebrow}</p><h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-portal-dark sm:text-5xl">{title}</h1><div className="mt-5 text-lg leading-8 text-slate-600">{introduction}</div>{updated && <p className="mt-4 text-sm text-slate-500">Última atualização: {updated}</p>}<div className="mt-10 space-y-9">{sections.map(section => <section key={section.title}><h2 className="font-display text-2xl font-bold text-portal-dark">{section.title}</h2><div className="mt-3 space-y-4 text-base leading-7 text-slate-700">{section.paragraphs.map((paragraph, index) => <div key={index}>{paragraph}</div>)}</div></section>)}</div><div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-600">Dúvidas? <Link href="/contato" className="font-semibold text-blue-700 underline">Fale com o Portal ERP Jobs</Link>.</div></div></div></article>
}
