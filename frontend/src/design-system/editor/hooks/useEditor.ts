import { Extension, type EditorOptions, type JSONContent } from '@tiptap/core'
import { useEditor as useTiptapEditor } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import { useLatest } from '../../hooks/useLatest'
import type { Editor } from '../types/editor'

export type EditorContentValue = string | JSONContent | null | undefined

export interface EditorUploadedFile {
  file_url?: string
  file_name?: string
  name?: string
  [key: string]: unknown
}

export interface UseEditorOptions {
  value?: EditorContentValue
  onChange?: (value: string | JSONContent) => void
  format?: 'html' | 'json' | 'markdown'
  editable?: boolean
  autofocus?: boolean
  uploadFunction?: (file: File) => Promise<EditorUploadedFile>
  extensions: NonNullable<EditorOptions['extensions']>
  onUpdate?: (editor: Editor) => void
  onFocus?: (editor: Editor, event: FocusEvent) => void
  onBlur?: (editor: Editor, event: FocusEvent) => void
  onTransaction?: (editor: Editor) => void
}

const UploadStorage = Extension.create({
  name: 'upload',
  addStorage() {
    return { uploadFunction: null }
  },
})

function serialize(editor: Editor, format: 'html' | 'json' | 'markdown') {
  if (format === 'json') return editor.getJSON()
  if (format === 'markdown') return editor.getMarkdown()
  return editor.getHTML()
}

function assignUploadFunction(editor: Editor, uploadFunction: UseEditorOptions['uploadFunction'] | null) {
  const storage = editor.storage as typeof editor.storage & {
    upload?: { uploadFunction: UseEditorOptions['uploadFunction'] | null }
  }
  if (storage.upload) storage.upload.uploadFunction = uploadFunction
}

export function useEditor(options: UseEditorOptions): Editor | null {
  const format = options.format ?? 'html'
  const latest = useLatest(options)
  const lastEmitted = useRef<EditorContentValue>(undefined)
  const applyingExternal = useRef(false)
  const [initial] = useState(() => ({
    extensions: [UploadStorage, ...options.extensions],
    content: options.value,
    editable: options.editable ?? true,
  }))
  const isCollaboration = initial.extensions.some((extension) => extension.name === 'collaboration')

  const editor = useTiptapEditor({
    extensions: initial.extensions,
    content: isCollaboration || initial.content == null ? undefined : initial.content,
    contentType: format === 'markdown' ? 'markdown' : undefined,
    editable: initial.editable,
    autofocus: options.autofocus,
    shouldRerenderOnTransaction: false,
    onUpdate: ({ editor: current }) => {
      const o = latest()
      if (!isCollaboration && o.onChange && !applyingExternal.current) {
        const next = serialize(current, format)
        if (typeof next !== 'string' || next !== o.value) {
          lastEmitted.current = next
          o.onChange(next)
        }
      }
      o.onUpdate?.(current)
    },
    onFocus: ({ editor: current, event }) => latest().onFocus?.(current, event),
    onBlur: ({ editor: current, event }) => latest().onBlur?.(current, event),
    onTransaction: ({ editor: current }) => latest().onTransaction?.(current),
  })

  const uploadFunction = options.uploadFunction
  useEffect(() => {
    if (editor) assignUploadFunction(editor, uploadFunction ?? null)
  }, [editor, uploadFunction])

  const value = options.value
  useEffect(() => {
    if (!editor || editor.isDestroyed || isCollaboration) return
    if (value === lastEmitted.current) return
    if (format === 'html' && editor.getHTML() === value) return
    if (format === 'markdown' && editor.getMarkdown() === value) return
    if (format === 'json' && value && JSON.stringify(editor.getJSON()) === JSON.stringify(value)) return

    applyingExternal.current = true
    try {
      editor.commands.setContent(
        value ?? '',
        format === 'markdown' ? { emitUpdate: false, contentType: 'markdown' } : { emitUpdate: false },
      )
    } finally {
      applyingExternal.current = false
    }
  }, [editor, value, format, isCollaboration])

  const editable = options.editable
  useEffect(() => {
    if (editor && !editor.isDestroyed && editable !== undefined) editor.setEditable(editable)
  }, [editor, editable])

  return editor
}
