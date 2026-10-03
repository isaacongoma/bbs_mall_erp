import type { Editor } from '@tiptap/core'
import { useCallback, useSyncExternalStore } from 'react'

export function useNodeViewEditable(editor: Editor): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      editor.on('update', onChange)
      editor.on('transaction', onChange)
      return () => {
        editor.off('update', onChange)
        editor.off('transaction', onChange)
      }
    },
    [editor],
  )
  return useSyncExternalStore(
    subscribe,
    () => editor.isEditable,
    () => editor.isEditable,
  )
}
