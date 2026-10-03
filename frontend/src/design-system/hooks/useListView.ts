import { createContext, useContext } from 'react'
import type { ListViewContextValue } from '../types/listView'

export const ListViewContext = createContext<ListViewContextValue | null>(null)

export function useListView(): ListViewContextValue {
  const context = useContext(ListViewContext)
  if (!context) throw new Error('List components must be rendered inside <ListView>')
  return context
}
