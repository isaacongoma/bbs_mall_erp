import type { Editor } from '@tiptap/core'

export function toggleCodeOnBacktick(editor: Editor): boolean {
  const { from, to } = editor.state.selection
  if (from === to) return false
  return editor.commands.toggleCode()
}
