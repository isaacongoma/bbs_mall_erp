import type { Editor } from '@tiptap/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLatest } from '../../hooks/useLatest'
import { safeGetPos } from '../extensions/shared/node-view'

export type ResizeEdge = 'left' | 'right'

export interface ResizeArgs {
  mediaEl: () => HTMLElement | null
  containerEl?: () => HTMLElement | null
  getAspectRatio: () => number
  getPos: () => number | undefined
  onCommit: (size: { width: number; height: number }) => void
  mediaSizing?: 'attribute' | 'style'
  minWidth?: number
  maxWidthPadding?: number
}

export function useNodeViewResize(editor: Editor, args: ResizeArgs) {
  const [isResizing, setIsResizing] = useState(false)
  const latest = useLatest(args)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(
    () => () => {
      cleanupRef.current?.()
    },
    [],
  )

  const startResize = useCallback(
    (event: PointerEvent | MouseEvent | { clientX: number }, edge: ResizeEdge = 'right') => {
      if (!editor.isEditable) return
      const options = latest()
      const el = options.mediaEl()
      if (!el) return

      const minWidth = options.minWidth ?? 50
      const maxWidthPadding = options.maxWidthPadding ?? 0
      const startDragX = event.clientX
      const startWidth = el.offsetWidth
      const renderedAspect = el.offsetWidth ? el.offsetHeight / el.offsetWidth : 0
      const aspectRatio = renderedAspect || options.getAspectRatio() || 1
      const direction = edge === 'left' ? -1 : 1

      setIsResizing(true)

      const onMove = (moveEvent: PointerEvent) => {
        const current = latest().mediaEl()
        if (!current) return
        const editorWidth = editor.view.dom.clientWidth
        const deltaX = (moveEvent.clientX - startDragX) * direction
        const newWidth = Math.max(minWidth, Math.min(startWidth + deltaX, editorWidth - maxWidthPadding))
        current.style.width = `${newWidth}px`
        current.style.height = `${newWidth * aspectRatio}px`
        const container = latest().containerEl?.()
        if (container) container.style.width = `${newWidth}px`
      }

      const detach = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        document.body.style.cursor = ''
        cleanupRef.current = null
      }

      const onUp = () => {
        detach()
        setIsResizing(false)
        const current = latest().mediaEl()
        if (!current) return
        const width = current.offsetWidth
        const height = current.offsetHeight

        if (safeGetPos(latest().getPos) === null) {
          current.style.width = ''
          current.style.height = ''
          const container = latest().containerEl?.()
          if (container) container.style.width = ''
          return
        }
        latest().onCommit({ width, height })
        if ((latest().mediaSizing ?? 'attribute') === 'attribute') {
          requestAnimationFrame(() => {
            current.style.width = ''
            current.style.height = ''
          })
        }
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
      document.body.style.cursor = 'ew-resize'
      cleanupRef.current = detach
    },
    [editor, latest],
  )

  return { isResizing, startResize }
}
