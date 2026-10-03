import { Extension } from '@tiptap/core'
import { Plugin, Selection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { openImageGroupUploadDialog } from '../image-group/imageGroupDialogController'

const IMAGE_RE = /^image\//i
const VIDEO_RE = /^video\//i

function collectFiles(dataTransfer: DataTransfer | null | undefined): File[] {
  const items = dataTransfer?.items
  if (!items || items.length === 0) return []
  const files: File[] = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item && item.kind === 'file') {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }
  return files
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mediaDrop: {
      dropFiles: (files: File[]) => ReturnType
    }
  }
}

export const MediaDrop = Extension.create({
  name: 'mediaDrop',

  addCommands() {
    return {
      dropFiles:
        (files: File[]) =>
        ({ editor }) => {
          if (files.length === 0) return false

          const images = files.filter((f) => IMAGE_RE.test(f.type))
          const videos = files.filter((f) => VIDEO_RE.test(f.type))
          const others = files.filter((f) => !IMAGE_RE.test(f.type) && !VIDEO_RE.test(f.type))

          const can = (name: string): boolean =>
            typeof (editor.commands as Record<string, unknown>)[name] === 'function'

          let handled = false

          if (images.length === 1 && can('uploadImage')) {
            editor.commands.uploadImage(images[0]!)
            handled = true
          } else if (images.length > 1 && can('uploadImage')) {
            openImageGroupUploadDialog({ editor, files: images })
            handled = true
          }

          if (videos.length > 0 && can('uploadVideoFiles')) {
            editor.commands.uploadVideoFiles(videos)
            handled = true
          }

          if (others.length > 0 && can('uploadAttachmentFiles')) {
            editor.commands.uploadAttachmentFiles(others)
            handled = true
          }

          return handled
        },
    }
  },

  addProseMirrorPlugins() {
    const editor = this.editor

    const can = (name: string): boolean => typeof (editor.commands as Record<string, unknown>)[name] === 'function'

    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            drop: (view: EditorView, event: DragEvent): boolean => {
              const files = collectFiles(event.dataTransfer)
              if (files.length === 0) return false
              const hasMedia = files.some((f) => IMAGE_RE.test(f.type) || VIDEO_RE.test(f.type))
              const hasOther = files.some((f) => !IMAGE_RE.test(f.type) && !VIDEO_RE.test(f.type))
              const routable = hasMedia || (hasOther && can('uploadAttachmentFiles'))
              if (!routable) return false

              event.preventDefault()
              event.stopPropagation()

              const coords = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              })
              if (coords) {
                view.dispatch(view.state.tr.setSelection(Selection.near(view.state.doc.resolve(coords.pos))))
              }

              editor.commands.dropFiles(files)
              return true
            },
          },

          handlePaste: (_view, event): boolean => {
            if (!can('uploadAttachmentFiles')) return false
            const files = collectFiles(event.clipboardData)
            if (files.length === 0) return false
            const others = files.filter((f) => !IMAGE_RE.test(f.type) && !VIDEO_RE.test(f.type))
            if (others.length !== files.length) return false

            event.preventDefault()
            editor.commands.uploadAttachmentFiles(others)
            return true
          },
        },
      }),
    ]
  },
})

export default MediaDrop
