import { __ } from '@/core/i18n'
import { useRoute } from '@/core/navigation'
import { resolveLocation } from '@/core/navigation/routeTable'
import { Badge, SidebarItem } from '@/design-system'
import { NotificationsIcon } from '@/shared/components/Icons'
import type { SidebarSlotProps } from '@/core/modules/types'
import { useNotifications } from '../hooks/useNotifications'

export function NotificationsSidebarItem({ collapsed, mobile }: SidebarSlotProps) {
  const route = useRoute()
  const { toggle, unreadNotificationsCount } = useNotifications()

  return (
    <div id="notifications-btn">
      <SidebarItem
        label={__('Notifications')}
        to={mobile ? resolveLocation({ name: 'Notifications' }) : undefined}
        active={mobile && route.name === 'Notifications'}
        onClick={() => {
          if (!mobile) toggle()
        }}
        prefix={
          <span className="relative grid size-4 place-items-center">
            <NotificationsIcon className="size-4 text-ink-gray-7" />
            {collapsed && unreadNotificationsCount ? (
              <span className="absolute -right-1 -top-1 size-1.5 rounded-full bg-surface-gray-9 ring-1 ring-[var(--surface-gray-1)]" />
            ) : null}
          </span>
        }
        suffixSlot={
          unreadNotificationsCount ? (
            <Badge className="mr-2" label={String(unreadNotificationsCount)} variant="subtle" />
          ) : undefined
        }
      />
    </div>
  )
}
