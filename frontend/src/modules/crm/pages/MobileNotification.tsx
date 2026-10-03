import { useEffect, useEffectEvent } from 'react'
import { __ } from '@/core/i18n'
import { RouteLink, resolveLocation } from '@/core/navigation'
import { Breadcrumbs, Button } from '@/design-system'
import { MarkAsDoneIcon, NotificationsIcon } from '@/shared/components/Icons'
import { LayoutHeader } from '@/shared/components/LayoutHeader'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { useGlobalStore } from '@/shared/stores/globalStore'
import { timeAgo } from '@/shared/utils/date'
import { sanitizeHTML } from '@/shared/utils/text'
import { WhatsAppIcon } from '../components/Icons'
import { useNotifications } from '../hooks/useNotifications'
import type { CrmNotification } from '../stores/notificationsStore'

function notificationRoute(notification: CrmNotification) {
  const params =
    notification.route_name === 'Deal'
      ? { dealId: notification.reference_name }
      : { leadId: notification.reference_name }
  return {
    name: notification.route_name as string,
    params,
    hash: '#' + (notification.comment || notification.notification_type_doc),
  }
}

export default function MobileNotification() {
  const { notifications, mark_as_read, mark_doc_as_read } = useNotifications()
  const socket = useGlobalStore((state) => state.$socket)

  const reload = useEffectEvent(() => void notifications.reload())
  useEffect(() => {
    const handler = () => reload()
    socket.on('crm_notification', handler)
    return () => socket.off('crm_notification', handler)
  }, [socket])

  const items = notifications.data ?? []

  return (
    <>
      <LayoutHeader
        left={
          <Breadcrumbs items={[{ label: __('Notifications'), route: resolveLocation({ name: 'Notifications' }) }]} />
        }
        right={
          <Button
            tooltip={__('Mark all as read')}
            label={__('Mark all as read')}
            iconLeft={MarkAsDoneIcon}
            onClick={() => void mark_as_read.reload()}
          />
        }
      />
      <div className="flex flex-col overflow-hidden text-ink-gray-9">
        {items.length ? (
          <div className="divide-y divide-outline-gray-1 overflow-y-auto text-base">
            {items.map((notification) => (
              <RouteLink
                key={notification.comment ?? notification.name}
                to={notificationRoute(notification)}
                className="flex cursor-pointer items-start gap-3 px-2.5 py-3 hover:bg-surface-gray-2"
                onClick={() => mark_doc_as_read(notification.comment || notification.notification_type_doc)}
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
          <div className="flex flex-1 flex-col items-center justify-center gap-2">
            <NotificationsIcon className="h-20 w-20 text-ink-gray-2" />
            <div className="text-lg-medium text-ink-gray-4">{__('No New Notifications')}</div>
          </div>
        )}
      </div>
    </>
  )
}
