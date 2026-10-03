import type { Editor } from '@tiptap/core'
import type { MarkType } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface ClearLinkOnBoundaryPluginOptions {
  editor: Editor
  type: MarkType
}

export function clearLinkOnBoundaryPlugin(options: ClearLinkOnBoundaryPluginOptions): Plugin {
  return new Plugin({
    key: new PluginKey('clearLinkMarkOnBoundary'),
    appendTransaction: (_transactions, _oldState, newState) => {
      if (!options.editor.isEditable) {
        return null
      }

      const { tr, selection, storedMarks } = newState
      const { $from, empty } = selection

      if (!empty || !storedMarks || storedMarks.length === 0) {
        return null
      }

      const linkMarkType = options.type
      const hasStoredLinkMark = storedMarks.some((mark) => mark.type === linkMarkType)

      if (!hasStoredLinkMark) {
        return null
      }

      const marksAtCursor = $from.marks()
      const activeLinkAtCursor = marksAtCursor.some((mark) => mark.type === linkMarkType)

      if (activeLinkAtCursor) {
        return null
      }

      return tr.setStoredMarks([])
    },
  })
}
