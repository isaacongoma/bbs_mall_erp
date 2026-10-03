import { ChangePasswordModal } from '@/shared/components/ChangePasswordModal'
import { CreateDocumentModal } from '@/shared/components/CreateDocumentModal'
import { DoctypeModals } from '@/shared/components/DoctypeModals'
import { FieldLayoutDialogContainer } from '@/shared/components/FieldLayoutDialogContainer'
import { QuickEntryModal } from '@/shared/components/QuickEntryModal'
import { useUiStore } from '@/shared/stores/uiStore'
import { AboutModal } from './AboutModal'
import { SettingsDialog } from './SettingsDialog'

export function GlobalModals() {
  const ui = useUiStore()
  const set = ui.set

  return (
    <>
      {ui.showCreateDocumentModal && (
        <CreateDocumentModal
          open={ui.showCreateDocumentModal}
          onOpenChange={(open) => set({ showCreateDocumentModal: open })}
          doctype={ui.createDocumentDoctype}
          data={ui.createDocumentData}
          onCallback={(doc) => ui.createDocumentCallback?.(doc)}
        />
      )}
      {ui.showQuickEntryModal && (
        <QuickEntryModal
          open={ui.showQuickEntryModal}
          onOpenChange={(open) => set({ showQuickEntryModal: open })}
          {...ui.quickEntryProps}
        />
      )}
      {ui.showChangePasswordModal && (
        <ChangePasswordModal
          open={ui.showChangePasswordModal}
          onOpenChange={(open) => set({ showChangePasswordModal: open })}
        />
      )}
      <AboutModal open={ui.showAboutModal} onOpenChange={(open) => set({ showAboutModal: open })} />
      <FieldLayoutDialogContainer />
      <DoctypeModals />
      <SettingsDialog />
    </>
  )
}
