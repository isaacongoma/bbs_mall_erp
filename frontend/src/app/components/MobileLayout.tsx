import type { ReactNode } from 'react'
import { GlobalOverlays } from './GlobalOverlays'
import { MobileAppHeader } from './MobileAppHeader'
import { MobileSidebar } from './MobileSidebar'

export function MobileLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="isolate flex h-screen w-screen">
      <MobileSidebar />
      <div className="flex h-full flex-1 flex-col overflow-auto bg-surface-base">
        <MobileAppHeader />
        {children}
      </div>
      <GlobalOverlays mobile />
    </div>
  )
}
