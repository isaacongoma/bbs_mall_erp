import { EditorContent as TiptapEditorContent } from '@tiptap/react'
import { useLayoutEffect, type HTMLAttributes } from 'react'
import '../../styles/editor/index.css'
import { cn } from '../../utils/cn'
import { useResolvedEditor } from '../hooks/useResolvedEditor'
import type { Editor } from '../types/editor'

export interface EditorContentProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  editor?: Editor | null
  className?: string
}

const PROSE_SIZE_OVERRIDE = /(?:^|\s)prose-(?:sm|base|lg|xl|2xl)(?:\s|$)/

export function EditorContent({ editor, className, ...rest }: EditorContentProps) {
  const resolved = useResolvedEditor(editor)
  const overridden = PROSE_SIZE_OVERRIDE.test(className ?? '')
  const editorClass = cn(overridden ? 'prose max-w-none' : 'prose max-w-none prose-v3', className)

  useLayoutEffect(() => {
    if (!resolved || resolved.isDestroyed) return
    const editorProps = resolved.options.editorProps ?? {}
    resolved.setOptions({
      editorProps: { ...editorProps, attributes: { ...editorProps.attributes, class: editorClass } },
    })
  }, [resolved, editorClass])

  return <TiptapEditorContent editor={resolved} data-slot="editor-content" {...rest} />
}
