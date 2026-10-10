import { createContext, useContext } from 'react'

export const ModernDeskContext = createContext(false)

export function useModernDesk(): boolean {
  return useContext(ModernDeskContext)
}
