import type { Editor } from '@tiptap/core'
import { CellSelection, isInTable, selectionCell } from '@tiptap/pm/tables'
import { useEditorState } from '@tiptap/react'
import { useCallback } from 'react'
import { PALETTE_NAMES } from '../extensions/shared/color-palette'

export interface TableCellColorState {
  activeBackground: string | null
  activeTextColor: string | null
  setBackground: (name: string | null) => void
  setTextColor: (name: string | null) => void
}

function readBackground(editor: Editor): string | null {
  const { state } = editor
  if (!isInTable(state)) return null
  const { selection } = state
  const $cell = selection instanceof CellSelection ? selection.$anchorCell : selectionCell(state)
  const value = $cell?.nodeAfter?.attrs?.backgroundColor
  return typeof value === 'string' ? value : null
}

function readTextColor(editor: Editor): string | null {
  for (const name of PALETTE_NAMES) {
    if (editor.isActive('textStyle', { color: name })) return name
  }
  return null
}

export function useTableCellColorState(editor: Editor): TableCellColorState {
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      !current || current.isDestroyed
        ? { background: null, text: null }
        : { background: readBackground(current), text: readTextColor(current) },
  })

  const setBackground = useCallback(
    (name: string | null) => {
      if (editor.isDestroyed) return
      editor.chain().focus().setCellBackground(name).run()
    },
    [editor],
  )

  const setTextColor = useCallback(
    (name: string | null) => {
      if (editor.isDestroyed) return
      editor.chain().focus().setCellTextColor(name).run()
    },
    [editor],
  )

  return { activeBackground: active.background, activeTextColor: active.text, setBackground, setTextColor }
}
