import type { Editor } from '@tiptap/core'
import { IframeInsertDialog } from '../../components/IframeInsertDialog'
import { openImperativeModal, type ImperativeModalHandle } from '../../utils/imperativeModal'

let active: ImperativeModalHandle | null = null

export function openIframeInsertDialog(args: {
  editor: Editor
  getReplacePos?: () => number | undefined
  initialUrl?: string
  platform?: string
}): void {
  active?.destroy()
  active = openImperativeModal(IframeInsertDialog, args, () => {
    active = null
  })
}
