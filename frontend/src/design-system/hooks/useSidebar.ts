import { createContext, useContext } from 'react'

export interface SidebarContextValue {
  collapsed: boolean
  toggle: () => void
}

export const SidebarContext = createContext<SidebarContextValue>({ collapsed: false, toggle: () => undefined })

export function useSidebar(): SidebarContextValue {
  return useContext(SidebarContext)
}
