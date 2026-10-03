import type { ReactNode } from 'react'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { GlobalOverlays } from './GlobalOverlays'

export function DesktopLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="isolate flex h-screen w-screen">
      <AppSidebar />
      <div className="flex h-full flex-1 flex-col overflow-auto bg-surface-base">
        <AppHeader />
        {children}
      </div>
      <GlobalOverlays mobile={false} />
    </div>
  )
}
