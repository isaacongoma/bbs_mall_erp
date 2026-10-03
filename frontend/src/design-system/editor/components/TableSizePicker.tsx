import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../../utils/cn'
import { EditorPopover } from './EditorPopover'

const MAX_COLS = 8
const MAX_ROWS = 6

const STEPS: Record<string, [number, number]> = {
  ArrowDown: [1, 0],
  ArrowUp: [-1, 0],
  ArrowRight: [0, 1],
  ArrowLeft: [0, -1],
}

export interface TableSizePickerProps {
  onPick: (size: { rows: number; cols: number }) => void
}

export function TableSizePicker({ onPick }: TableSizePickerProps) {
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gridRef.current?.focus()
  }, [])

  const onKeyDown = (event: KeyboardEvent) => {
    const delta = STEPS[event.key]
    if (delta) {
      event.preventDefault()
      setRows((value) => Math.min(Math.max(value + delta[0], 1), MAX_ROWS))
      setCols((value) => Math.min(Math.max(value + delta[1], 1), MAX_COLS))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      onPick({ rows, cols })
    }
  }

  return (
    <EditorPopover dialogLabel="Insert table" contentClass="rounded-md p-2.5" autofocus={false}>
      <div data-slot="table-size-picker">
        <div
          ref={gridRef}
          tabIndex={0}
          role="grid"
          aria-label={`Table size, ${rows} rows by ${cols} columns`}
          className="grid w-max gap-1 outline-none"
          style={{ gridTemplateColumns: `repeat(${MAX_COLS}, minmax(0, 1fr))` }}
          onKeyDown={onKeyDown}
        >
          {Array.from({ length: MAX_ROWS }, (_, rowIndex) =>
            Array.from({ length: MAX_COLS }, (_, colIndex) => {
              const r = rowIndex + 1
              const c = colIndex + 1
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  tabIndex={-1}
                  className={cn(
                    'size-4 rounded-sm border',
                    r <= rows && c <= cols
                      ? 'border-outline-gray-3 bg-surface-gray-4'
                      : 'border-outline-gray-2 bg-surface-gray-1',
                  )}
                  aria-label={`${r} × ${c}`}
                  onPointerEnter={() => {
                    setRows(r)
                    setCols(c)
                  }}
                  onFocus={() => {
                    setRows(r)
                    setCols(c)
                  }}
                  onClick={() => onPick({ rows: r, cols: c })}
                />
              )
            }),
          )}
        </div>
        <div className="mt-2 text-center text-sm text-ink-gray-7">
          {rows} × {cols}
        </div>
      </div>
    </EditorPopover>
  )
}
