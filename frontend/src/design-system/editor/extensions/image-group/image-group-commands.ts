import type { CommandProps, RawCommands } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Editor } from '@tiptap/core'
import { safeGetPos } from '../shared/node-view'
import { clampColumns } from './image-group-utils'
import type { ExistingImage } from '../shared/upload-types'

const IMAGE_GROUP = 'imageGroup'

function imageContent(images: ExistingImage[]): {
  type: string
  attrs: { src: string; alt: string }
}[] {
  return images.map((img) => ({
    type: 'image',
    attrs: { src: img.src, alt: img.alt },
  }))
}

export function buildSetImageGroup(
  nodeName: string,
): (attrs: { columns?: number; images: { src: string; alt?: string }[] }) => (props: CommandProps) => boolean {
  return (attrs) =>
    ({ commands }) =>
      commands.insertContent({
        type: nodeName,
        attrs: { columns: clampColumns(attrs.columns) },
        content: attrs.images.map((img) => ({
          type: 'image',
          attrs: { src: img.src, alt: img.alt ?? '' },
        })),
      })
}

export function buildGroupSelectedImages(nodeName: string): () => (props: CommandProps) => boolean {
  return () =>
    ({ state, chain }) => {
      const { from, to } = state.selection
      const collected: { src: string; alt: string; pos: number }[] = []
      state.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
        if (node.type.name === 'image') {
          collected.push({
            src: node.attrs.src as string,
            alt: (node.attrs.alt as string) ?? '',
            pos,
          })
        }
      })

      if (collected.length < 2) return false

      const insertAnchor = Math.min(...collected.map((img) => img.pos))
      const descending = [...collected].sort((a, b) => b.pos - a.pos)

      let cmd = chain()
      for (const img of descending) {
        const node = state.doc.nodeAt(img.pos)
        if (node && node.type.name === 'image') {
          cmd = cmd.deleteRange({ from: img.pos, to: img.pos + node.nodeSize })
        }
      }
      return cmd
        .insertContentAt(insertAnchor, {
          type: nodeName,
          attrs: { columns: clampColumns(collected.length) },
          content: imageContent(collected.map((img) => ({ src: img.src, alt: img.alt }))),
        })
        .run()
    }
}

export function replaceImageGroup(
  editor: Editor,
  getPos: () => number | undefined,
  data: { images: ExistingImage[]; columns: number },
): boolean {
  if (editor.isDestroyed) return false
  return editor.commands.command(({ tr, state, dispatch }) => {
    const pos = safeGetPos(getPos)
    if (pos === null) return false
    const node = state.doc.nodeAt(pos)
    if (!node || node.type.name !== IMAGE_GROUP) return false
    const newNode = node.type.create(
      { ...node.attrs, columns: clampColumns(data.columns) },
      data.images.map((img) => state.schema.nodes.image!.create({ src: img.src, alt: img.alt })),
    )
    tr.replaceWith(pos, pos + node.nodeSize, newNode)
    if (dispatch) dispatch(tr)
    return true
  })
}

export function removeImageAt(editor: Editor, getPos: () => number | undefined, index: number): boolean {
  if (editor.isDestroyed) return false
  return editor.commands.command(({ tr, state, dispatch }) => {
    const pos = safeGetPos(getPos)
    if (pos === null) return false
    const node = state.doc.nodeAt(pos)
    if (!node || node.type.name !== IMAGE_GROUP) return false
    if (index < 0 || index >= node.childCount) return false

    if (node.childCount <= 1) {
      tr.delete(pos, pos + node.nodeSize)
      if (dispatch) dispatch(tr)
      return true
    }

    const kept: ProseMirrorNode[] = []
    node.forEach((child, _offset, i) => {
      if (i !== index) kept.push(child)
    })
    tr.replaceWith(pos + 1, pos + node.nodeSize - 1, kept)
    if (dispatch) dispatch(tr)
    return true
  })
}

export function setImageGroupColumns(editor: Editor, getPos: () => number | undefined, columns: number): boolean {
  if (editor.isDestroyed) return false
  return editor.commands.command(({ tr, state, dispatch }) => {
    const pos = safeGetPos(getPos)
    if (pos === null) return false
    const node = state.doc.nodeAt(pos)
    if (!node || node.type.name !== IMAGE_GROUP) return false
    tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      columns: clampColumns(columns),
    })
    if (dispatch) dispatch(tr)
    return true
  })
}

export function buildImageGroupCommands(nodeName: string): Partial<RawCommands> {
  return {
    setImageGroup: buildSetImageGroup(nodeName),
    groupSelectedImages: buildGroupSelectedImages(nodeName),
  } as Partial<RawCommands>
}
