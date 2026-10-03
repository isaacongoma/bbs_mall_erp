import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { SidebarContext } from '../../hooks/useSidebar'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { cn } from '../../utils/cn'

export interface SidebarProps {
  disableCollapse?: boolean
  width?: string
  collapsedWidth?: string
  collapsed?: boolean | null
  onCollapsedChange?: (collapsed: boolean) => void
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

export function Sidebar({
  disableCollapse = false,
  width = '15rem',
  collapsedWidth = '3rem',
  collapsed: controlledCollapsed,
  onCollapsedChange,
  className,
  style,
  children,
}: SidebarProps) {
  const isMobile = useMediaQuery('(max-width: 639px)')
  const [internalCollapsed, setInternalCollapsed] = useState<boolean | null>(null)
  const collapsedState = controlledCollapsed === undefined ? internalCollapsed : controlledCollapsed
  const shouldCollapse = (collapsedState ?? isMobile) && !disableCollapse

  const value = useMemo(
    () => ({
      collapsed: shouldCollapse,
      toggle: () => {
        const next = !shouldCollapse
        setInternalCollapsed(next)
        onCollapsedChange?.(next)
      },
    }),
    [shouldCollapse, onCollapsedChange],
  )

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar"
        data-state={shouldCollapse ? 'collapsed' : 'expanded'}
        className={cn(
          'flex h-full flex-shrink-0 flex-col overflow-x-hidden bg-surface-sidebar transition-[width] duration-300 ease-in-out',
          className,
        )}
        style={{ ...style, width: shouldCollapse ? collapsedWidth : width }}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}
