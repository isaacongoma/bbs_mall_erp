import { useState } from 'react'
import { cn } from '@/design-system'
import { Editor, EditorBubbleMenu, EditorContent, EditorFixedMenu } from '@/design-system/editor'
import { buildEditorExtensions, bubbleToolbar, fullToolbar, uploadFile } from '../../utils/editorConfig'

export interface TextEditorControlProps {
  value?: string
  placeholder?: string
  disabled?: boolean
  editorClass?: string
  variant?: 'outline' | 'subtle' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fixedMenu?: boolean
  bubbleMenu?: boolean
  onChange?: (value: string) => void
}

const VARIANT_CLASSES = {
  outline: {
    disabled: 'border border-t rounded-lg bg-surface-base',
    enabled: 'border border-t-0 rounded-b-lg bg-surface-base',
  },
  subtle: {
    disabled: 'border border-t rounded-lg bg-surface-gray-2',
    enabled: 'border border-t-0 rounded-b-lg bg-surface-gray-2',
  },
  ghost: { disabled: 'bg-transparent', enabled: 'bg-transparent' },
} as const

const SIZE_CLASSES = {
  sm: { disabled: 'prose-sm min-h-[4rem] p-2', enabled: 'prose-sm min-h-[8rem] p-2' },
  md: { disabled: 'prose-base min-h-[4rem] p-3', enabled: 'prose-base min-h-[10rem] p-3' },
  lg: { disabled: 'prose-lg min-h-[4rem] p-4', enabled: 'prose-lg min-h-[12rem] p-4' },
} as const

export function TextEditorControl({
  value = '',
  placeholder = '',
  disabled = false,
  editorClass,
  variant = 'subtle',
  size = 'sm',
  fixedMenu = true,
  bubbleMenu = false,
  onChange,
}: TextEditorControlProps) {
  const [extensions] = useState(() => buildEditorExtensions())
  const [content, setContent] = useState(value ?? '')
  const [dirty, setDirty] = useState(false)
  const [syncedValue, setSyncedValue] = useState(value ?? '')

  if (syncedValue !== (value ?? '')) {
    setSyncedValue(value ?? '')
    setContent(value ?? '')
  }

  const state = disabled ? 'disabled' : 'enabled'
  const editorClasses = cn(
    VARIANT_CLASSES[variant][state],
    SIZE_CLASSES[size][state],
    'max-h-[40vh] overflow-y-auto min-w-full',
    disabled && 'opacity-60',
    editorClass,
  )

  return (
    <Editor
      extensions={extensions}
      value={content}
      placeholder={placeholder}
      editable={!disabled}
      uploadFunction={(file) => uploadFile(file)}
      onChange={(next) => {
        const html = typeof next === 'string' ? next : ''
        setContent(html)
        if (html !== (value ?? '')) setDirty(true)
      }}
      onBlur={() => {
        if (!dirty) return
        setDirty(false)
        onChange?.(content)
      }}
    >
      <div className="relative w-full min-w-0">
        {fixedMenu && !disabled && (
          <div className="w-full overflow-x-auto rounded-t-lg border border-outline-gray-2 p-1">
            <EditorFixedMenu items={fullToolbar} />
          </div>
        )}
        {bubbleMenu && <EditorBubbleMenu items={bubbleToolbar} />}
        <EditorContent className={editorClasses} />
      </div>
    </Editor>
  )
}
