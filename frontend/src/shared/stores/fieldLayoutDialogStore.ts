import { create } from 'zustand'

export interface FieldLayoutDialogProps {
  title?: string
  doctype?: string
  tabs?: any[]
  fields?: any[]
  fieldnames?: string[]
  defaults?: Record<string, any>
  required?: string[]
  size?: string
  actions?: any[]
  onSubmit?: (data: Record<string, any>) => unknown
  onCancel?: () => void
  submitLabel?: string
  cancelLabel?: string
  onResolve: (result: Record<string, any> | null) => void
}

export interface FieldLayoutDialogEntry {
  key: string
  props: FieldLayoutDialogProps
}

interface FieldLayoutDialogState {
  dialogs: FieldLayoutDialogEntry[]
  add: (entry: FieldLayoutDialogEntry) => void
  remove: (key: string) => void
}

export const useFieldLayoutDialogStore = create<FieldLayoutDialogState>((set) => ({
  dialogs: [],
  add: (entry) => set((state) => ({ dialogs: [...state.dialogs, entry] })),
  remove: (key) => set((state) => ({ dialogs: state.dialogs.filter((dialog) => dialog.key !== key) })),
}))
