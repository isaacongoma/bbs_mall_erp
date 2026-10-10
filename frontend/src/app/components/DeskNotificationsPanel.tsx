import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { useListResource } from '@/core/resources'
import { Button, cn } from '@/design-system'
import { Icon } from '@/shared/components/Icon'
import { Shimmer } from '@/shared/components/Shimmer'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { frappe } from '@/shared/frappe'
import type { DocRecord } from '@/shared/types/meta'
import { timeAgo } from '@/shared/utils/date'
import { sanitizeHTML } from '@/shared/utils/text'

type Tab = 'all' | 'events'

interface DeskNotificationsPanelProps {
  onClose: () => void
}

function isRead(notification: DocRecord): boolean {
  return notification.read === true || Number(notification.read) === 1
}

function PanelShimmer() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Shimmer className="size-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Shimmer className="h-3 w-3/4" />
            <Shimmer className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyPanel({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-ink-gray-5">
      <Icon icon={icon} className="size-8" />
      <span className="text-base">{label}</span>
    </div>
  )
}

export function DeskNotificationsPanel({ onClose }: DeskNotificationsPanelProps) {
  const navigate = useNavigate()
  const panel = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<Tab>('all')
  const [limit, setLimit] = useState(20)
  const logs = useListResource({
    doctype: 'Notification Log',
    fields: ['name', 'subject', 'email_content', 'creation', 'read', 'document_type', 'document_name', 'from_user'],
    filters: {},
    orderBy: 'creation desc',
    pageLength: limit,
    auto: true,
  })
  const events = useListResource({
    doctype: 'Event',
    fields: ['name', 'subject', 'starts_on', 'ends_on', 'event_type'],
    filters: { starts_on: ['>=', new Date().toISOString().slice(0, 10)] },
    orderBy: 'starts_on asc',
    pageLength: 20,
    auto: tab === 'events',
  })
  const items = useMemo(() => (logs.data ?? []) as DocRecord[], [logs.data])
  const eventItems = useMemo(() => (events.data ?? []) as DocRecord[], [events.data])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Element | null
      if (panel.current?.contains(target)) return
      if (target?.closest('[data-notifications-trigger]')) return
      onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  async function markAllRead() {
    try {
      await rpc({ url: 'frappe.desk.doctype.notification_log.notification_log.mark_all_as_read', method: 'POST' })
      for (const notification of items) logs.applyRowUpdate({ ...notification, read: 1 })
    } catch {
      return
    }
  }

  function openNotification(notification: DocRecord) {
    if (!isRead(notification)) {
      void rpc({
        url: 'frappe.client.set_value',
        method: 'POST',
        params: { doctype: 'Notification Log', name: notification.name, fieldname: 'read', value: 1 },
      })
        .then(() => logs.applyRowUpdate({ ...notification, read: 1 }))
        .catch(() => undefined)
    }
    if (notification.document_type && notification.document_name) {
      navigate(
        `/app/${encodeURIComponent(String(notification.document_type))}/${encodeURIComponent(String(notification.document_name))}`,
      )
      onClose()
    }
  }

  const loading = tab === 'all' ? logs.list.loading && !items.length : events.list.loading && !eventItems.length

  return (
    <div
      ref={panel}
      className="absolute left-[calc(100%+1px)] top-0 z-30 flex h-full w-[min(360px,92vw)] flex-col border-r border-outline-gray-2 bg-surface-base text-ink-gray-9 shadow-[8px_0_8px_rgba(0,0,0,0.08)]"
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <h2 className="text-xl font-semibold">{__('Notifications')}</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            icon="lucide-settings"
            tooltip={__('Notification Settings')}
            onClick={() => {
              navigate(`/app/notification-settings/${encodeURIComponent(String(frappe.session?.user ?? ''))}`)
              onClose()
            }}
          />
          <Button
            variant="ghost"
            icon="lucide-check-check"
            tooltip={__('Mark all as read')}
            onClick={() => void markAllRead()}
          />
          <Button variant="ghost" icon="lucide-x" tooltip={__('Close')} onClick={onClose} />
        </div>
      </div>
      <div className="px-4 pb-3">
        <div className="grid grid-cols-2 gap-0.5 rounded-lg bg-surface-gray-2 p-0.5">
          {(['all', 'events'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                'h-8 rounded-md text-base',
                tab === value ? 'bg-surface-base text-ink-gray-9 shadow-sm' : 'text-ink-gray-6 hover:text-ink-gray-8',
              )}
            >
              {value === 'all' ? __('All') : __('Events')}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <PanelShimmer />
        ) : tab === 'all' ? (
          items.length ? (
            <>
              {items.map((notification) => (
                <button
                  key={String(notification.name)}
                  type="button"
                  onClick={() => openNotification(notification)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-gray-1"
                >
                  <span
                    className={cn(
                      'mt-4 size-1.5 shrink-0 rounded-full',
                      isRead(notification) ? 'bg-transparent' : 'bg-surface-gray-9',
                    )}
                  />
                  <UserAvatar user={String(notification.from_user ?? '')} size="xl" />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span
                      className="text-base font-medium leading-5 text-ink-gray-9"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHTML(String(notification.subject ?? notification.name)),
                      }}
                    />
                    <span className="text-sm text-ink-gray-5">{timeAgo(String(notification.creation ?? ''))}</span>
                  </span>
                </button>
              ))}
              <div className="flex justify-center py-4">
                <button
                  type="button"
                  className="text-base text-ink-gray-6 hover:text-ink-gray-9"
                  onClick={() => {
                    if (logs.hasNextPage) setLimit((current) => current + 20)
                    else {
                      navigate('/app/notification-log')
                      onClose()
                    }
                  }}
                >
                  {__('See all Activity')}
                </button>
              </div>
            </>
          ) : (
            <EmptyPanel icon="lucide-bell" label={__('You have no notifications')} />
          )
        ) : eventItems.length ? (
          eventItems.map((event) => (
            <button
              key={String(event.name)}
              type="button"
              onClick={() => {
                navigate(`/app/event/${encodeURIComponent(String(event.name))}`)
                onClose()
              }}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-gray-1"
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-gray-2">
                <Icon icon="lucide-calendar" className="size-4 text-ink-gray-7" />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-base font-medium leading-5">{String(event.subject ?? event.name)}</span>
                <span className="text-sm text-ink-gray-5">{String(event.starts_on ?? '')}</span>
              </span>
            </button>
          ))
        ) : (
          <EmptyPanel icon="lucide-calendar" label={__('No upcoming events')} />
        )}
      </div>
    </div>
  )
}
