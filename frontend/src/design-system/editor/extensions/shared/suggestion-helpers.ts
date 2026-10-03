import type { Editor, Range } from '@tiptap/core'
import type { EditorState } from '@tiptap/pm/state'

export function insertSuggestionNode(
  editor: Editor,
  range: Range,
  nodeType: string,
  attrs: Record<string, unknown>,
  opts: { trailingSpace?: boolean } = {},
): void {
  const { trailingSpace = true } = opts
  const content: Array<{ type: string; attrs: Record<string, unknown> } | { type: 'text'; text: string }> = [
    { type: nodeType, attrs },
  ]
  if (trailingSpace) {
    content.push({ type: 'text', text: ' ' })
  }
  editor.chain().focus().insertContentAt(range, content).run()
}

export function filterByQuery<T>(items: T[], query: string, key: keyof T): T[] {
  const needle = query.toLowerCase()
  return items.filter((item) => {
    const value = item[key]
    return typeof value === 'string' && value.toLowerCase().includes(needle)
  })
}

export function isInCode(state: EditorState, pos: number): boolean {
  const $pos = state.doc.resolve(pos)
  for (let depth = $pos.depth; depth > 0; depth--) {
    if ($pos.node(depth).type.spec.code) return true
  }
  const codeMark = state.schema.marks.code
  return codeMark ? codeMark.isInSet($pos.marks()) != null : false
}

export function getSuggestionOptions<T = Record<string, unknown>>(
  editor: Editor,
  extensionName: string,
): T | undefined {
  const extension = editor.extensionManager.extensions.find((ext) => ext.name === extensionName)
  return extension?.options as T | undefined
}
