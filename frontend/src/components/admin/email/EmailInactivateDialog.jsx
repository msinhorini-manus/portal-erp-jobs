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

export default function EmailInactivateDialog({ open, template, busy, onCancel, onConfirm }) {
  return (
    <AlertDialog open={open} onOpenChange={value => { if (!value && !busy) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Inativar template?</AlertDialogTitle><AlertDialogDescription>O template ficará indisponível para novos envios operacionais. As versões e a auditoria editorial serão preservadas.</AlertDialogDescription></AlertDialogHeader>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><strong>{template?.name || template?.key}</strong><p className="mt-1">Inativar não apaga conteúdo e não gera disparos retroativos.</p></div>
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-red-700 hover:bg-red-800" disabled={busy} onClick={event => { event.preventDefault(); onConfirm() }}>{busy ? 'Inativando…' : 'Confirmar inativação'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
