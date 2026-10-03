import type { Editor } from '@tiptap/core'
import { ImageGroupUploadDialog } from '../../components/ImageGroupUploadDialog'
import { openImperativeModal, type ImperativeModalHandle } from '../../utils/imperativeModal'

let active: ImperativeModalHandle | null = null

export function openImageGroupUploadDialog(args: { editor: Editor; files: File[] }): void {
  active?.destroy()
  active = openImperativeModal(ImageGroupUploadDialog, { editor: args.editor, files: args.files, mode: 'new' }, () => {
    active = null
  })
}
