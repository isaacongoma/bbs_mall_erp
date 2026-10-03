import type { Editor } from '@tiptap/core'
import type { Node } from '@tiptap/pm/model'

const HEADING = 'heading'
const TAB = 'tab'
const TOC = 'tocNode'

export interface HeadingInfo {
  id: string
  level: number
  text: string
  pos: number
}

export interface EditorWithTabCommands extends Editor {
  commands: Editor['commands'] & {
    getCurrentTab?: () => string | null | undefined
  }
}

export function getActiveTabId(editor: Editor): string | null {
  const commands = (editor as EditorWithTabCommands).commands
  if (typeof commands?.getCurrentTab !== 'function') return null
  try {
    return commands.getCurrentTab() || null
  } catch {
    return null
  }
}

export function getActiveTabRange(editor: Editor): { start: number; end: number } | null {
  const activeTabId = getActiveTabId(editor)
  if (!activeTabId) return null

  const doc = editor.state?.doc
  if (!doc) return null

  let range: { start: number; end: number } | null = null
  doc.descendants((node: Node, pos: number) => {
    if (range !== null) return false
    if (node.type.name === TAB && node.attrs?.id === activeTabId) {
      range = { start: pos, end: pos + node.nodeSize }
      return false
    }
    return true
  })
  return range
}

export function collectHeadings(editor: Editor, range?: { start: number; end: number } | null): HeadingInfo[] {
  const doc = editor.state?.doc
  if (!doc) return []

  const headings: HeadingInfo[] = []
  doc.descendants((node: Node, pos: number) => {
    if (node.type.name === TOC) return false
    if (node.type.name !== HEADING) return false

    if (range && (pos < range.start || pos >= range.end)) return false

    const level = node.attrs?.level as number | undefined
    const text = node.textContent?.trim()
    if (!text || !level || level < 1 || level > 6) return false

    const id = (node.attrs?.id as string | undefined) || ''
    headings.push({ id, level, text, pos })
    return false
  })
  return headings
}
