import type { Editor } from '@tiptap/core'
import type { ReactNode } from 'react'

export interface InsertLinkProps {
  editor: Editor
  children: (props: { onClick: () => void }) => ReactNode
}

export function InsertLink({ editor, children }: InsertLinkProps) {
  return <>{children({ onClick: () => editor.commands.openLinkEditor() })}</>
}
