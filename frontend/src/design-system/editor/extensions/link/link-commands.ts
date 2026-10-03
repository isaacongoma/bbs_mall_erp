import { type Editor, getMarkRange } from '@tiptap/core'
import type { MarkType } from '@tiptap/pm/model'
import { mapStoredRange } from '../shared/node-view'
import { openLinkPopup } from './link-popup-controller'
import type { VirtualReference } from '../../utils/floatingPopup'

export interface OpenLinkEditorOptions {
  startInEdit?: boolean
}

type LinkEditorCommand = (options?: OpenLinkEditorOptions) => (props: { editor: Editor }) => boolean

export function buildOpenLinkEditor(markType: MarkType): LinkEditorCommand {
  return (options?: OpenLinkEditorOptions) =>
    ({ editor }: { editor: Editor }): boolean => {
      const { state } = editor
      const { from, to } = state.selection

      let range: { from: number; to: number }
      let delay = false

      if (from === to) {
        const markRange = getMarkRange(state.selection.$from, markType)
        if (!markRange) return false
        range = { from: markRange.from, to: markRange.to }
        editor.chain().setTextSelection({ from: range.from, to: range.to }).run()
        delay = true
      } else {
        range = { from, to }
      }

      const existingHref = (editor.getAttributes('link').href as string | undefined) || null

      const show = () => {
        void openLinkPopup({
          href: existingHref,
          startInEdit: options?.startInEdit ?? !existingHref,
          anchor: editor.view.dom,
          virtualReference: selectionReference(editor, range),
          onEscape: () => {
            if (!editor.isDestroyed) {
              editor.commands.focus(null, { scrollIntoView: false })
            }
          },
        }).then((href) => {
          if (href === null || editor.isDestroyed) return
          applyLink(editor, range, href)
        })
      }

      if (delay) requestAnimationFrame(show)
      else show()

      return true
    }
}

function selectionReference(editor: Editor, range: { from: number; to: number }): VirtualReference {
  let lastRect = editor.view.dom.getBoundingClientRect()
  return {
    getBoundingClientRect: () => {
      if (editor.isDestroyed) return lastRect
      try {
        lastRect = selectionRect(editor, range)
      } catch {
        return lastRect
      }
      return lastRect
    },
  }
}

function selectionRect(editor: Editor, range: { from: number; to: number }): DOMRect {
  const { from, to } = mapStoredRange(editor.state, range)
  const start = editor.view.coordsAtPos(from)
  const end = editor.view.coordsAtPos(to)
  const top = Math.min(start.top, end.top)
  const bottom = Math.max(start.bottom, end.bottom)
  const left = Math.min(start.left, end.left)
  const right = Math.max(start.right, end.right)
  return {
    width: Math.max(right - left, 0),
    height: Math.max(bottom - top, start.bottom - start.top),
    top,
    right,
    bottom,
    left,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect
}

function applyLink(editor: Editor, storedRange: { from: number; to: number }, href: string): void {
  const { from, to } = mapStoredRange(editor.state, storedRange)
  const chain = editor.chain().focus(null, { scrollIntoView: false })

  if (href === '') {
    chain
      .setTextSelection({ from, to })
      .unsetLink()
      .command(({ tr }) => {
        tr.setStoredMarks([])
        return true
      })
      .run()
    return
  }

  chain
    .setTextSelection({ from, to })
    .setLink({ href })
    .setTextSelection(to)
    .command(({ tr }) => {
      tr.setStoredMarks([])
      return true
    })
    .run()
}
