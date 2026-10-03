import type { KeyboardEvent, PointerEvent } from 'react'
import { cn } from '../../utils/cn'
import type { ResizeEdge } from '../hooks/useNodeViewResize'

export interface MediaResizeHandlesProps {
  label: string
  onResizeStart: (event: PointerEvent, edge: ResizeEdge) => void
  onResizeKeyDown: (event: KeyboardEvent) => void
}

const EDGES: readonly ResizeEdge[] = ['left', 'right']

export function MediaResizeHandles({ label, onResizeStart, onResizeKeyDown }: MediaResizeHandlesProps) {
  return (
    <>
      {EDGES.map((edge) => (
        <button
          key={edge}
          type="button"
          className={cn(
            'absolute top-1/2 z-30 flex h-8 max-h-[50%] w-4 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center bg-transparent',
            edge === 'left' ? 'left-0' : 'right-0',
          )}
          aria-label={`${label} from ${edge} edge`}
          onPointerDown={(event) => {
            event.preventDefault()
            onResizeStart(event, edge)
          }}
          onKeyDown={onResizeKeyDown}
        >
          <span className="pointer-events-none h-full w-1 rounded-full bg-black/65 ring-1 ring-white/50" />
        </button>
      ))}
    </>
  )
}
