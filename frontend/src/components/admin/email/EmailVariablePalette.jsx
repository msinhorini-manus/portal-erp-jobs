import { Code2 } from 'lucide-react'

export default function EmailVariablePalette({ variables, focusedField, announcement, onInsert, disabled }) {
  return (
    <section className="rounded-lg border border-blue-200 bg-blue-50 p-4" aria-labelledby="email-variable-title">
      <div className="flex items-start gap-3">
        <Code2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1F3B47]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 id="email-variable-title" className="font-semibold text-[#1F3B47]">Variáveis permitidas</h3>
          <p className="mt-1 text-sm text-blue-900">Insira somente no campo em foco. O Jobs valida e escapa os valores antes de qualquer operação externa.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {variables.map(variable => (
              <button
                key={variable.key}
                type="button"
                className="rounded-full border border-blue-300 bg-white px-3 py-1.5 text-left text-xs font-semibold text-[#1F3B47] transition hover:border-[#F7941D] hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7941D] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={disabled}
                onClick={() => onInsert(variable)}
                title={`${variable.description}. Exemplo: ${variable.example}`}
              >
                {variable.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-blue-800" aria-live="polite">
            Campo focado: <strong>{focusedField === 'html' ? 'HTML' : focusedField === 'text' ? 'Texto simples' : 'Assunto'}</strong>
          </p>
          <p className="sr-only" aria-live="polite">{announcement}</p>
        </div>
      </div>
    </section>
  )
}
