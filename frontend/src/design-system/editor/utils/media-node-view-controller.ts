import type { Editor } from '@tiptap/core'
import { safeGetPos } from '../extensions/shared/node-view'
import type { MediaAlign } from './media-node-view-utils'

type GetPos = () => number | undefined

function setCursorAt(editor: Editor, pos: number): void {
  editor.commands.focus()
  editor.chain().setTextSelection(pos).scrollIntoView().run()
}

export function createParagraphAfterMedia(editor: Editor, getPos: GetPos): void {
  const pos = safeGetPos(getPos)
  if (pos === null) return
  editor.commands.focus()
  editor
    .chain()
    .setTextSelection(pos + 1)
    .createParagraphNear()
    .scrollIntoView()
    .run()
}

export function setCursorAfterMedia(editor: Editor, getPos: GetPos): void {
  const pos = safeGetPos(getPos)
  if (pos === null) return
  setCursorAt(editor, pos + 1)
}

export function setCursorBeforeMedia(editor: Editor, getPos: GetPos): void {
  const pos = safeGetPos(getPos)
  if (pos === null) return
  setCursorAt(editor, pos - 1)
}

export function selectMedia(editor: Editor, getPos: GetPos): void {
  const pos = safeGetPos(getPos)
  if (pos === null) return
  editor.commands.setNodeSelection(pos)
}

export function setMediaAlign(editor: Editor, isVideo: boolean, align: MediaAlign): void {
  editor.commands.updateAttributes(isVideo ? 'video' : 'image', { align })
}

export interface CaptionKeydownActions {
  onParagraphAfter: () => void
  onCursorAfter: () => void
  onCursorBefore: () => void
  onToggleCaption: () => void
  getCaption: () => string
}

export function handleCaptionKeydown(event: KeyboardEvent, actions: CaptionKeydownActions): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    actions.onParagraphAfter()
  } else if (event.key === 'Escape' || event.key === 'ArrowDown') {
    event.preventDefault()
    actions.onCursorAfter()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    actions.onCursorBefore()
  } else if (event.key === 'Backspace' && actions.getCaption() === '') {
    event.preventDefault()
    actions.onToggleCaption()
  }
}
