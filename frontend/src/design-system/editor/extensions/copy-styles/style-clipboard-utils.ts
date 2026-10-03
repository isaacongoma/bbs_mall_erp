import type { EditorState, Transaction } from '@tiptap/pm/state'
import type { MarkType } from '@tiptap/pm/model'

export const COPIED_MARKS: readonly string[] = [
  'textStyle',
  'underline',
  'strike',
  'bold',
  'italic',
  'namedHighlight',
  'namedColor',
]

export const PARAGRAPH_ATTRS: readonly string[] = ['lineHeight', 'spacingBefore', 'spacingAfter']

export interface StyleClipboardState {
  marks: Record<string, Record<string, unknown>>
  nodeAttrs: Record<string, unknown>
}

export function collectMarks(state: EditorState, from: number, to: number): Record<string, Record<string, unknown>> {
  const marks: Record<string, Record<string, unknown>> = {}
  state.doc.nodesBetween(from, to, (node) => {
    node.marks.forEach((mark) => {
      marks[mark.type.name] = mark.attrs
    })
  })
  return marks
}

export function collectBlockAttrs(state: EditorState, from: number): Record<string, unknown> {
  const parentAttrs = state.doc.resolve(from).parent.attrs
  const attrs: Record<string, unknown> = {}
  PARAGRAPH_ATTRS.forEach((attr) => {
    if (parentAttrs[attr] !== undefined) attrs[attr] = parentAttrs[attr]
  })
  return attrs
}

function removeCopiedMarks(state: EditorState, tr: Transaction, from: number, to: number): void {
  COPIED_MARKS.forEach((markName) => {
    const markType: MarkType | undefined = state.schema.marks[markName]
    if (markType) tr.removeMark(from, to, markType)
  })
}

export function applyMarksAndAttrs(
  state: EditorState,
  tr: Transaction,
  from: number,
  to: number,
  stored: StyleClipboardState,
): void {
  removeCopiedMarks(state, tr, from, to)

  for (const [markName, attrs] of Object.entries(stored.marks)) {
    const markType: MarkType | undefined = state.schema.marks[markName]
    if (markType) tr.addMark(from, to, markType.create(attrs))
  }

  const paragraphType = state.schema.nodes.paragraph
  if (paragraphType && Object.keys(stored.nodeAttrs).length > 0) {
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.type === paragraphType) {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          ...stored.nodeAttrs,
        })
      }
    })
  }
}

export function clearMarksAndAttrs(state: EditorState, tr: Transaction, from: number, to: number): void {
  removeCopiedMarks(state, tr, from, to)

  const paragraphType = state.schema.nodes.paragraph
  if (paragraphType) {
    const clearedAttrs: Record<string, null> = {}
    PARAGRAPH_ATTRS.forEach((attr) => {
      clearedAttrs[attr] = null
    })
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.type === paragraphType) {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...clearedAttrs })
      }
    })
  }
}
