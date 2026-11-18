import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
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

export default function EmailNavigationGuard({ dirty, blocked = false }) {
  const blocker = useBlocker(dirty || blocked)

  useEffect(() => {
    function beforeUnload(event) {
      if (!dirty && !blocked) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [blocked, dirty])

  const navigationBlocked = blocker.state === 'blocked'

  return (
    <AlertDialog
      open={navigationBlocked}
      onOpenChange={open => {
        if (!open && navigationBlocked) blocker.reset()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {blocked ? 'Operação em andamento' : 'Alterações não salvas'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {blocked
              ? 'Aguarde a confirmação da operação antes de sair. Seu editor permanece protegido.'
              : 'Seu rascunho local ainda não foi salvo. Deseja sair e descartar essas alterações?'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={event => {
              event.preventDefault()
              if (navigationBlocked) blocker.reset()
            }}
          >
            Continuar no editor
          </AlertDialogCancel>
          {!blocked && (
            <AlertDialogAction
              className="bg-red-700 hover:bg-red-800"
              onClick={event => {
                event.preventDefault()
                if (navigationBlocked) blocker.proceed()
              }}
            >
              Sair sem salvar
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
