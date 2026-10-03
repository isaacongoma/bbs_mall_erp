import { createContext, useContext } from 'react'
import type { Editor } from '../types/editor'

export const EditorContext = createContext<Editor | null>(null)

export function useResolvedEditor(editor?: Editor | null): Editor | null {
  const injected = useContext(EditorContext)
  if (editor !== undefined) return editor
  return injected
}
