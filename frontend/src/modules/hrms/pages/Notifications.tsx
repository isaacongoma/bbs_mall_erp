import { useEffect, useEffectEvent, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { Button, ItemListRow, Spinner, toast } from '@/design-system'
import { Link } from 'react-router-dom'
import { useGlobalStore } from '@/shared/stores/globalStore'
import { sanitizeHTML } from '@/shared/utils/text'
import { timeAgo } from '@/shared/utils/date'
import { useHrmsSession } from '../hooks/useHrmsSession'
import { reloadUnreadNotificationCount, useHrmsNotifications } from '../stores/notificationStore'

export default function Notifications() {
  const { profile } = useHrmsSession()
  const [showAll, setShowAll] = useState(false)
  const { resource, notifications, markAsRead } = useHrmsNotifications(profile, showAll)
  const [marking, setMarking] = useState(false)
  const socket = useGlobalStore((state) => state.$socket)
  const reload = useEffectEvent(() => void resource.reload())

  useEffect(() => {
    const onUpdate = (data: unknown) => {
      if (!data || typeof data !== 'object') return
      const update = data as { doctype?: string; cache_key?: string }
      if (update.doctype === 'PWA Notification' || update.cache_key?.includes('hrms:notifications')) reload()
    }
    socket.on('list_update', onUpdate)
    socket.on('hrms:refetch_resource', onUpdate)
    return () => {
      socket.off('list_update', onUpdate)
      socket.off('hrms:refetch_resource', onUpdate)
    }
  }, [socket])

  async function markAll() {
    setMarking(true)
    try {
      await rpc({ url: 'hrms.api.mark_all_notifications_as_read', method: 'POST' })
      setShowAll(false)
      await resource.reload()
      await reloadUnreadNotificationCount()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : __('Unable to mark notifications as read'))
    } finally {
      setMarking(false)
    }
  }

  async function markOne(name: string) {
    try {
      await markAsRead(name)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : __('Unable to mark notification as read'))
    }
  }

  function notificationPath(notification: (typeof notifications)[number]): string | null {
    const id = notification.reference_document_name
    if (!id) return null
    const routes: Record<string, string> = {
      'Leave Application': '/hrms/leaves',
      'Expense Claim': '/hrms/expense-claims',
      'Attendance Request': '/hrms/attendance/requests',
      'Shift Request': '/hrms/attendance/shifts',
      'Employee Advance': '/hrms/employee-advances',
      'Salary Slip': '/hrms/salary-slips',
    }
    const base = routes[notification.reference_document_type ?? '']
    return base ? `${base}/${encodeURIComponent(id)}` : null
  }

  function notificationRow(notification: (typeof notifications)[number]) {
    const path = notificationPath(notification)
    const content = (
      <ItemListRow
        size="lg"
        className={`items-start border-b border-outline-gray-1 last:border-b-0 ${!notification.read ? 'bg-surface-blue-1' : ''}`}
        prefix={
          <span
            className={`mt-2 size-1.5 shrink-0 rounded-full ${notification.read ? 'bg-transparent' : 'bg-surface-blue-7'}`}
          />
        }
      >
        <div>
          <div
            className="text-sm leading-5 text-ink-gray-8"
            dangerouslySetInnerHTML={{ __html: sanitizeHTML(notification.message || notification.name) }}
          />
          <p className="mt-1 text-xs text-ink-gray-5">{timeAgo(notification.creation)}</p>
        </div>
      </ItemListRow>
    )
    if (!path)
      return (
        <button type="button" className="block w-full text-left" onClick={() => void markOne(notification.name)}>
          {content}
        </button>
      )
    return (
      <Link to={path} onClick={() => void markOne(notification.name)}>
        {content}
      </Link>
    )
  }
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink-gray-9">{__('Notifications')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAll((current) => !current)}>
            {showAll ? __('Show Unread') : __('Show All')}
          </Button>
          {!showAll && (
            <Button variant="ghost" loading={marking} onClick={() => void markAll()}>
              {__('Mark all as read')}
            </Button>
          )}
        </div>
      </div>
      {resource.loading && !resource.data ? (
        <div className="flex justify-center py-10">
          <Spinner size="md" />
        </div>
      ) : !notifications.length ? (
        <p className="rounded-xl border border-outline-gray-2 p-5 text-sm text-ink-gray-6">
          {showAll ? __('You have no notifications') : __('You have no unread notifications')}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-gray-2 bg-surface-base">
          {notifications.map((notification) => (
            <div key={notification.name}>{notificationRow(notification)}</div>
          ))}
        </div>
      )}
    </main>
  )
}
