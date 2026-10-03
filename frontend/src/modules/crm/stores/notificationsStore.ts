import { create } from 'zustand'
import { createResource, type Resource } from '@/core/resources'

interface NotificationsUiState {
  visible: boolean
  toggle: () => void
  setVisible: (visible: boolean) => void
}

export const useNotificationsUi = create<NotificationsUiState>((set) => ({
  visible: false,
  toggle: () => set((state) => ({ visible: !state.visible })),
  setVisible: (visible) => set({ visible }),
}))

export interface CrmNotification {
  name: string
  read?: boolean | number
  [key: string]: any
}

let notificationsResource: Resource<CrmNotification[]> | null = null
let markAsReadResource: Resource | null = null

export function ensureNotificationsLoaded(): Resource<CrmNotification[]> {
  if (!notificationsResource) {
    notificationsResource = createResource<CrmNotification[]>({
      url: 'crm.api.notifications.get_notifications',
      initialData: [],
      auto: true,
    })
  }
  return notificationsResource
}

export function getMarkAsReadResource(): Resource {
  if (!markAsReadResource) {
    markAsReadResource = createResource({
      url: 'crm.api.notifications.mark_as_read',
      onSuccess: () => {
        markAsReadResource!.params = {}
        void ensureNotificationsLoaded().reload()
      },
    })
  }
  return markAsReadResource
}

export function markDocAsRead(doc: string): void {
  const resource = getMarkAsReadResource()
  resource.params = { doc }
  void resource.reload()
  useNotificationsUi.getState().toggle()
}
