import { AlertTriangle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { compareFields, localeLabel } from './email-center-helpers.mjs'

const fieldLabels = { name: 'Nome', subject: 'Assunto', html: 'HTML', text: 'Texto simples' }

export default function EmailPublishDialog({ open, template, draft, busy, onCancel, onConfirm }) {
  const changedFields = compareFields(template?.published || {}, draft)
  const isBrazil = String(template?.country_code || '').trim().toUpperCase() === 'BR'
  const isInactive = template?.status === 'inactive'
  return (
    <AlertDialog open={open} onOpenChange={value => { if (!value && !busy) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-[#1F3B47]"><AlertTriangle className="h-5 w-5 text-[#F7941D]" aria-hidden="true" />Confirmar publicação</AlertDialogTitle>
          <AlertDialogDescription>Você está publicando uma nova versão editorial do template autorizado. A versão anterior permanece imutável quando aplicável.</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded-lg bg-slate-50 p-3"><p><strong>Chave:</strong> {template?.key}</p><p><strong>Idioma:</strong> {localeLabel(template?.locale)}</p><p><strong>País:</strong> {isBrazil ? 'Brasil' : 'Base editorial não ativada'}</p><p><strong>Revisão:</strong> {template?.revision ?? 0}</p></div>
          <div><p className="font-semibold text-gray-800">Campos que serão publicados</p><p className="mt-1 text-gray-600">{changedFields.length ? changedFields.map(field => fieldLabels[field]).join(', ') : 'Conteúdo conforme o rascunho persistido.'}</p></div>
          {isInactive && <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-950"><strong>Template inativo:</strong> esta publicação reativa somente a disponibilidade editorial de uma nova versão. Ela não ativa envios, regras ou países.</p>}
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950"><strong>Publicar não dispara e-mail.</strong> Não ativa regra, evento, worker, backlog, região, remetente, destinatário ou credencial.</p>
        </div>
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-[#1F3B47] hover:bg-[#17303a]" disabled={busy} onClick={event => { event.preventDefault(); onConfirm() }}>{busy ? 'Publicando…' : isInactive ? 'Publicar e reativar versão editorial' : 'Confirmar publicação'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
