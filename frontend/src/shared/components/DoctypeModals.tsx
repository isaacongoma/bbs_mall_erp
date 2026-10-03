import { useUiStore } from '../stores/uiStore'
import { DoctypeModal } from './DoctypeModal'

export function DoctypeModals() {
  const modal = useUiStore((state) => state.doctypeModal)
  const closeDoctypeModal = useUiStore((state) => state.closeDoctypeModal)
  const triggerCallback = useUiStore((state) => state.triggerDoctypeCallback)

  if (!modal.show) return null

  return (
    <DoctypeModal
      open={modal.show}
      onOpenChange={(open) => {
        if (!open) closeDoctypeModal()
      }}
      doctypeTitle={modal.title}
      doctype={modal.doctype}
      docname={modal.name ?? ''}
      defaults={modal.defaults}
      onAfterInsert={(saved) => triggerCallback('afterInsert', saved)}
      onAfterUpdate={(saved) => triggerCallback('afterUpdate', saved)}
    />
  )
}
