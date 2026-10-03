import { create } from 'zustand'
import type { DialogAction, DialogIconSpec, DialogPosition, DialogSize } from '../components/Dialog/Dialog'

export interface ImperativeDialogOptions {
  title?: string
  message?: string
  html?: string
  error?: string | Error | null
  size?: DialogSize
  icon?: string | DialogIconSpec
  position?: DialogPosition
  actions?: DialogAction[]
  dismissible?: boolean
  onClose?: () => void
}

export interface ImperativeDialog extends ImperativeDialogOptions {
  id: string
  show: boolean
}

interface DialogStoreState {
  dialogs: ImperativeDialog[]
  open: (options: ImperativeDialogOptions) => string
  update: (id: string, patch: Partial<ImperativeDialogOptions>) => void
  setShow: (id: string, show: boolean) => void
  remove: (id: string) => void
}

let counter = 0

export const useDialogStore = create<DialogStoreState>((set) => ({
  dialogs: [],
  open(options) {
    counter += 1
    const id = `dialog-${counter}`
    set((state) => ({ dialogs: [...state.dialogs, { ...options, id, show: false }] }))
    setTimeout(() => {
      set((state) => ({
        dialogs: state.dialogs.map((dialog) => (dialog.id === id ? { ...dialog, show: true } : dialog)),
      }))
    }, 0)
    return id
  },
  update(id, patch) {
    set((state) => ({ dialogs: state.dialogs.map((dialog) => (dialog.id === id ? { ...dialog, ...patch } : dialog)) }))
  },
  setShow(id, show) {
    set((state) => ({ dialogs: state.dialogs.map((dialog) => (dialog.id === id ? { ...dialog, show } : dialog)) }))
  },
  remove(id) {
    set((state) => ({ dialogs: state.dialogs.filter((dialog) => dialog.id !== id) }))
  },
}))

export interface DialogHandle {
  id: string
  close: () => void
  update: (patch: Partial<ImperativeDialogOptions>) => void
}

export function createDialog(options: ImperativeDialogOptions): DialogHandle {
  const { open, update, setShow } = useDialogStore.getState()
  const id = open(options)
  return {
    id,
    close: () => setShow(id, false),
    update: (patch) => update(id, patch),
  }
}

export function isDialogOpen(): boolean {
  return useDialogStore.getState().dialogs.some((dialog) => dialog.show)
}

export interface ConfirmDialogOptions {
  title?: string
  message?: string
  onConfirm?: (context: { hideDialog: () => void }) => void | Promise<void>
  onCancel?: () => void
}

export function confirmDialog({ title, message, onConfirm, onCancel }: ConfirmDialogOptions): DialogHandle {
  let confirmed = false
  const handle: DialogHandle = createDialog({
    title,
    html: message,
    size: 'lg',
    actions: [
      {
        label: 'Confirm',
        variant: 'solid',
        className: 'w-full',
        onClick: async () => {
          confirmed = true
          await onConfirm?.({ hideDialog: () => handle.close() })
        },
      },
    ],
    onClose: () => {
      if (!confirmed) onCancel?.()
    },
  })
  return handle
}
