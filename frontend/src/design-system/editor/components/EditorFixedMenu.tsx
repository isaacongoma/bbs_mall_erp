import { useResolvedEditor } from '../hooks/useResolvedEditor'
import type { MenuItem } from '../menu'
import type { Editor } from '../types/editor'
import { MenuItems } from './MenuItems'

export interface EditorFixedMenuProps {
  editor?: Editor | null
  items: MenuItem[]
  buttonSize?: 'xs' | 'sm'
}

export function EditorFixedMenu({ editor, items, buttonSize }: EditorFixedMenuProps) {
  const resolved = useResolvedEditor(editor)
  return (
    <div data-slot="fixed-menu" className="flex items-center gap-1">
      <MenuItems editor={resolved} items={items} buttonSize={buttonSize} />
    </div>
  )
}
