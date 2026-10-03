import { useEffect, useEffectEvent, useState } from 'react'
import { __ } from '@/core/i18n'
import { RouteLink } from '@/core/navigation'
import { capture } from '@/core/telemetry'
import { Button } from '@/design-system'
import { MarkAsDoneIcon, NotificationsIcon } from '@/shared/components/Icons'
import { EmptyState } from '@/shared/components/ListViews'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { timeAgo } from '@/shared/utils/date'
import { useGlobalStore } from '@/shared/stores/globalStore'
import { sanitizeHTML } from '@/shared/utils/text'
import { useNotifications } from '../hooks/useNotifications'
import type { CrmNotification } from '../stores/notificationsStore'
import { WhatsAppIcon } from './Icons'

function notificationRoute(notification: CrmNotification) {
  const params =
    notification.route_name === 'Deal'
      ? { dealId: notification.reference_name }
      : { leadId: notification.reference_name }
  return { name: notification.route_name as string, params, hash: notification.hash as string | undefined }
}

export function Notifications() {
  const { notifications, visible, toggle, mark_as_read, mark_doc_as_read } = useNotifications()
  const socket = useGlobalStore((state) => state.$socket)
  const [panel, setPanel] = useState<HTMLDivElement | null>(null)

  const reload = useEffectEvent(() => void notifications.reload())
  const closeIfOutside = useEffectEvent((event: MouseEvent) => {
    if (!visible || !panel) return
    const target = event.target as Element | null
    if (panel.contains(target)) return
    if (target?.closest('#notifications-btn')) return
    toggle()
  })

  useEffect(() => {
    const handler = () => reload()
    socket.on('crm_notification', handler)
    return () => socket.off('crm_notification', handler)
  }, [socket])

  useEffect(() => {
    const handler = (event: MouseEvent) => closeIfOutside(event)
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function markAsRead(doc: string) {
    capture('notification_mark_as_read')
    mark_doc_as_read(doc)
  }

  function markAllAsRead() {
    capture('notification_mark_all_as_read')
    void mark_as_read.reload()
  }

  if (!visible) return null

  const items = notifications.data ?? []

  return (
    <div
      ref={setPanel}
      className="absolute z-20 h-screen bg-surface-base transition-all duration-300 ease-in-out"
      style={{
        boxShadow: '8px 0px 8px rgba(0, 0, 0, 0.1)',
        maxWidth: '352px',
        minWidth: '352px',
        left: 'calc(100% + 1px)',
      }}
    >
      <div className="flex h-screen flex-col text-ink-gray-9">
        <div className="flex items-center justify-between border-b">
          <div className="px-4 pb-3 pt-[15px] text-lg-medium text-ink-gray-8">{__('Notifications')}</div>
          <div className="mr-3 flex gap-1">
            {items.length > 0 && (
              <Button tooltip={__('Mark all as read')} icon={MarkAsDoneIcon} variant="ghost" onClick={markAllAsRead} />
            )}
            <Button tooltip={__('Close')} icon="lucide-x" variant="ghost" onClick={() => toggle()} />
          </div>
        </div>
        <div className="flex h-full">
          {items.length ? (
            <div className="divide-y divide-outline-elevation-2 overflow-auto text-base">
              {items.map((notification) => (
                <RouteLink
                  key={notification.comment ?? notification.name}
                  to={notificationRoute(notification)}
                  className="flex cursor-pointer items-start gap-2.5 px-4 py-2.5 hover:bg-surface-gray-2"
                  onClick={() => markAsRead(notification.comment || notification.notification_type_doc)}
                >
                  <div className="mt-1 flex items-center gap-2.5">
                    <div
                      className={`size-[5px] rounded-full ${notification.read ? 'bg-transparent' : 'bg-surface-gray-10'}`}
                    />
                    {notification.type === 'WhatsApp' ? (
                      <WhatsAppIcon className="size-7" />
                    ) : (
                      <UserAvatar user={notification.from_user.name} size="lg" />
                    )}
                  </div>
                  <div>
                    {notification.notification_text ? (
                      <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(notification.notification_text) }} />
                    ) : (
                      <div className="mb-2 space-x-1 leading-5 text-ink-gray-5">
                        <span className="font-medium text-ink-gray-9">{notification.from_user.full_name}</span>
                        <span>{__('mentioned you in {0}', [notification.reference_doctype])}</span>
                        <span className="font-medium text-ink-gray-9">{notification.reference_name}</span>
                      </div>
                    )}
                    <div className="text-sm text-ink-gray-5">{__(timeAgo(notification.creation))}</div>
                  </div>
                </RouteLink>
              ))}
            </div>
          ) : (
            <EmptyState
              name="Notifications"
              title="No New Notifications"
              description="You have no new notifications"
              icon={NotificationsIcon}
              width="lg"
            />
          )}
        </div>
      </div>
    </div>
  )
}
