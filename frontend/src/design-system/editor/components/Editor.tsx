import type { AnyExtension } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import { useEffect, useImperativeHandle, type ReactNode, type Ref } from 'react'
import { setPlaceholder } from '../extensions'
import { EditorContext } from '../hooks/useResolvedEditor'
import { useEditor, type EditorContentValue, type EditorUploadedFile } from '../hooks/useEditor'
import type { Editor as TiptapEditor, JSONContent } from '../types/editor'

export interface EditorHandle {
  editor: TiptapEditor | null
  isEmpty: boolean
}

export interface EditorProps {
  extensions: AnyExtension[]
  value?: EditorContentValue
  onChange?: (value: string | JSONContent) => void
  format?: 'html' | 'json' | 'markdown'
  placeholder?: string
  editable?: boolean
  autofocus?: boolean
  uploadFunction?: (file: File) => Promise<EditorUploadedFile>
  onFocus?: (event: FocusEvent) => void
  onBlur?: (event: FocusEvent) => void
  onTransaction?: (editor: TiptapEditor) => void
  children?: ReactNode | ((props: { editor: TiptapEditor | null; isEmpty: boolean }) => ReactNode)
  ref?: Ref<EditorHandle>
}

export function Editor({
  extensions,
  value,
  onChange,
  format = 'html',
  placeholder,
  editable = true,
  autofocus = false,
  uploadFunction,
  onFocus,
  onBlur,
  onTransaction,
  children,
  ref,
}: EditorProps) {
  const editor = useEditor({
    value,
    onChange,
    format,
    editable,
    autofocus,
    uploadFunction,
    extensions,
    onFocus: (_editor, event) => onFocus?.(event),
    onBlur: (_editor, event) => onBlur?.(event),
    onTransaction,
  })

  const isEmpty =
    useEditorState({
      editor,
      selector: ({ editor: current }) => (current ? current.isEmpty : true),
    }) ?? true

  useEffect(() => {
    setPlaceholder(editor, placeholder ?? null)
  }, [editor, placeholder])

  useImperativeHandle(ref, () => ({ editor, isEmpty }), [editor, isEmpty])

  return (
    <EditorContext.Provider value={editor}>
      {typeof children === 'function' ? children({ editor, isEmpty }) : children}
    </EditorContext.Provider>
  )
}
