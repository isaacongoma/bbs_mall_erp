import type { Editor } from '@tiptap/core'
import type { MarkType } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { isSafeUrl } from '../shared/url-safety'

export interface LinkPastePluginOptions {
  editor: Editor
  type: MarkType
}

export function linkPastePlugin(options: LinkPastePluginOptions): Plugin {
  return new Plugin({
    key: new PluginKey('handlePasteLink'),
    props: {
      handlePaste: (view, _event, slice): boolean => {
        const { selection } = view.state
        if (selection.empty) return false

        if (slice.content.childCount > 1) return false

        let textContent = ''
        slice.content.forEach((node) => {
          textContent += node.textContent
        })
        const text = textContent.trim()
        if (!text || /[\r\n]/.test(text)) return false

        if (!isSafeUrl(text, { allowedSchemes: ['http', 'https'] })) {
          return false
        }

        return options.editor
          .chain()
          .setTextSelection({ from: selection.from, to: selection.to })
          .setLink({ href: text })
          .setTextSelection(selection.to)
          .command(({ tr }) => {
            tr.setStoredMarks([])
            return true
          })
          .run()
      },
    },
  })
}
