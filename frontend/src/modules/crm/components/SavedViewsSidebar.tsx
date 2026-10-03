import { __ } from '@/core/i18n'
import type { SidebarSlotProps } from '@/core/modules/types'
import { resolveLocation, useRoute } from '@/core/navigation'
import { SidebarItem, SidebarLabel, Tooltip, cn } from '@/design-system'
import { CollapsibleSection } from '@/shared/components/CollapsibleSection'
import { Icon } from '@/shared/components/Icon'
import { ContactsIcon, PhoneIcon, PinIcon } from '@/shared/components/Icons'
import { useViews } from '@/shared/hooks/useViews'
import type { CrmView } from '@/shared/stores/viewsStore'
import { DealsIcon, LeadsIcon, NoteIcon, OrganizationsIcon } from './Icons'

const ROUTE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Leads: LeadsIcon,
  Deals: DealsIcon,
  Contacts: ContactsIcon,
  Organizations: OrganizationsIcon,
  Notes: NoteIcon,
  'Call Logs': PhoneIcon,
}

function viewIcon(view: CrmView) {
  if (view.icon) return view.icon
  return ROUTE_ICONS[view.route_name ?? ''] ?? PinIcon
}

interface ViewSectionProps {
  label: string
  views: CrmView[]
  collapsed: boolean
  activeView: string | undefined
}

function ViewSection({ label, views, collapsed, activeView }: ViewSectionProps) {
  return (
    <CollapsibleSection
      label={label}
      opened
      header={({ opened, toggle }) => (
        <SidebarLabel divider>
          <span
            className={cn('flex select-none items-center gap-1.5', !collapsed && 'cursor-pointer')}
            onClick={toggle}
          >
            <span
              className={cn(
                'lucide-chevron-right -ml-0.5 size-4 shrink-0 text-ink-gray-9 transition-transform duration-300 ease-in-out',
                opened && 'rotate-90',
              )}
              aria-hidden="true"
            />
            <span className="truncate">{__(label)}</span>
          </span>
        </SidebarLabel>
      )}
    >
      <nav className="flex flex-col gap-1">
        {views.map((view) => (
          <SidebarItem
            key={view.name}
            to={resolveLocation({
              name: view.route_name,
              params: { viewType: view.type || 'list' },
              query: { view: view.name },
            })}
            label={__(view.label ?? view.name)}
            active={activeView === view.name}
            prefix={<Icon icon={viewIcon(view)} className="size-4 text-ink-gray-7" />}
          >
            <Tooltip text={__(view.label ?? view.name)} placement="right" hoverDelay={1.5} disabled={collapsed}>
              <span className="truncate text-sm">{__(view.label ?? view.name)}</span>
            </Tooltip>
          </SidebarItem>
        ))}
      </nav>
    </CollapsibleSection>
  )
}

export function SavedViewsSidebar({ collapsed }: SidebarSlotProps) {
  const route = useRoute()
  const { getPinnedViews, getPublicViews } = useViews()
  const activeView = Array.isArray(route.query.view) ? route.query.view[0] : route.query.view
  const publicViews = getPublicViews()
  const pinnedViews = getPinnedViews()

  return (
    <>
      {publicViews.length > 0 && (
        <ViewSection label="Public Views" views={publicViews} collapsed={collapsed} activeView={activeView} />
      )}
      {pinnedViews.length > 0 && (
        <ViewSection label="Pinned Views" views={pinnedViews} collapsed={collapsed} activeView={activeView} />
      )}
    </>
  )
}
