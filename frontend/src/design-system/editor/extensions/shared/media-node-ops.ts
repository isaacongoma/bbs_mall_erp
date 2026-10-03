import type { EditorView } from '@tiptap/pm/view'
import { dispatchIfAlive, findNodeByUploadId } from './node-view'
import type { MediaDimensions } from './media-dimensions'
import type { InsertMode, UploadedFile } from './media-upload-types'

export interface OptionalDimensions {
  width: number | null
  height: number | null
  poster?: string
}

export function findNodeBySource(view: EditorView, nodeName: string, src: string, uploadId?: string): number | null {
  if (uploadId) return findNodeByUploadId(view, nodeName, uploadId)
  let found: number | null = null
  view.state.doc.descendants((node, pos) => {
    if (found !== null) return false
    if (node.type.name === nodeName && node.attrs.src === src) {
      found = pos
      return false
    }
    return true
  })
  return found
}

export function backfillDimensions(view: EditorView, nodeName: string, pos: number, dims: MediaDimensions): void {
  const node = view.state.doc.nodeAt(pos)
  if (!node || node.type.name !== nodeName) return
  const attrs = node.attrs
  if (attrs.width != null && attrs.height != null) return
  dispatchIfAlive(
    view,
    view.state.tr.setNodeMarkup(pos, undefined, {
      ...attrs,
      width: attrs.width ?? dims.width,
      height: attrs.height ?? dims.height,
    }),
  )
}

export function insertPlaceholder(
  view: EditorView,
  nodeName: string,
  pos: number | null | undefined,
  mode: InsertMode,
  uploadId: string,
  dims: OptionalDimensions,
  attrs: Record<string, unknown> = {},
): void {
  const node = view.state.schema.nodes[nodeName]!.create({
    ...attrs,
    loading: true,
    uploadId,
    src: null,
    width: dims.width,
    height: dims.height,
  })
  const tr = view.state.tr
  if (mode === 'replace') {
    if (pos == null) tr.replaceSelectionWith(node)
    else {
      const nodeAtPos = view.state.doc.nodeAt(pos)
      if (nodeAtPos) tr.replaceWith(pos, pos + nodeAtPos.nodeSize, node)
    }
  } else if (pos != null) {
    tr.insert(pos, node)
  } else {
    tr.insert(view.state.selection.from, node)
  }
  dispatchIfAlive(view, tr)
}

export function removeNodeByUploadId(view: EditorView, nodeName: string, uploadId: string): void {
  const pos = findNodeByUploadId(view, nodeName, uploadId)
  if (pos === null) return
  const node = view.state.doc.nodeAt(pos)
  if (!node) return
  dispatchIfAlive(view, view.state.tr.delete(pos, pos + node.nodeSize))
}

export function applyUploadSuccess(view: EditorView, nodeName: string, uploadId: string, uploaded: UploadedFile): void {
  const pos = findNodeByUploadId(view, nodeName, uploadId)
  if (pos === null) return
  const node = view.state.doc.nodeAt(pos)
  if (!node) return
  dispatchIfAlive(
    view,
    view.state.tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      src: uploaded.file_url,
      width: uploaded.width || node.attrs.width,
      height: uploaded.height || node.attrs.height,
      loading: false,
      error: null,
    }),
  )
}

export function applyUploadError(view: EditorView, nodeName: string, uploadId: string, message: string): void {
  const pos = findNodeByUploadId(view, nodeName, uploadId)
  if (pos === null) return
  const node = view.state.doc.nodeAt(pos)
  if (!node) return
  dispatchIfAlive(
    view,
    view.state.tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      loading: false,
      error: message,
    }),
  )
}
