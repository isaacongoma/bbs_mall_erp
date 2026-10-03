import type { Editor } from '@tiptap/core'
import type { ReactNode } from 'react'

export interface InsertVideoProps {
  editor: Editor
  children: (props: { onClick: () => void }) => ReactNode
}

export function InsertVideo({ editor, children }: InsertVideoProps) {
  return <>{children({ onClick: () => editor.chain().focus().selectAndUploadVideo().run() })}</>
}
