import type { ReactNode } from 'react'
import { useSidebar } from '../../hooks/useSidebar'
import { cn } from '../../utils/cn'

export interface SidebarLabelProps {
  divider?: boolean
  children?: ReactNode
}

export function SidebarLabel({ divider = false, children }: SidebarLabelProps) {
  const { collapsed } = useSidebar()
  return (
    <div data-slot="sidebar-label" className="relative flex h-7 items-center pl-2">
      <h3
        className={cn(
          'text-base text-ink-gray-5 transition-all duration-300 ease-in-out',
          collapsed ? 'w-0 overflow-hidden opacity-0' : 'w-auto opacity-100',
        )}
      >
        {children}
      </h3>
      {divider && collapsed && (
        <div aria-hidden="true" className="absolute inset-0 flex items-center">
          <hr className="w-full border-t border-ink-gray-3" />
        </div>
      )}
    </div>
  )
}
