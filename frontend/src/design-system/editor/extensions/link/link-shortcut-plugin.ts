import type { Editor } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface LinkShortcutPluginOptions {
  editor: Editor
}

export function linkShortcutPlugin(options: LinkShortcutPluginOptions): Plugin {
  const { editor } = options
  return new Plugin({
    key: new PluginKey('linkShortcut'),
    props: {
      handleKeyDown: (view, event): boolean => {
        const isModK =
          (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'k'
        if (!isModK || !editor.isEditable) return false

        event.preventDefault()
        event.stopPropagation()
        const hasSelection = !view.state.selection.empty
        editor.commands.openLinkEditor(hasSelection ? { startInEdit: true } : undefined)
        return true
      },
    },
  })
}
