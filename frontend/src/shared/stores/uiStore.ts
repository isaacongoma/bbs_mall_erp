import { create } from 'zustand'

interface DoctypeModalState {
  show: boolean
  doctype: string
  name: string | null
  title: string
  defaults: Record<string, any>
  callbacks: Record<string, (...args: any[]) => void>
}

export interface ShowDoctypeModalOptions {
  name?: string | null
  doctype: string
  title?: string
  defaults?: Record<string, any>
  callbacks?: Record<string, (...args: any[]) => void>
}

interface UiState {
  mobileSidebarOpened: boolean
  showSettings: boolean
  disableSettingModalOutsideClick: boolean
  activeSettingsPage: string
  showQuickEntryModal: boolean
  quickEntryProps: Record<string, any>
  showAboutModal: boolean
  showChangePasswordModal: boolean
  showCreateDocumentModal: boolean
  createDocumentDoctype: string
  createDocumentData: Record<string, any>
  createDocumentCallback: ((...args: any[]) => void) | null
  doctypeModal: DoctypeModalState
  set: (patch: Partial<Omit<UiState, 'set'>>) => void
  showDoctypeModal: (options: ShowDoctypeModalOptions) => void
  closeDoctypeModal: () => void
  triggerDoctypeCallback: (event: string, ...args: any[]) => void
}

export const useUiStore = create<UiState>((set, get) => ({
  mobileSidebarOpened: false,
  showSettings: false,
  disableSettingModalOutsideClick: false,
  activeSettingsPage: '',
  showQuickEntryModal: false,
  quickEntryProps: {},
  showAboutModal: false,
  showChangePasswordModal: false,
  showCreateDocumentModal: false,
  createDocumentDoctype: '',
  createDocumentData: {},
  createDocumentCallback: null,
  doctypeModal: { show: false, doctype: '', name: null, title: '', defaults: {}, callbacks: {} },
  set: (patch) => set(patch),
  showDoctypeModal({ name = null, doctype, title = '', defaults = {}, callbacks = {} }) {
    set({ doctypeModal: { show: true, doctype, name, title, defaults, callbacks } })
  },
  closeDoctypeModal() {
    set((state) => ({ doctypeModal: { ...state.doctypeModal, show: false } }))
  },
  triggerDoctypeCallback(event, ...args) {
    get().doctypeModal.callbacks[event]?.(...args)
  },
}))

export function isMobileView(): boolean {
  return window.innerWidth < 768
}
