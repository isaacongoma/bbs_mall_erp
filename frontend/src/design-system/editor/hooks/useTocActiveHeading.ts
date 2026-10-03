import type { Editor } from '@tiptap/core'
import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { HeadingInfo } from '../extensions/shared/heading-scope'

const ACTIVE_TOP_THRESHOLD = -50
const ACTIVE_BOTTOM_THRESHOLD = 100

export interface EnrichedAnchor extends HeadingInfo {
  isActive: boolean
  isScrolledOver: boolean
}

function cssAttrValue(value: string): string {
  return value.replace(/["\\]/g, '\\$&')
}

export function useTocActiveHeading(editor: Editor, anchors: HeadingInfo[], container: HTMLElement | null) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!container) return () => undefined
      container.addEventListener('scroll', onChange, { passive: true })
      return () => container.removeEventListener('scroll', onChange)
    },
    [container],
  )

  const scrollTop = useSyncExternalStore(
    subscribe,
    () => container?.scrollTop ?? 0,
    () => 0,
  )

  const enrichedAnchors = useMemo<EnrichedAnchor[]>(() => {
    const editorDom = editor.isDestroyed ? null : editor.view?.dom
    if (!container || !editorDom) {
      return anchors.map((anchor) => ({ ...anchor, isActive: false, isScrolledOver: false }))
    }
    const parentTop = container.getBoundingClientRect().top
    return anchors.map((anchor) => {
      const el = anchor.id ? editorDom.querySelector(`[data-toc-id="${cssAttrValue(anchor.id)}"]`) : null
      if (!el) return { ...anchor, isActive: false, isScrolledOver: false }
      const relativeTop = el.getBoundingClientRect().top - parentTop + scrollTop
      const isActive =
        relativeTop >= scrollTop + ACTIVE_TOP_THRESHOLD && relativeTop <= scrollTop + ACTIVE_BOTTOM_THRESHOLD
      const isScrolledOver = relativeTop < scrollTop + ACTIVE_TOP_THRESHOLD
      return { ...anchor, isActive, isScrolledOver }
    })
  }, [editor, anchors, container, scrollTop])

  return { enrichedAnchors }
}
