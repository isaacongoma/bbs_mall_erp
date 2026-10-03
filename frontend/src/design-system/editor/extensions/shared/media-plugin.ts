import { Plugin } from '@tiptap/pm/state'
import type { Transaction, EditorState } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import type { Editor } from '@tiptap/core'
import { dispatchIfAlive } from './node-view'
import { resolveUploadOptions } from './media-upload-engine'
import type { MediaUploadConfig, MediaUploadEngine, MediaUploadOptions } from './media-upload-types'

export interface MediaPluginHost {
  editor: Editor | null
  options: Partial<MediaUploadOptions>
}

function collectFiles(dataTransfer: DataTransfer | null | undefined, accept: RegExp): File[] {
  const items = dataTransfer?.items
  if (!items || items.length === 0) return []
  const files: File[] = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item && item.kind === 'file' && accept.test(item.type)) {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }
  return files
}

export function createMediaPlugin(engine: MediaUploadEngine, config: MediaUploadConfig, host: MediaPluginHost): Plugin {
  const resolve = (): MediaUploadOptions => resolveUploadOptions({ ...host.options, editor: host.editor })

  return new Plugin({
    props: {
      handlePaste: (_view: EditorView, event: ClipboardEvent): boolean => {
        const editor = host.editor
        const options = resolve()
        if (!editor || !options.uploadFunction) return false
        const files = collectFiles(event.clipboardData, config.accept)
        if (files.length === 0) return false

        event.preventDefault()
        void engine.processMultiple(files, editor, null, options)
        return true
      },
    },

    appendTransaction(
      transactions: readonly Transaction[],
      _oldState: EditorState,
      newState: EditorState,
    ): Transaction | null {
      if (!transactions.some((tr) => tr.docChanged)) return null

      const pending: number[] = []
      newState.doc.descendants((node, pos) => {
        if (
          node.type.name === config.nodeName &&
          node.attrs.src &&
          (!node.attrs.width || !node.attrs.height) &&
          !node.attrs.loading
        ) {
          pending.push(pos)
        }
      })
      if (pending.length === 0) return null

      const editor = host.editor
      if (!editor) return null
      pending.forEach((pos) => {
        const node = newState.doc.nodeAt(pos)
        const src = node?.attrs.src as string | undefined
        if (!src) return
        void config
          .probeDimensions(src)
          .then((dims) => {
            const view = editor.view
            const live = view.state.doc.nodeAt(pos)
            if (!live || live.type.name !== config.nodeName) return
            if (live.attrs.src !== src) return
            if (live.attrs.width != null && live.attrs.height != null) return
            dispatchIfAlive(
              view,
              view.state.tr.setNodeMarkup(pos, undefined, {
                ...live.attrs,
                width: live.attrs.width ?? dims.width,
                height: live.attrs.height ?? dims.height,
              }),
            )
          })
          .catch(() => {})
      })

      return null
    },
  })
}
