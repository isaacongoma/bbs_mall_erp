import { useEffect, useRef } from 'react'
import { __ } from '@/core/i18n'
import { getSettingsGroups } from '@/core/modules/registry'
import type { SettingsGroup, SettingsPageDefinition } from '@/core/modules/types'
import { Dialog, SidebarItem, cn } from '@/design-system'
import { Icon } from '@/shared/components/Icon'
import { useUiStore } from '@/shared/stores/uiStore'

function visibleGroups(): SettingsGroup[] {
  return getSettingsGroups()
    .filter((group) => !group.condition || group.condition())
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.condition || item.condition()) }))
    .filter((group) => group.items.length > 0)
}

export function SettingsDialog() {
  const showSettings = useUiStore((state) => state.showSettings)
  const activePage = useUiStore((state) => state.activeSettingsPage)
  const disableOutsideClick = useUiStore((state) => state.disableSettingModalOutsideClick)
  const set = useUiStore((state) => state.set)
  const sidebarRef = useRef<HTMLDivElement | null>(null)

  const groups = visibleGroups()
  const items = groups.flatMap((group) => group.items)
  const active: SettingsPageDefinition | undefined =
    items.find((item) => item.id === activePage || item.label === activePage) ?? items[0]

  useEffect(() => {
    if (!showSettings || !active) return
    sidebarRef.current?.querySelector(`[data-page="${active.id}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [showSettings, active])

  if (!showSettings || !active) return null

  const ActivePage = active.component

  return (
    <Dialog
      open={showSettings}
      onOpenChange={(open) => set({ showSettings: open, activeSettingsPage: open ? activePage : '' })}
      size="5xl"
      disableOutsideClickToClose={disableOutsideClick}
      bare
    >
      <div className="flex h-[calc(100vh_-_8rem)] bg-surface-gray-1">
        <div
          ref={sidebarRef}
          className="m-1 flex w-56 shrink-0 flex-col overflow-y-auto rounded-l-lg bg-surface-gray-1"
        >
          {groups.map((group, index) => (
            <div key={group.label}>
              {index !== 0 && <div className="mx-1 mb-0.5 mt-[5px]" />}
              <div className="sticky top-0 z-10 my-[3px] flex h-7.5 cursor-pointer gap-1.5 bg-surface-gray-1 px-2 py-[7px] text-xs-medium text-ink-gray-5 transition-all duration-300 ease-in-out">
                <span>{__(group.label)}</span>
              </div>
              <nav className="space-y-[3px] px-1">
                {group.items.map((item) => (
                  <div key={item.id} data-page={item.id}>
                    <SidebarItem
                      label={__(item.label)}
                      active={active.id === item.id}
                      onClick={() => set({ activeSettingsPage: item.id })}
                      prefix={item.icon ? <Icon icon={item.icon} className="size-4 text-ink-gray-7" /> : undefined}
                    />
                  </div>
                ))}
              </nav>
            </div>
          ))}
        </div>
        <div className={cn('flex flex-1 flex-col overflow-y-auto bg-surface-elevation-2')}>
          <ActivePage />
        </div>
      </div>
    </Dialog>
  )
}
