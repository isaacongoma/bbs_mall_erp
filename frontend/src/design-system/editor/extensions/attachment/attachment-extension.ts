import { Node as NodeExtension, mergeAttributes, type Editor } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { AttachmentNodeView } from '../../components/AttachmentNodeView'
import { pickFiles } from '../shared/file-picker'
import { resolveUploadOptions, type MediaUploadOptions, type UploadFunction } from '../shared/media-upload-engine'
import { findNodeByUploadId } from '../shared/node-view'
import { uploadAttachment, uploadAttachmentFiles, reuploadAttachment, ATTACHMENT_NODE_NAME } from './attachment-engine'

export interface AttachmentExtensionOptions {
  uploadFunction: UploadFunction | null

  HTMLAttributes: Record<string, unknown>
}

export interface SetAttachmentOptions {
  src: string
  fileName?: string
  fileSize?: number | null
  mimeType?: string | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    attachment: {
      setAttachment: (options: SetAttachmentOptions) => ReturnType
      uploadAttachment: (file: File) => ReturnType
      uploadAttachmentFiles: (files: File[], pos?: number | null) => ReturnType
      selectAndUploadFile: () => ReturnType
      reuploadAttachment: (uploadId: string) => ReturnType
    }
  }
}

export const AttachmentExtension = NodeExtension.create<AttachmentExtensionOptions>({
  name: ATTACHMENT_NODE_NAME,

  group: 'inline',
  inline: true,
  draggable: true,
  selectable: true,
  atom: true,

  addOptions() {
    return {
      uploadFunction: null,
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      src: { default: null },
      fileName: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-file-name') || element.getAttribute('download') || null,
        renderHTML: (attributes) => (attributes.fileName ? { 'data-file-name': attributes.fileName } : {}),
      },
      fileSize: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute('data-file-size')
          const size = raw == null ? NaN : Number(raw)
          return Number.isFinite(size) ? size : null
        },
        renderHTML: (attributes) =>
          attributes.fileSize != null ? { 'data-file-size': String(attributes.fileSize) } : {},
      },
      mimeType: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-mime-type') || element.getAttribute('type') || null,
        renderHTML: (attributes) => (attributes.mimeType ? { 'data-mime-type': attributes.mimeType } : {}),
      },
      uploadId: {
        default: null,
        parseHTML: () => null,
      },
      loading: {
        default: false,
        parseHTML: () => false,
      },
      error: {
        default: null,
        parseHTML: () => null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-attachment]',
        priority: 1100,
        getAttrs: (node) => {
          if (typeof node === 'string') return {}
          const element = node as HTMLElement
          return { src: element.getAttribute('href') }
        },
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(this.options.HTMLAttributes || {}, HTMLAttributes, {
        'data-attachment': '',
        href: node.attrs.src,
        download: node.attrs.fileName || null,
        target: '_blank',
        rel: 'noopener noreferrer',
      }),
      node.attrs.fileName || 'Attachment',
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AttachmentNodeView)
  },

  addCommands() {
    const resolve = (editor: Editor): MediaUploadOptions => resolveUploadOptions({ ...this.options, editor })

    return {
      setAttachment:
        (attributes: SetAttachmentOptions) =>
        ({ commands }) => {
          if (typeof attributes.src !== 'string' || attributes.src.trim() === '') {
            return false
          }
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          })
        },

      uploadAttachment:
        (file: File) =>
        ({ editor }) => {
          void uploadAttachment(file, editor, resolve(editor))
          return true
        },

      uploadAttachmentFiles:
        (files: File[], pos?: number | null) =>
        ({ editor }) => {
          if (files.length === 0) return false
          void uploadAttachmentFiles(files, editor, pos ?? null, resolve(editor))
          return true
        },

      selectAndUploadFile:
        () =>
        ({ editor }) => {
          void pickFiles({ multiple: true }).then((files) => {
            if (editor.isDestroyed || files.length === 0) return
            editor.commands.uploadAttachmentFiles(files)
          })
          return true
        },

      reuploadAttachment:
        (uploadId: string) =>
        ({ editor }) => {
          const pos = findNodeByUploadId(editor.view, this.name, uploadId)
          if (pos === null) {
            console.error('reuploadAttachment: could not find node with uploadId', uploadId)
            return false
          }
          void reuploadAttachment(editor, pos, resolve(editor))
          return true
        },
    }
  },
})

export default AttachmentExtension
