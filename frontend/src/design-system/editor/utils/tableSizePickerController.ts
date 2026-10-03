import type { Editor } from '@tiptap/core'
import { TableSizePicker } from '../components/TableSizePicker'
import { openFloatingPopup, type FloatingPopupHandle } from './floatingPopup'

let activePopup: FloatingPopupHandle | null = null

export function openTableSizePicker(args: { editor: Editor; anchor?: HTMLElement; reference?: DOMRect }): void {
  activePopup?.destroy()
  const anchor = args.anchor ?? (args.editor.view.dom as HTMLElement)
  const rect = args.reference ?? anchor.getBoundingClientRect()
  activePopup = openFloatingPopup({
    anchor,
    component: TableSizePicker,
    props: {
      onPick: ({ rows, cols }: { rows: number; cols: number }) => {
        const editor = args.editor
        activePopup?.destroy()
        activePopup = null
        editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
      },
    },
    virtualReference: { getBoundingClientRect: () => rect },
    floatingOptions: { placement: 'bottom-start' },
  })
}
