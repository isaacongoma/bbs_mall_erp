import { FloatingMenu } from '@tiptap/react/menus'
import type { ComponentProps } from 'react'
import { useResolvedEditor } from '../hooks/useResolvedEditor'
import type { MenuItem } from '../menu'
import type { Editor } from '../types/editor'
import { MenuItems } from './MenuItems'

type FloatingOptions = ComponentProps<typeof FloatingMenu>['options']
type ShouldShow = ComponentProps<typeof FloatingMenu>['shouldShow']

export interface EditorFloatingMenuProps {
  editor?: Editor | null
  items: MenuItem[]
  options?: NonNullable<FloatingOptions> & { shouldShow?: ShouldShow }
}

export function EditorFloatingMenu({ editor, items, options }: EditorFloatingMenuProps) {
  const resolved = useResolvedEditor(editor)
  if (!resolved) return null
  const { shouldShow, ...floatingOptions } = options ?? {}

  return (
    <FloatingMenu editor={resolved} shouldShow={shouldShow} options={floatingOptions}>
      <div
        data-slot="floating-menu"
        className="flex items-center gap-1 rounded border border-outline-gray-2 bg-surface-elevation-2 p-1 shadow-sm"
      >
        <MenuItems editor={resolved} items={items} />
      </div>
    </FloatingMenu>
  )
}
