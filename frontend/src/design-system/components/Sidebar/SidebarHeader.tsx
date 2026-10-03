import { createElement, type ReactNode } from 'react'
import { LucideIcon } from '../../icons'
import type { IconSource } from '../../types/icons'
import type { MenuOptions } from '../../types/menu'
import { useSidebar } from '../../hooks/useSidebar'
import { cn } from '../../utils/cn'
import { Dropdown } from '../Dropdown'

export interface SidebarHeaderProps {
  title: string
  subtitle?: string
  logo?: string | IconSource
  showLogo?: boolean
  menuItems?: MenuOptions
  logoSlot?: ReactNode
}

export function SidebarHeader({ title, subtitle, logo, showLogo = true, menuItems, logoSlot }: SidebarHeaderProps) {
  const { collapsed } = useSidebar()

  const logoContent =
    logoSlot ??
    (typeof logo === 'string' && !logo.startsWith('lucide-') ? (
      <img src={logo} className="h-full w-full object-cover" alt="Logo" />
    ) : !logo ? (
      <div className="flex h-full w-full items-center justify-center bg-surface-gray-4 text-ink-gray-7">
        {title.charAt(0).toUpperCase()}
      </div>
    ) : typeof logo === 'string' ? (
      <LucideIcon name={logo} className="h-full w-full" />
    ) : (
      createElement(logo, { className: 'w-full h-full' })
    ))

  return (
    <div className={cn('flex h-12 shrink-0 items-center', collapsed ? 'justify-center' : 'px-1')}>
      <Dropdown options={menuItems} matchTriggerWidth>
        {({ open }) => (
          <button
            type="button"
            className={cn(
              'flex h-10 items-center rounded px-1.5 duration-300 ease-in-out',
              collapsed
                ? 'w-auto'
                : open
                  ? 'w-full bg-surface-elevation-2 shadow-sm'
                  : 'w-full hover:bg-surface-gray-3',
            )}
          >
            {showLogo && <div className="size-7 shrink-0 overflow-hidden rounded-[6px]">{logoContent}</div>}
            <div
              className={cn(
                'flex flex-1 flex-col truncate text-left duration-300 ease-in-out',
                collapsed
                  ? 'ml-0 w-0 overflow-hidden opacity-0'
                  : showLogo
                    ? 'ml-2 w-auto opacity-100'
                    : 'ml-0 w-auto opacity-100',
              )}
            >
              <div className="leading-none">
                <span className="text-base-medium text-ink-gray-8">{title}</span>
              </div>
              <div className="mt-0.5 leading-none">
                <span className="text-sm text-ink-gray-6">{subtitle}</span>
              </div>
            </div>
            <div
              className={cn(
                'duration-300 ease-in-out',
                collapsed ? 'ml-0 w-0 overflow-hidden opacity-0' : 'ml-2 w-auto opacity-100',
              )}
            >
              <LucideIcon name="lucide-chevron-down" className="size-4 text-ink-gray-7" />
            </div>
          </button>
        )}
      </Dropdown>
    </div>
  )
}
