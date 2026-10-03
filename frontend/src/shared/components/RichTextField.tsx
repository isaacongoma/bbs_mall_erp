import { useState } from 'react'
import { Editor, EditorBubbleMenu, EditorContent, EditorFixedMenu } from '@/design-system/editor'
import { buildEditorExtensions, bubbleToolbar, fullToolbar, uploadFile } from '../utils/editorConfig'

export interface RichTextFieldProps {
  content?: string
  placeholder?: string
  editable?: boolean
  editorClass?: string
  fixedMenu?: boolean
  bubbleMenu?: boolean
  onChange?: (value: string) => void
}

export function RichTextField({
  content = '',
  placeholder = '',
  editable = true,
  editorClass,
  fixedMenu = false,
  bubbleMenu = true,
  onChange,
}: RichTextFieldProps) {
  const [extensions] = useState(() => buildEditorExtensions())

  return (
    <div>
      <Editor
        extensions={extensions}
        value={content ?? ''}
        placeholder={placeholder}
        editable={editable}
        uploadFunction={(file) => uploadFile(file)}
        onChange={(value) => onChange?.(typeof value === 'string' ? value : '')}
      >
        {fixedMenu && (
          <div className="w-full overflow-x-auto rounded-t-lg border border-b-0 border-outline-gray-2 p-1">
            <EditorFixedMenu items={fullToolbar} />
          </div>
        )}
        {bubbleMenu && <EditorBubbleMenu items={bubbleToolbar} />}
        <EditorContent className={editorClass} />
      </Editor>
    </div>
  )
}
