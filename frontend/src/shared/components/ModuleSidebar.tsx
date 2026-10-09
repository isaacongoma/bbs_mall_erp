import { useMemo, useState, type MouseEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { __ } from '@/core/i18n'
import { slugSegment, toInternal } from '@/core/navigation/canonicalPath'
import { SidebarItem, cn } from '@/design-system'
import { Icon } from './Icon'
import { nestSidebarItems, sidebarRoute, type ModuleSidebarData, type SidebarItemData } from '../utils/moduleSidebar'

function routeActive(path: string, pathname: string): boolean {
  const base = path.split('?')[0] ?? ''
  if (!base) return false
  const current = slugSegment(decodeURIComponent(toInternal(pathname)))
  const target = slugSegment(decodeURIComponent(base))
  return current === target || current.startsWith(`${target}/`)
}

const STATE_KEY = 'section-breaks-state'

function readState(): Record<string, Record<string, boolean>> {
  try {
    return JSON.parse(window.localStorage.getItem(STATE_KEY) ?? '{}') as Record<string, Record<string, boolean>>
  } catch {
    return {}
  }
}

function writeState(module: string, label: string, collapsed: boolean): void {
  try {
    const state = readState()
    state[module] = { ...state[module], [label]: collapsed }
    window.localStorage.setItem(STATE_KEY, JSON.stringify(state))
  } catch {
    return
  }
}

function iconName(item: SidebarItemData): string {
  return `lucide-${item.icon || 'list'}`
}

function LinkItem({ item, hideIcon, collapsed }: { item: SidebarItemData; hideIcon: boolean; collapsed: boolean }) {
  const location = useLocation()
  const path = sidebarRoute(item)
  if (!path) return null
  const external = item.link_type === 'URL'
  const label = __(item.label)
  if (external) {
    return (
      <a
        href={path}
        target="_blank"
        rel="noreferrer"
        className="flex h-7 items-center gap-2 rounded px-2 text-sm text-ink-gray-8 hover:bg-surface-gray-3"
      >
        {!hideIcon && <Icon icon={iconName(item)} className="size-4 text-ink-gray-7" />}
        <span className={cn('truncate', collapsed && 'sr-only')}>{label}</span>
      </a>
    )
  }
  return (
    <SidebarItem
      to={path}
      active={routeActive(path, location.pathname)}
      label={label}
      onClick={
        item.open_in_new_tab
          ? (event: MouseEvent) => {
              event.preventDefault()
              window.open(path, '_blank', 'noreferrer')
            }
          : undefined
      }
      prefix={
        hideIcon ? undefined : <Icon icon={iconName(item)} className="size-4 text-ink-gray-7" />
      }
    >
      <span className={cn('truncate text-sm text-ink-gray-8', collapsed && 'sr-only')}>{label}</span>
    </SidebarItem>
  )
}

function SectionItem({ item, module, collapsed }: { item: SidebarItemData; module: string; collapsed: boolean }) {
  const location = useLocation()
  const children = item.nested_items ?? []
  const containsActive = children.some((child) => routeActive(sidebarRoute(child) ?? '', location.pathname))
  const stored = readState()[module]?.[item.label]
  const [closed, setClosed] = useState(containsActive ? false : (stored ?? Boolean(item.keep_closed)))
  if (collapsed) {
    return (
      <div className="flex justify-center py-1" title={__(item.label)}>
        <Icon icon={iconName(item)} className="size-4 text-ink-gray-7" />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        aria-expanded={!closed}
        onClick={() => {
          setClosed(!closed)
          writeState(module, item.label, !closed)
        }}
        className="flex h-7 w-full items-center gap-2 rounded px-2 text-left text-sm text-ink-gray-8 hover:bg-surface-gray-3"
      >
        <Icon icon={iconName(item)} className="size-4 text-ink-gray-7" />
        <span className="flex-1 truncate">{__(item.label)}</span>
        <Icon
          icon="lucide-chevron-right"
          className={cn('size-3.5 text-ink-gray-5 transition-transform duration-200', !closed && 'rotate-90')}
        />
      </button>
      {!closed && (
        <div className="ml-4 flex flex-col gap-0.5 border-l border-outline-gray-2 pl-0">
          {children.map((child) => (
            <LinkItem key={child.key} item={child} hideIcon collapsed={false} />
          ))}
        </div>
      )}
    </div>
  )
}

function ModuleTree({ module, items, collapsed }: { module: string; items: SidebarItemData[]; collapsed: boolean }) {
  const tree = useMemo(() => nestSidebarItems(items), [items])
  return (
    <div className="flex flex-col gap-0.5">
      {tree.map((item) =>
        item.type === 'Section Break' ? (
          <SectionItem key={item.key} item={item} module={module} collapsed={collapsed} />
        ) : (
          <LinkItem key={item.key} item={item} hideIcon={false} collapsed={collapsed} />
        ),
      )}
    </div>
  )
}

export function ModuleSidebar({
  collapsed,
  sidebar,
  sidebars,
}: {
  collapsed: boolean
  sidebar: string
  sidebars: Record<string, ModuleSidebarData>
}) {
  const data = sidebars[sidebar]
  if (!data) return null
  return <ModuleTree key={sidebar} module={sidebar} items={data.items} collapsed={collapsed} />
}
