import type { Editor } from '@tiptap/core'
import { useTableCellColorState } from '../hooks/useTableCellColorState'
import { highlightSwatches, textSwatches } from '../utils/swatches'
import { ColorSwatchGrid } from './ColorSwatchGrid'
import { EditorPopover } from './EditorPopover'

export interface TableCellColorPanelProps {
  editor: Editor
  onClose: () => void
}

export function TableCellColorPanel({ editor, onClose }: TableCellColorPanelProps) {
  const { activeBackground, activeTextColor, setBackground, setTextColor } = useTableCellColorState(editor)

  return (
    <EditorPopover dialogLabel="Cell color" contentClass="rounded-md p-2.5">
      <div data-slot="table-cell-color-panel">
        <div className="text-sm text-ink-gray-7">Cell color</div>
        <ColorSwatchGrid
          swatches={highlightSwatches}
          active={activeBackground}
          variant="highlight"
          onSelect={(value) => {
            setBackground(value)
            onClose()
          }}
        />
        <div className="mt-4 text-sm text-ink-gray-7">Text color</div>
        <ColorSwatchGrid
          swatches={textSwatches}
          active={activeTextColor}
          variant="text"
          onSelect={(value) => {
            setTextColor(value)
            onClose()
          }}
        />
      </div>
    </EditorPopover>
  )
}
