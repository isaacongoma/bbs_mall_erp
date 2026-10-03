import { Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { TocNodeView } from '../../components/TocNodeView'
import { renderTocHTML } from './toc-render'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tocNode: {
      insertTableOfContentsNode: () => ReturnType
    }
  }
}

export const TocNodeExtension = Node.create({
  name: 'tocNode',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      placeholder: {
        default: 'Table of Contents',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="toc-node"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return renderTocHTML(this.editor, HTMLAttributes)
  },

  addNodeView() {
    return ReactNodeViewRenderer(TocNodeView)
  },

  addCommands() {
    return {
      insertTableOfContentsNode:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              placeholder: 'Table of Contents',
            },
          })
        },
    }
  },
})

export default TocNodeExtension
