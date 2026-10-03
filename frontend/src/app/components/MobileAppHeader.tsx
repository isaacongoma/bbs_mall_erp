import { getShellContributions } from '@/core/modules/registry'
import { Button } from '@/design-system'
import { MenuIcon } from '@/shared/components/Icons'
import { useUiStore } from '@/shared/stores/uiStore'

export function MobileAppHeader() {
  const setUi = useUiStore((state) => state.set)
  const opened = useUiStore((state) => state.mobileSidebarOpened)
  const actions = getShellContributions('headerActions')

  return (
    <>
      <div className="flex pr-3">
        <div className="z-20 ml-2 flex items-center justify-center">
          <Button className="size-7" variant="ghost" onClick={() => setUi({ mobileSidebarOpened: !opened })}>
            <MenuIcon className="h-4 text-ink-gray-9" />
          </Button>
        </div>
        <div id="app-header" className="flex-1" />
      </div>
      {actions.map((Action, index) => (
        <div key={index} className="mr-3 mt-2">
          <Action />
        </div>
      ))}
    </>
  )
}
