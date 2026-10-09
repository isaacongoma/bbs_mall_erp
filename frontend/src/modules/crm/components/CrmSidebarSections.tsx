import type { SidebarSlotProps } from '@/core/modules/types'
import { SavedViewsSidebar } from './SavedViewsSidebar'

export function CrmSidebarSections(props: SidebarSlotProps) {
  return (
    <>
      <SavedViewsSidebar {...props} />
    </>
  )
}
