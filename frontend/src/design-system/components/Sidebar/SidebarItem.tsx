import { createElement, useState, type MouseEvent, type ReactNode } from 'react'
import { Link, useInRouterContext, useLocation, useResolvedPath, type To } from 'react-router-dom'
import { LucideIcon } from '../../icons'
import type { IconSource } from '../../types/icons'
import { useSidebar } from '../../hooks/useSidebar'
import { isLucideIconString } from '../../utils/iconString'
import { cn } from '../../utils/cn'
import { Tooltip } from '../Tooltip'

export interface SidebarItemIconProps {
  icon?: IconSource
}

export function SidebarItemIcon({ icon }: SidebarItemIconProps) {
  if (!icon) return null
  if (isLucideIconString(icon)) return <LucideIcon name={icon} className="size-4 text-ink-gray-6" />
  if (typeof icon === 'string') return <span className="size-4 text-ink-gray-6">{icon}</span>
  return createElement(icon, { className: 'size-4 text-ink-gray-6' })
}

export interface SidebarItemProps {
  label?: string
  accessKey?: string
  icon?: IconSource
  suffix?: string
  to?: To
  active?: boolean
  onClick?: (event: MouseEvent) => void
  prefix?: ReactNode
  suffixSlot?: ReactNode
  children?: ReactNode
}

function RouterActive({ to, children }: { to: To; children: (active: boolean) => ReactNode }) {
  const location = useLocation()
  const resolved = useResolvedPath(to)
  return <>{children(location.pathname === resolved.pathname)}</>
}

export function SidebarItem({
  label,
  accessKey,
  icon,
  suffix,
  to,
  active,
  onClick,
  prefix,
  suffixSlot,
  children,
}: SidebarItemProps) {
  const { collapsed } = useSidebar()
  const inRouter = useInRouterContext()
  const [labelNode, setLabelNode] = useState<HTMLSpanElement | null>(null)
  const tooltipText = label || labelNode?.textContent?.trim() || ''

  const render = (isActive: boolean) => {
    const main = (
      <>
        <Tooltip text={tooltipText} placement="right" disabled={!collapsed || !tooltipText}>
          <span className={cn('grid shrink-0 place-items-center', collapsed && 'size-7')}>
            {prefix ?? <SidebarItemIcon icon={icon} />}
          </span>
        </Tooltip>
        <span
          className={cn(
            'min-w-0 flex-1 transition-all ease-in-out',
            collapsed ? 'ml-0 w-0 overflow-hidden opacity-0' : 'ml-2 w-auto opacity-100',
          )}
        >
          <span ref={setLabelNode} className="flex min-w-0 items-center">
            {children ?? <span className="truncate text-sm">{label}</span>}
          </span>
        </span>
      </>
    )

    const mainClass = cn(
      'flex h-full min-w-0 flex-1 items-center focus:outline-none focus-visible:ring-0',
      collapsed ? 'justify-center' : 'pl-2',
    )

    return (
      <div
        data-slot="sidebar-item"
        data-state={isActive ? 'active' : 'inactive'}
        className={cn(
          'group/sidebar-item flex h-7 items-center rounded transition',
          isActive ? 'bg-surface-elevation-3 text-ink-gray-8 shadow-sm' : 'text-ink-gray-6 hover:bg-surface-gray-2',
        )}
      >
        {to !== undefined ? (
          inRouter ? (
            <Link
              to={to}
              accessKey={accessKey}
              aria-label={tooltipText || undefined}
              aria-current={isActive ? 'page' : undefined}
              className={mainClass}
              onClick={onClick}
            >
              {main}
            </Link>
          ) : (
            <a
              href={typeof to === 'string' ? to : undefined}
              accessKey={accessKey}
              aria-label={tooltipText || undefined}
              aria-current={isActive ? 'page' : undefined}
              className={mainClass}
              onClick={onClick}
            >
              {main}
            </a>
          )
        ) : (
          <button
            type="button"
            accessKey={accessKey}
            aria-label={tooltipText || undefined}
            className={cn(mainClass, 'text-left')}
            onClick={onClick}
          >
            {main}
          </button>
        )}
        <div
          data-slot="sidebar-item-suffix"
          className={cn(
            'flex shrink-0 items-center transition-all ease-in-out',
            collapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100',
          )}
        >
          {suffixSlot ?? (suffix ? <span className="mr-2 text-sm text-ink-gray-4">{suffix}</span> : null)}
        </div>
      </div>
    )
  }

  if (active === undefined && to !== undefined && inRouter) {
    return <RouterActive to={to}>{render}</RouterActive>
  }
  return render(active ?? false)
}
