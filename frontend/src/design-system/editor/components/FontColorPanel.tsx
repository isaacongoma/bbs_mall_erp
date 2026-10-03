import type { Editor } from '@tiptap/core'
import { useNamedColorState } from '../hooks/useNamedColorState'
import { highlightSwatches, textSwatches } from '../utils/swatches'
import { ColorSwatchGrid } from './ColorSwatchGrid'
import { EditorPopover } from './EditorPopover'

export interface FontColorPanelProps {
  editor: Editor
  onClose: () => void
}

export function FontColorPanel({ editor, onClose }: FontColorPanelProps) {
  const { activeTextColor, activeHighlightColor, setText, setHighlight } = useNamedColorState(editor)

  return (
    <EditorPopover dialogLabel="Text and background color" contentClass="rounded-md p-2.5">
      <div data-slot="font-color-panel">
        <div className="text-sm text-ink-gray-7">Text Color</div>
        <ColorSwatchGrid
          swatches={textSwatches}
          active={activeTextColor}
          variant="text"
          onSelect={(value) => {
            setText(value)
            onClose()
          }}
        />
        <div className="mt-4 text-sm text-ink-gray-7">Background Color</div>
        <ColorSwatchGrid
          swatches={highlightSwatches}
          active={activeHighlightColor}
          variant="highlight"
          onSelect={(value) => {
            setHighlight(value)
            onClose()
          }}
        />
      </div>
    </EditorPopover>
  )
}
