import type { Editor } from '@tiptap/core'
import type { MarkType } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface LinkClickPluginOptions {
  editor: Editor
  type: MarkType
}

export function linkClickPlugin(options: LinkClickPluginOptions): Plugin {
  const { editor } = options
  return new Plugin({
    key: new PluginKey('handleLinkClick'),
    props: {
      handleClick: (view, _pos, event): boolean => {
        if (!editor.isEditable) return false

        const target = event.target as HTMLElement | null
        const anchor = target?.closest('a[href]')
        if (!anchor || !view.dom.contains(anchor)) return false

        if (event.metaKey || event.ctrlKey) {
          event.preventDefault()
          const url = anchor.getAttribute('href') || undefined
          if (url) window.open(url, '_blank', 'noopener,noreferrer')
          editor.commands.focus()
          return true
        }

        return false
      },
    },
  })
}
