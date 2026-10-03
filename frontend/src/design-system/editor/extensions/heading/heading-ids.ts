import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Transaction } from '@tiptap/pm/state'
import type { Node } from '@tiptap/pm/model'

const HEADING = 'heading'

let counter = 0

function createHeadingId(): string {
  counter += 1
  return `toc-${Date.now().toString(36)}-${counter.toString(36)}`
}

export const HeadingIds = Extension.create({
  name: 'headingIds',

  addGlobalAttributes() {
    return [
      {
        types: [HEADING],
        attributes: {
          id: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              element.getAttribute('data-toc-id') || element.getAttribute('id') || null,
            renderHTML: (attributes: { id?: string | null }) => {
              if (!attributes.id) return {}
              return {
                id: attributes.id,
                'data-toc-id': attributes.id,
              }
            },
          },
        },
      },
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('headingIds'),
        appendTransaction: (_transactions, _oldState, newState) => {
          const seen = new Set<string>()
          const assignments: { pos: number; id: string }[] = []

          newState.doc.descendants((node: Node, pos: number) => {
            if (node.type.name !== HEADING) return true
            const current = node.attrs.id as string | null
            if (current && !seen.has(current)) {
              seen.add(current)
              return false
            }
            const id = createHeadingId()
            seen.add(id)
            assignments.push({ pos, id })
            return false
          })

          if (assignments.length === 0) return null

          const tr: Transaction = newState.tr
          for (const { pos, id } of assignments) {
            const node = tr.doc.nodeAt(pos)
            if (!node) continue
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, id })
          }
          tr.setMeta('addToHistory', false)
          return tr
        },
      }),
    ]
  },
})

export default HeadingIds
