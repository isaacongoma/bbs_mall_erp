import Link from '@tiptap/extension-link'
import { buildOpenLinkEditor, type OpenLinkEditorOptions } from './link-commands'
import { linkPastePlugin } from './link-paste-plugin'
import { clearLinkOnBoundaryPlugin } from './clear-link-on-boundary-plugin'
import { linkClickPlugin } from './link-click-plugin'
import { linkShortcutPlugin } from './link-shortcut-plugin'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    linkEditor: {
      openLinkEditor: (options?: OpenLinkEditorOptions) => ReturnType
    }
  }
}

export const LinkExtension = Link.extend({
  addOptions() {
    return {
      ...this.parent!(),
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
      linkOnPaste: false,
      shouldAutoLink: (url: string): boolean => {
        const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(url)
        const hasWww = /^www\./i.test(url)
        return hasScheme || hasWww
      },
    }
  },

  addCommands() {
    return {
      ...this.parent?.(),
      openLinkEditor: buildOpenLinkEditor(this.type),
    }
  },

  addProseMirrorPlugins() {
    const plugins = this.parent?.() ?? []
    plugins.push(
      linkPastePlugin({ editor: this.editor, type: this.type }),
      clearLinkOnBoundaryPlugin({ editor: this.editor, type: this.type }),
      linkClickPlugin({ editor: this.editor, type: this.type }),
      linkShortcutPlugin({ editor: this.editor }),
    )
    return plugins
  },
})

export default LinkExtension
