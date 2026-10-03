import { LucideIcon } from '../../icons'
import { useSidebar } from '../../hooks/useSidebar'
import { cn } from '../../utils/cn'
import { SidebarItem } from './SidebarItem'

export function SidebarCollapseToggle() {
  const { collapsed, toggle } = useSidebar()
  return (
    <SidebarItem
      label={collapsed ? 'Expand' : 'Collapse'}
      onClick={toggle}
      prefix={
        <LucideIcon
          name="lucide-panel-right-open"
          className={cn(
            'size-4 text-ink-gray-6 transition-transform duration-300 ease-in-out',
            collapsed && 'rotate-180',
          )}
        />
      }
    />
  )
}
