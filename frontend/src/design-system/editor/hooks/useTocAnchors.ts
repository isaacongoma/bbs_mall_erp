import type { Editor } from '@tiptap/core'
import { useCallback, useMemo, useSyncExternalStore } from 'react'
import {
  collectHeadings,
  getActiveTabId,
  getActiveTabRange,
  type HeadingInfo,
} from '../extensions/shared/heading-scope'
import { foldHeadings, type HeadingTreeNode } from '../extensions/shared/heading-tree-utils'

export type TocAnchorTree = HeadingTreeNode<HeadingInfo>[]

export function useTocAnchors(editor: Editor) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      editor.on('update', onChange)
      editor.on('selectionUpdate', onChange)
      editor.on('create', onChange)
      editor.on('focus', onChange)
      return () => {
        editor.off('update', onChange)
        editor.off('selectionUpdate', onChange)
        editor.off('create', onChange)
        editor.off('focus', onChange)
      }
    },
    [editor],
  )

  const doc = useSyncExternalStore(
    subscribe,
    () => (editor.isDestroyed ? null : editor.state?.doc),
    () => null,
  )
  const tabId = useSyncExternalStore(
    subscribe,
    () => (editor.isDestroyed ? null : getActiveTabId(editor)),
    () => null,
  )

  const anchors = useMemo<HeadingInfo[]>(() => {
    if (!doc || editor.isDestroyed) return []
    return collectHeadings(editor, tabId ? getActiveTabRange(editor) : null)
  }, [editor, doc, tabId])

  const anchorTree = useMemo<TocAnchorTree>(
    () => foldHeadings<HeadingInfo>(anchors, (item) => item as HeadingInfo),
    [anchors],
  )

  return { anchors, anchorTree }
}
