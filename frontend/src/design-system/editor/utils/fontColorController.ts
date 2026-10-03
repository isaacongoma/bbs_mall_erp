import type { Editor } from '@tiptap/core'
import { FontColorPanel } from '../components/FontColorPanel'
import { openFloatingPopup, type FloatingPopupHandle } from './floatingPopup'

let activePopup: FloatingPopupHandle | null = null

export function openFontColorPicker(args: { editor: Editor; anchor: HTMLElement }): void {
  activePopup?.destroy()
  activePopup = openFloatingPopup({
    anchor: args.anchor,
    component: FontColorPanel,
    props: { editor: args.editor, onClose: () => activePopup?.destroy() },
    floatingOptions: { placement: 'bottom-start' },
  })
}
