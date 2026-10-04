import { useMemo, useState, type MouseEvent } from 'react'
import { __ } from '@/core/i18n'
import { getModuleForRoute, getNavigation, getRailModules, getShellContributions } from '@/core/modules/registry'
import type { NavigationItem } from '@/core/modules/types'
import { resolveLocation, useRoute } from '@/core/navigation'
import { Sidebar, SidebarItem, SidebarLabel, Tooltip, cn, useLocalStorage } from '@/design-system'
import { CollapsibleSection } from '@/shared/components/CollapsibleSection'
import { CollapseSidebar } from '@/shared/components/Icons'
import { Icon } from '@/shared/components/Icon'
import { useUiStore } from '@/shared/stores/uiStore'
import { UserMenu } from '../shell'
import { ModuleRail } from './ModuleRail'

export interface AppSidebarProps {
  mobile?: boolean
}

interface NavSection {
  name: string
  order: number
  items: NavigationItem[]
}

function buildSections(items: NavigationItem[], mobile: boolean): NavSection[] {
  const sections = new Map<string, NavSection>()
  for (const item of items) {
    if (mobile && item.desktopOnly) continue
    const name = item.section ?? ''
    const existing = sections.get(name)
    if (existing) existing.items.push(item)
    else sections.set(name, { name, order: item.sectionOrder ?? 0, items: [item] })
  }
  return [...sections.values()].sort((a, b) => a.order - b.order)
}

function currentRouteKey(name: string | null, view: string | string[] | undefined): string {
  const queryView = Array.isArray(view) ? view[0] : view
  return queryView || name || ''
}

export function AppSidebar({ mobile = false }: AppSidebarProps) {
  const route = useRoute()
  const [storedCollapsed, setStoredCollapsed] = useLocalStorage('isSidebarCollapsed', false)
  const setUi = useUiStore((state) => state.set)
  const isCollapsed = storedCollapsed && !mobile

  const routeKey = currentRouteKey(route.name, route.query.view)
  const [activeItem, setActiveItem] = useState(routeKey)
  const [syncedKey, setSyncedKey] = useState(routeKey)
  if (syncedKey !== routeKey) {
    setSyncedKey(routeKey)
    setActiveItem(routeKey)
  }

  const railModules = getRailModules()
  const [storedModule, setStoredModule] = useLocalStorage<string>('activeModule', '')
  const routeModule = getModuleForRoute(route.name)?.id
  const activeModuleId = mobile
    ? undefined
    : (routeModule ?? (railModules.some((module) => module.id === storedModule) ? storedModule : railModules[0]?.id))
  const [pickedModule, setPickedModule] = useState<string | null>(null)
  const [pickedForRoute, setPickedForRoute] = useState(routeKey)
  if (pickedForRoute !== routeKey) {
    setPickedForRoute(routeKey)
    setPickedModule(null)
  }
  const shownModuleId = mobile ? undefined : (pickedModule ?? activeModuleId)

  function selectModule(id: string) {
    setPickedModule(id)
    setStoredModule(id)
  }

  const sections = useMemo(() => buildSections(getNavigation(shownModuleId), mobile), [mobile, shownModuleId])
  const slotProps = { collapsed: isCollapsed, mobile }
  const topSlots = getShellContributions('sidebarTop', shownModuleId)
  const sectionSlots = getShellContributions('sidebarSections', shownModuleId)
  const footerSlots = getShellContributions('sidebarFooter', shownModuleId)
  const panelSlots = getShellContributions('sidebarPanels', shownModuleId)

  function selectItem(event: MouseEvent, key: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button === 1) return
    setActiveItem(key)
    if (mobile) setUi({ mobileSidebarOpened: false })
  }

  return (
    <div className="relative flex h-full bg-surface-gray-1">
      {!mobile && railModules.length > 0 && (
        <ModuleRail modules={railModules} activeId={shownModuleId} onSelect={selectModule} />
      )}
      <Sidebar
        collapsed={storedCollapsed}
        onCollapsedChange={setStoredCollapsed}
        disableCollapse={mobile}
        width={mobile ? '260px' : undefined}
        className="border-r border-outline-gray-1"
      >
        <div className="flex h-full flex-col p-2">
          <div className="-mx-2 flex flex-1 flex-col gap-1 overflow-y-auto px-2">
            {topSlots.map((Slot, index) => (
              <Slot key={index} {...slotProps} />
            ))}

            {sections.map((section) => (
              <CollapsibleSection
                key={section.name}
                label={section.name}
                hideLabel={!section.name}
                opened
                header={({ opened, hide, toggle }) =>
                  hide ? null : (
                    <SidebarLabel divider>
                      <span
                        className={cn('flex select-none items-center gap-1.5', !isCollapsed && 'cursor-pointer')}
                        onClick={toggle}
                      >
                        <span
                          className={cn(
                            'lucide-chevron-right -ml-0.5 size-4 shrink-0 text-ink-gray-9 transition-transform duration-300 ease-in-out',
                            opened && 'rotate-90',
                          )}
                          aria-hidden="true"
                        />
                        <span className="truncate">{__(section.name)}</span>
                      </span>
                    </SidebarLabel>
                  )
                }
              >
                <nav className="flex flex-col gap-1">
                  {section.items.map((item) => (
                    <SidebarItem
                      key={item.id}
                      to={resolveLocation(item.to)}
                      label={__(item.label)}
                      active={activeItem === item.id}
                      onClick={(event) => selectItem(event, item.id)}
                      prefix={item.icon ? <Icon icon={item.icon} className="size-4 text-ink-gray-7" /> : undefined}
                    >
                      <Tooltip text={__(item.label)} placement="right" hoverDelay={1.5} disabled={isCollapsed}>
                        <span className="truncate text-sm">{__(item.label)}</span>
                      </Tooltip>
                    </SidebarItem>
                  ))}
                </nav>
              </CollapsibleSection>
            ))}

            {sectionSlots.map((Slot, index) => (
              <Slot key={index} {...slotProps} />
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-1 pt-2">
            {!mobile && footerSlots.map((Slot, index) => <Slot key={index} {...slotProps} />)}
            {!mobile && (
              <SidebarItem
                label={isCollapsed ? __('Expand') : __('Collapse')}
                onClick={() => setStoredCollapsed(!storedCollapsed)}
                prefix={
                  <CollapseSidebar
                    className={cn(
                      'size-4 text-ink-gray-7 duration-300 ease-in-out',
                      isCollapsed && '[transform:rotateY(180deg)]',
                    )}
                  />
                }
              />
            )}
            <UserMenu isCollapsed={isCollapsed} />
          </div>
        </div>
      </Sidebar>
      {!mobile && panelSlots.map((Slot, index) => <Slot key={index} {...slotProps} />)}
    </div>
  )
}
