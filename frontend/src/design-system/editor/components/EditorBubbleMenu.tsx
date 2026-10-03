import { BubbleMenu } from '@tiptap/react/menus'
import type { ComponentProps } from 'react'
import { useResolvedEditor } from '../hooks/useResolvedEditor'
import type { MenuItem } from '../menu'
import type { Editor } from '../types/editor'
import { MenuItems } from './MenuItems'

type BubbleOptions = ComponentProps<typeof BubbleMenu>['options']
type ShouldShow = ComponentProps<typeof BubbleMenu>['shouldShow']

export interface EditorBubbleMenuProps {
  editor?: Editor | null
  items: MenuItem[]
  options?: NonNullable<BubbleOptions> & { shouldShow?: ShouldShow }
}

export function EditorBubbleMenu({ editor, items, options }: EditorBubbleMenuProps) {
  const resolved = useResolvedEditor(editor)
  if (!resolved) return null
  const { shouldShow, ...floatingOptions } = options ?? {}

  return (
    <BubbleMenu editor={resolved} shouldShow={shouldShow} options={floatingOptions}>
      <div
        data-slot="bubble-menu"
        className="flex items-center gap-1 rounded border border-outline-gray-2 bg-surface-elevation-2 p-1 shadow-sm"
      >
        <MenuItems editor={resolved} items={items} />
      </div>
    </BubbleMenu>
  )
}
