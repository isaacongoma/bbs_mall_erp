import { useCallback, useSyncExternalStore } from 'react'
import type { Editor } from '../types/editor'

export function useEditorVersion(editor: Editor | null): unknown {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!editor || typeof editor.on !== 'function') return () => undefined
      editor.on('transaction', onChange)
      return () => {
        editor.off('transaction', onChange)
      }
    },
    [editor],
  )

  return useSyncExternalStore(
    subscribe,
    () => (editor && !editor.isDestroyed ? editor.state : null),
    () => null,
  )
}
