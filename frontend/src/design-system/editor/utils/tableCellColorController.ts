import type { Editor } from '@tiptap/core'
import { TableCellColorPanel } from '../components/TableCellColorPanel'
import { openFloatingPopup, type FloatingPopupHandle } from './floatingPopup'

let activePopup: FloatingPopupHandle | null = null

export function openTableCellColorPicker(args: { editor: Editor; anchor: HTMLElement }): void {
  activePopup?.destroy()
  const rect = args.anchor.getBoundingClientRect()
  activePopup = openFloatingPopup({
    anchor: args.anchor,
    component: TableCellColorPanel,
    props: { editor: args.editor, onClose: () => activePopup?.destroy() },
    virtualReference: { getBoundingClientRect: () => rect },
    floatingOptions: { placement: 'bottom-start' },
  })
}
