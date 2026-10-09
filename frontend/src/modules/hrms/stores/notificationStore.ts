import { useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { makeHrmsResource, messageTransform, useHrmsQuery, useHrmsResource } from './resource'
import type { HrmsUser } from '../types'
import { toast } from '@/design-system'
import { __ } from '@/core/i18n'

export interface HrmsNotification {
  name: string
  from_user?: string
  message?: string
  read?: boolean
  creation?: string
  reference_document_type?: string
  reference_document_name?: string
}

const notificationsResource = makeHrmsResource<unknown>('frappe.client.get_list', 'hrms:notifications')
const unreadCountResource = makeHrmsResource<unknown>('hrms.api.get_unread_notifications_count', 'hrms:unread_count')
const pushEnabledResource = makeHrmsResource<unknown>('hrms.api.are_push_notifications_enabled', 'hrms:push_enabled')

export function useUnreadNotificationCount(enabled = true): number {
  const resource = useHrmsResource(unreadCountResource, enabled)
  const value = resource.data ? messageTransform<number>(resource.data) : 0
  return value ?? 0
}

export function reloadUnreadNotificationCount(): Promise<unknown> {
  return unreadCountResource.reload()
}

export function useHrmsNotifications(user: HrmsUser | null, showAll = false) {
  const resource = useHrmsQuery(
    notificationsResource,
    user?.name
      ? {
          doctype: 'PWA Notification',
          fields: [
            'name',
            'from_user',
            'message',
            'read',
            'creation',
            'reference_document_type',
            'reference_document_name',
          ],
          filters: { to_user: user.name, ...(showAll ? {} : { read: 0 }) },
          limit_page_length: 20,
          order_by: 'creation desc',
        }
      : null,
    Boolean(user?.name),
  )
  const notifications = resource.data ? messageTransform<HrmsNotification[]>(resource.data) : []

  async function markAsRead(name: string) {
    await rpc({
      url: 'frappe.client.set_value',
      params: { doctype: 'PWA Notification', name, fieldname: 'read', value: 1 },
    })
    await resource.reload()
    await unreadCountResource.reload()
  }

  return { resource, notifications, markAsRead }
}

interface PushNotificationApi {
  isNotificationEnabled?: () => boolean
  enableNotification?: () => Promise<{ permission_granted?: boolean }>
  disableNotification?: () => Promise<void>
}

function pushApi(): PushNotificationApi | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as Window & { frappePushNotification?: PushNotificationApi }).frappePushNotification
}

export function useHrmsPushNotifications() {
  const resource = useHrmsResource(pushEnabledResource)
  const [enabled, setEnabled] = useState(() => Boolean(pushApi()?.isNotificationEnabled?.()))
  const [loading, setLoading] = useState(false)
  const serverEnabled = Boolean(resource.data && messageTransform<boolean>(resource.data))
  const available = serverEnabled && Boolean(pushApi())

  async function toggle(next: boolean) {
    const api = pushApi()
    if (!api || !available || loading) return
    setLoading(true)
    try {
      if (next) {
        const result = await api.enableNotification?.()
        if (!result?.permission_granted) {
          setEnabled(false)
          toast.error(__('Push notification permission denied'))
          return
        }
        setEnabled(true)
        toast.success(__('Push notifications enabled'))
      } else {
        await api.disableNotification?.()
        setEnabled(false)
        toast.success(__('Push notifications disabled'))
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : __('Unable to update push notifications'))
    } finally {
      setLoading(false)
    }
  }

  return { enabled, loading, available, toggle }
}
