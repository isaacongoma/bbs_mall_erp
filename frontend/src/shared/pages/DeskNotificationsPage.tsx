import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useListResource } from '@/core/resources'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { Button, ErrorMessage, Spinner, usePageMeta } from '@/design-system'
import { LayoutHeader } from '../components/LayoutHeader'
import { EmptyState } from '../components/ListViews'
import type { DocRecord } from '../types/meta'
import { sanitizeHTML } from '../utils/text'

function isRead(notification: DocRecord): boolean {
  return notification.read === true || Number(notification.read) === 1
}

export default function DeskNotificationsPage() {
  const navigate = useNavigate()
  const [actionError, setActionError] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const resource = useListResource({
    doctype: 'Notification Log',
    fields: ['name', 'subject', 'email_content', 'creation', 'read', 'document_type', 'document_name'],
    filters: {},
    orderBy: 'creation desc',
    pageLength: 50,
    auto: true,
  })
  const notifications = useMemo(() => (resource.data ?? []) as DocRecord[], [resource.data])
  usePageMeta({ title: __('Notifications') })

  async function markRead(notification: DocRecord) {
    if (isRead(notification)) return
    try {
      await rpc({
        url: 'frappe.client.set_value',
        method: 'POST',
        params: { doctype: 'Notification Log', name: notification.name, fieldname: 'read', value: 1 },
      })
      resource.applyRowUpdate({ ...notification, read: 1 })
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : __('Unable to mark notification as read'))
    }
  }

  async function markAllRead() {
    setMarkingAll(true)
    setActionError(null)
    try {
      await rpc({ url: 'frappe.desk.doctype.notification_log.notification_log.mark_all_as_read', method: 'POST' })
      for (const notification of notifications) resource.applyRowUpdate({ ...notification, read: 1 })
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : __('Unable to mark notifications as read'))
    } finally {
      setMarkingAll(false)
    }
  }

  async function openNotification(notification: DocRecord) {
    await markRead(notification)
    if (notification.document_type && notification.document_name) {
      navigate(`/app/${encodeURIComponent(String(notification.document_type))}/${encodeURIComponent(String(notification.document_name))}`)
    }
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <LayoutHeader
        left={<h1 className="text-base-medium text-ink-gray-9">{__('Notifications')}</h1>}
        right={<Button variant="ghost" loading={markingAll} disabled={!notifications.some((notification) => !isRead(notification))} label={__('Mark all as read')} onClick={() => void markAllRead()} />}
      />
      {actionError && <ErrorMessage className="mx-auto w-full max-w-4xl px-4 pt-4 sm:px-8" message={actionError} />}
      {resource.list.error ? <ErrorMessage className="m-6" message={resource.list.error} /> : resource.list.loading && !notifications.length ? (
        <div className="flex flex-1 items-center justify-center"><Spinner size="md" /></div>
      ) : notifications.length ? (
        <div className="mx-auto flex w-full max-w-4xl flex-col divide-y divide-outline-gray-1 p-4 sm:p-8">
          {notifications.map((notification) => (
            <button
              key={notification.name}
              type="button"
              className={`flex items-start justify-between gap-4 p-4 text-left hover:bg-surface-gray-1 ${isRead(notification) ? '' : 'bg-surface-blue-1'}`}
              onClick={() => void openNotification(notification)}
            >
              <span className="flex flex-col gap-1">
                <span className="text-sm-medium text-ink-gray-9">{String(notification.subject ?? notification.name)}</span>
                <span className="text-sm text-ink-gray-6" dangerouslySetInnerHTML={{ __html: sanitizeHTML(notification.email_content ?? notification.description ?? '') }} />
                <span className="text-xs text-ink-gray-5">{String(notification.creation ?? '')}</span>
              </span>
              {!isRead(notification) && <span className="size-2 shrink-0 rounded-full bg-surface-blue-7" />}
            </button>
          ))}
        </div>
      ) : (
        <EmptyState name={__('Notifications')} />
      )}
      <div className="flex justify-end border-t border-outline-gray-2 px-4 py-3 sm:px-6">
        <Button variant="ghost" disabled={!resource.hasNextPage} onClick={() => resource.next()}>{__('Load more')}</Button>
      </div>
    </main>
  )
}
