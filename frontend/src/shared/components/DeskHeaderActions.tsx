import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useRoute } from '@/core/navigation'
import { useListResource } from '@/core/resources'
import { __ } from '@/core/i18n'
import { Badge, LucideIcon } from '@/design-system'

export function DeskHeaderActions() {
  const route = useRoute()
  const resource = useListResource({
    doctype: 'Notification Log',
    fields: ['name'],
    filters: { read: 0 },
    orderBy: 'creation desc',
    pageLength: 20,
    auto: !route.path.startsWith('/hrms'),
  })
  const unread = useMemo(() => ((resource.data ?? []) as Array<{ name?: string }>).length, [resource.data])
  if (route.path.startsWith('/hrms')) return null
  return (
    <Link
      to="/app/notifications"
      className="relative rounded p-1.5 text-ink-gray-7 hover:bg-surface-gray-2"
      aria-label={__('Notifications')}
    >
      <LucideIcon name="bell" className="size-4" />
      {unread > 0 && (
        <Badge
          className="absolute -right-2 -top-1 min-w-4 px-1"
          label={unread > 9 ? '9+' : String(unread)}
          variant="subtle"
        />
      )}
    </Link>
  )
}
