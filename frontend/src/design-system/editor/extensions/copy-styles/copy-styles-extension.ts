import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import {
  applyMarksAndAttrs,
  clearMarksAndAttrs,
  collectBlockAttrs,
  collectMarks,
  type StyleClipboardState,
} from './style-clipboard-utils'

export interface StyleClipboardOptions {
  enabled: boolean
}

export interface StyleClipboardStorage {
  data: StyleClipboardState | null
  painting: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    styleClipboard: {
      storeStyles: () => ReturnType
      applyStyles: () => ReturnType
      clearStyles: () => ReturnType
    }
  }
}

const StyleClipboardExtension = Extension.create<StyleClipboardOptions, StyleClipboardStorage>({
  name: 'styleClipboard',

  addOptions() {
    return { enabled: true }
  },

  addStorage() {
    return { data: null, painting: false }
  },

  addCommands() {
    return {
      storeStyles:
        () =>
        ({ editor }) => {
          const { state } = editor
          const { from, to } = state.selection
          if (from === to) return false

          this.storage.data = {
            marks: collectMarks(state, from, to),
            nodeAttrs: collectBlockAttrs(state, from),
          }
          this.storage.painting = true
          return true
        },

      applyStyles:
        () =>
        ({ editor, tr, dispatch }) => {
          const { state } = editor
          const { from, to } = state.selection
          if (from === to) return false

          const stored = this.storage.data
          if (!stored) return false

          applyMarksAndAttrs(state, tr, from, to, stored)
          dispatch?.(tr)
          this.storage.data = null
          this.storage.painting = false
          return true
        },

      clearStyles:
        () =>
        ({ editor, tr, dispatch }) => {
          const { state } = editor
          const { from, to } = state.selection
          if (from === to) return false

          clearMarksAndAttrs(state, tr, from, to)
          dispatch?.(tr)
          return true
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      Escape: () => {
        if (!this.storage.data && !this.storage.painting) return false
        this.storage.data = null
        this.storage.painting = false
        this.editor.commands.focus()
        return true
      },
    }
  },

  addProseMirrorPlugins() {
    const { storage: styleStorage, editor: styleEditor } = this
    return [
      new Plugin({
        view(view) {
          const handleMouseUp = () => {
            if (!styleStorage.painting || !styleStorage.data) return
            const { from, to } = view.state.selection
            if (from === to) return
            styleEditor.commands.applyStyles()
          }
          view.dom.addEventListener('mouseup', handleMouseUp)
          return {
            destroy() {
              view.dom.removeEventListener('mouseup', handleMouseUp)
            },
          }
        },
      }),
    ]
  },
})

export default StyleClipboardExtension
