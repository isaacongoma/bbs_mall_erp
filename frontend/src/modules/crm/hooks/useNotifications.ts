import { useMemo } from 'react'
import { useObservable } from '@/core/resources'
import {
  ensureNotificationsLoaded,
  getMarkAsReadResource,
  markDocAsRead,
  useNotificationsUi,
} from '../stores/notificationsStore'
import { formatCompactNumber } from '@/shared/utils/numberFormat'

export function useNotifications() {
  const notifications = ensureNotificationsLoaded()
  useObservable(notifications)
  const visible = useNotificationsUi((state) => state.visible)
  const toggle = useNotificationsUi((state) => state.toggle)

  const unreadNotificationsCount = useMemo(() => {
    const count = notifications.data?.filter((notification) => !notification.read).length || 0
    return count ? formatCompactNumber(count) : 0
  }, [notifications.data])

  return {
    notifications,
    visible,
    toggle,
    unreadNotificationsCount,
    mark_as_read: getMarkAsReadResource(),
    mark_doc_as_read: markDocAsRead,
  }
}
