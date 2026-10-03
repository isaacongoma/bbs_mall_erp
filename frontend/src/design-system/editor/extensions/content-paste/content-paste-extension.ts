import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Slice } from '@tiptap/pm/model'
import type { EditorView } from '@tiptap/pm/view'
import { imageEngine } from '../image/image-engine'
import { resolveUploadOptions, type UploadFunction } from '../shared/media-upload-engine'
import { absolutizeMediaSrcs } from './media-src-utils'
import { htmlContainsImage } from './paste-html-utils'
import { tryMarkdownSlice } from './paste-markdown-utils'
import { processHTMLImages } from './paste-image-controller'

export interface ContentPasteOptions {
  enabled: boolean
  uploadFunction: UploadFunction | null
}

export const ContentPasteExtension = Extension.create<ContentPasteOptions>({
  name: 'contentPaste',

  addOptions() {
    return {
      enabled: true,
      uploadFunction: null,
    }
  },

  addProseMirrorPlugins() {
    const { editor: pasteEditor, options: pasteOptions } = this
    return [
      new Plugin({
        key: new PluginKey('contentPaste'),
        props: {
          transformCopied(slice) {
            if (!slice) return slice
            const content = absolutizeMediaSrcs(slice.content, window.location.origin)
            if (content === slice.content) return slice
            return new Slice(content, slice.openStart, slice.openEnd)
          },

          handlePaste(view: EditorView, event: ClipboardEvent): boolean {
            if (!pasteOptions.enabled) return false

            const editor = pasteEditor
            if (!editor) return false

            const options = resolveUploadOptions({
              ...pasteOptions,
              editor,
            })

            const files = Array.from(event.clipboardData?.files ?? [])
            const images = files.filter((file) => file.type.startsWith('image/'))
            if (images.length > 0) {
              void imageEngine.processMultiple(images, editor, null, options)
              return true
            }

            const html = event.clipboardData?.getData('text/html')
            if (html && htmlContainsImage(html)) {
              void processHTMLImages(html, editor, imageEngine, options)
              return true
            }
            if (html) return false

            const text = event.clipboardData?.getData('text/plain')
            if (!text) return false
            const slice = tryMarkdownSlice(text, view.state.schema)
            if (!slice) return false
            view.dispatch(view.state.tr.replaceSelection(slice))
            return true
          },
        },
      }),
    ]
  },
})
