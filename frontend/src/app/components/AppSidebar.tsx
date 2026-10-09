import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { __ } from '@/core/i18n'
import { getModuleForRoute, getNavigation, getRailModules, getShellContributions } from '@/core/modules/registry'
import type { NavigationItem } from '@/core/modules/types'
import { resolveLocation, useRoute } from '@/core/navigation'
import { Dropdown, Sidebar, SidebarItem, SidebarLabel, Tooltip, cn, useLocalStorage } from '@/design-system'
import { CollapsibleSection } from '@/shared/components/CollapsibleSection'
import { CollapseSidebar } from '@/shared/components/Icons'
import { Icon } from '@/shared/components/Icon'
import { ModuleSidebar } from '@/shared/components/ModuleSidebar'
import { useDeskShell } from '@/shared/hooks/useDeskShell'
import { useDeskShellStore } from '@/shared/stores/deskShellStore'
import { useUiStore } from '@/shared/stores/uiStore'
import { appLogo } from '@/shared/utils/appLogos'
import { appOfShell, shellForPath, shellLanding, visibleDock, type DockEntry } from '@/shared/utils/deskShell'
import { UserMenu } from '../shell'
import { DockRail } from './DockRail'

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
  const navigate = useNavigate()
  const shell = useDeskShell()
  const [storedCollapsed, setStoredCollapsed] = useLocalStorage('isSidebarCollapsed', false)
  const setUi = useUiStore((state) => state.set)
  const { activeApp, activeShell, setApp, setShell } = useDeskShellStore()
  const isCollapsed = storedCollapsed && !mobile

  const routeKey = currentRouteKey(route.name, route.query.view)
  const [activeItem, setActiveItem] = useState(routeKey)
  const [syncedKey, setSyncedKey] = useState(routeKey)
  if (syncedKey !== routeKey) {
    setSyncedKey(routeKey)
    setActiveItem(routeKey)
  }

  const routeModule = getModuleForRoute(route.name)
  const registryModules = getRailModules()
  const registryApp =
    routeModule && registryModules.some((module) => module.id === routeModule.id) ? routeModule.id : undefined
  const resolvedShell = shellForPath(shell, route.path)
  const resolvedApp = resolvedShell ? appOfShell(shell, resolvedShell) : undefined

  useEffect(() => {
    if (registryApp) {
      if (activeApp !== registryApp) setApp(registryApp)
      return
    }
    if (resolvedShell && resolvedApp && (activeShell !== resolvedShell || activeApp !== resolvedApp))
      setApp(resolvedApp, resolvedShell)
  }, [registryApp, resolvedShell, resolvedApp, activeApp, activeShell, setApp])

  const deskApps = shell.apps
  const currentApp = registryApp ?? resolvedApp ?? activeApp
  const deskApp = deskApps.find((app) => app.app_name === currentApp)
  const currentShell = resolvedShell ?? activeShell ?? ''
  const orphanShell = Boolean(resolvedShell && !resolvedApp && !registryApp && shell.sidebars[resolvedShell])
  const dockEntries = deskApp ? visibleDock(shell, deskApp.app_name) : []
  const effectiveShell = orphanShell
    ? (resolvedShell ?? '')
    : dockEntries.some((entry) => entry.link_to === currentShell)
      ? currentShell
      : (dockEntries[0]?.link_to ?? '')
  const registryModule = registryApp ? registryModules.find((module) => module.id === registryApp) : undefined
  const showDesk = (Boolean(deskApp) || orphanShell) && !registryModule

  const navSections = useMemo(
    () => buildSections(registryModule ? getNavigation(registryModule.id) : [], mobile),
    [mobile, registryModule],
  )
  const slotProps = { collapsed: isCollapsed, mobile }
  const topSlots = getShellContributions('sidebarTop', registryModule?.id)
  const sectionSlots = getShellContributions('sidebarSections', registryModule?.id)
  const footerSlots = getShellContributions('sidebarFooter', registryModule?.id)
  const panelSlots = getShellContributions('sidebarPanels', registryModule?.id)

  function selectItem(event: MouseEvent, key: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button === 1) return
    setActiveItem(key)
    if (mobile) setUi({ mobileSidebarOpened: false })
  }

  function selectDock(entry: DockEntry) {
    setShell(entry.link_to)
    const landing = shellLanding(shell, entry.link_to)
    if (landing) navigate(landing)
    if (mobile) setUi({ mobileSidebarOpened: false })
  }

  function openSearch() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
  }

  const headerTitle = showDesk
    ? (shell.sidebars[effectiveShell]?.label ?? deskApp?.app_title ?? '')
    : (registryModule?.label ?? '')
  const menuOptions = [
    { label: __('All apps'), icon: 'lucide-layout-grid', onClick: () => navigate('/apps') },
    ...(mobile && showDesk
      ? dockEntries.map((entry) => ({ label: entry.title, onClick: () => selectDock(entry) }))
      : []),
  ]

  return (
    <div className="relative flex h-full bg-surface-gray-1">
      {!mobile && !orphanShell && (
        <DockRail
          logo={showDesk && deskApp ? appLogo(deskApp.app_name, deskApp.app_logo_url) : null}
          logoIcon={registryModule && typeof registryModule.icon === 'string' ? registryModule.icon : undefined}
          appTitle={showDesk ? (deskApp?.app_title ?? '') : (registryModule?.label ?? '')}
          entries={showDesk ? dockEntries : []}
          activeShell={effectiveShell}
          onSelect={selectDock}
          onLogo={() => navigate('/apps')}
          footer={showDesk ? <UserMenu isCollapsed /> : undefined}
        />
      )}
      <Sidebar
        collapsed={storedCollapsed}
        onCollapsedChange={setStoredCollapsed}
        disableCollapse={mobile}
        width={mobile ? '260px' : '224px'}
        className="border-r border-outline-gray-1 bg-surface-white"
      >
        <div className="flex h-full flex-col p-2">
          <div
            className={cn('mb-[10px] flex shrink-0 items-center gap-1', isCollapsed ? 'justify-center' : 'justify-between')}
          >
            {!isCollapsed && (
              <Dropdown options={menuOptions} placement="left">
                <button
                  type="button"
                  className="flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-lg px-2.5 text-left text-base-medium text-ink-gray-9 hover:bg-surface-gray-2"
                >
                  <span className="truncate">{__(headerTitle)}</span>
                  <Icon icon="lucide-chevron-down" className="size-4 shrink-0 text-ink-gray-6" />
                </button>
              </Dropdown>
            )}
            {!mobile && !showDesk && (
              <button
                type="button"
                aria-label={isCollapsed ? __('Expand sidebar') : __('Collapse sidebar')}
                title={isCollapsed ? __('Expand sidebar') : __('Collapse sidebar')}
                onClick={() => setStoredCollapsed(!storedCollapsed)}
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-gray-7 hover:bg-surface-gray-3"
              >
                <CollapseSidebar
                  className={cn(
                    'size-4 text-ink-gray-7 duration-300 ease-in-out',
                    isCollapsed && '[transform:rotateY(180deg)]',
                  )}
                />
              </button>
            )}
          </div>
          <div className="-mx-2 flex flex-1 flex-col gap-1 overflow-y-auto px-2">
            {showDesk && (
              <>
                <div className="mb-[14px] flex flex-col gap-0.5">
                  <SidebarItem
                    prefix={<Icon icon="lucide-search" className="size-4 text-ink-gray-7" />}
                    onClick={openSearch}
                  >
                    <span className="truncate text-sm text-ink-gray-8">{__('Search')}</span>
                  </SidebarItem>
                  <SidebarItem
                    to="/app/notifications"
                    prefix={<Icon icon="lucide-bell" className="size-4 text-ink-gray-7" />}
                    suffixSlot={
                      shell.unread > 0 ? (
                        <span className="rounded bg-surface-amber-1 px-1.5 text-xs text-ink-amber-3">
                          {shell.unread}
                        </span>
                      ) : undefined
                    }
                  >
                    <span className="truncate text-sm text-ink-gray-8">{__('Notification')}</span>
                  </SidebarItem>
                </div>
                <ModuleSidebar collapsed={isCollapsed} sidebar={effectiveShell} sidebars={shell.sidebars} />
              </>
            )}

            {!showDesk && (registryModule || shell.apps.length > 0) && (
              <>
                {topSlots.map((Slot, index) => (
                  <Slot key={index} {...slotProps} />
                ))}
                {navSections.map((section) => {
                  const containsActive = section.items.some((item) => item.id === activeItem)
                  return (
                    <CollapsibleSection
                      key={`${registryModule?.id ?? ''}:${section.name}:${containsActive ? 1 : 0}`}
                      label={section.name}
                      hideLabel={!section.name}
                      opened={!section.name || containsActive || navSections.length === 1}
                      header={({ opened, hide, toggle }) =>
                        hide ? null : (
                          <SidebarLabel divider>
                            <span
                              className={cn('flex select-none items-center gap-1.5', !isCollapsed && 'cursor-pointer')}
                              onClick={toggle}
                            >
                              <Icon
                                icon="lucide-chevron-right"
                                className={cn(
                                  '-ml-0.5 size-4 shrink-0 text-ink-gray-9 transition-transform duration-300 ease-in-out',
                                  opened && 'rotate-90',
                                )}
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
                            prefix={
                              item.icon ? <Icon icon={item.icon} className="size-4 text-ink-gray-7" /> : undefined
                            }
                          >
                            <Tooltip text={__(item.label)} placement="right" hoverDelay={1.5} disabled={isCollapsed}>
                              <span className="truncate text-sm">{__(item.label)}</span>
                            </Tooltip>
                          </SidebarItem>
                        ))}
                      </nav>
                    </CollapsibleSection>
                  )
                })}
                {sectionSlots.map((Slot, index) => (
                  <Slot key={index} {...slotProps} />
                ))}
              </>
            )}
          </div>

          <div className="mt-auto flex flex-col gap-1 pt-2">
            {!mobile && !showDesk && footerSlots.map((Slot, index) => <Slot key={index} {...slotProps} />)}
            {!showDesk && <UserMenu isCollapsed={isCollapsed} />}
          </div>
        </div>
      </Sidebar>
      {!mobile && !showDesk && panelSlots.map((Slot, index) => <Slot key={index} {...slotProps} />)}
    </div>
  )
}
