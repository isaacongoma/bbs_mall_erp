import * as RadixDialog from '@radix-ui/react-dialog'
import { useEffect } from 'react'
import { useRoute } from '@/core/navigation'
import { useUiStore } from '@/shared/stores/uiStore'
import '../styles/drawer.css'
import { AppSidebar } from './AppSidebar'

export function MobileSidebar() {
  const opened = useUiStore((state) => state.mobileSidebarOpened)
  const setUi = useUiStore((state) => state.set)
  const { fullPath } = useRoute()

  useEffect(() => {
    setUi({ mobileSidebarOpened: false })
  }, [fullPath, setUi])

  return (
    <RadixDialog.Root open={opened} onOpenChange={(open) => setUi({ mobileSidebarOpened: open })}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="drawer-overlay fixed inset-0 z-40 bg-surface-gray-8/50" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="drawer-panel fixed inset-y-0 left-0 z-50 h-full w-fit outline-none"
        >
          <RadixDialog.Title className="sr-only">Navigation</RadixDialog.Title>
          <AppSidebar mobile />
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
