import type { EditorState, Transaction } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import type { Node } from '@tiptap/pm/model'
import type { Editor } from '@tiptap/core'

export function safeGetPos(getPos: () => number | undefined): number | null {
  const pos = getPos()
  if (pos === undefined || Number.isNaN(pos)) return null
  return pos
}

export function findNodeByAttr(view: EditorView, typeName: string, attr: string, value: unknown): number | null {
  let found: number | null = null
  view.state.doc.descendants((node: Node, pos: number) => {
    if (found !== null) return false
    if (node.type.name === typeName && node.attrs[attr] === value) {
      found = pos
      return false
    }
    return true
  })
  return found
}

export function findNodeByUploadId(view: EditorView, typeName: string, uploadId: string): number | null {
  return findNodeByAttr(view, typeName, 'uploadId', uploadId)
}

export function dispatchIfAlive(view: EditorView, tr: Transaction): boolean {
  if (view.isDestroyed) return false
  view.dispatch(tr)
  return true
}

export function getExtensionHTMLAttributes(editor: Editor, name: string): Record<string, unknown> {
  const extension = editor.extensionManager?.extensions.find((ext) => ext.name === name)
  const options = extension?.options as { HTMLAttributes?: Record<string, unknown> } | undefined
  return options?.HTMLAttributes ?? {}
}

export function mapStoredRange(state: EditorState, range: { from: number; to: number }): { from: number; to: number } {
  const size = state.doc.content.size
  const from = Math.min(Math.max(range.from, 0), size)
  const to = Math.min(Math.max(range.to, from), size)
  return { from, to }
}
