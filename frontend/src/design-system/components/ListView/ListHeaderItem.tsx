import { useEffect, useRef, type ReactNode } from 'react'
import { useListView } from '../../hooks/useListView'
import type { ListColumn } from '../../types/listView'
import { cn } from '../../utils/cn'
import { alignClass } from '../../utils/listView'

export interface ColumnWidthUpdate {
  key: string
  width: string
  save: boolean
}

export interface ListHeaderItemProps {
  item: ListColumn
  debounce?: number
  className?: string
  onColumnWidthUpdated?: (update: ColumnWidthUpdate) => void
  prefix?: ReactNode
  suffix?: ReactNode
  resizer?: (props: { item: ListColumn }) => ReactNode
  children?: ReactNode
}

export function ListHeaderItem({
  item,
  debounce = 1000,
  className,
  onColumnWidthUpdated,
  prefix,
  suffix,
  resizer,
  children,
}: ListHeaderItemProps) {
  const list = useListView()
  const columnRef = useRef<HTMLDivElement | null>(null)
  const handleRef = useRef<HTMLDivElement | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    return () => clearTimeout(saveTimer.current)
  }, [])

  const widthInPx = (): number => {
    if (typeof item.width === 'string') {
      const parsed = parseInt(item.width)
      if (item.width.includes('rem')) return parsed * 16
      if (item.width.includes('px')) return parsed
    }
    return columnRef.current?.offsetWidth ?? 0
  }

  const startResizing = (event: React.MouseEvent) => {
    const initialX = event.clientX
    const initialWidth = widthInPx()

    const onMouseMove = (moveEvent: MouseEvent) => {
      document.body.classList.add('select-none', 'cursor-col-resize')
      if (handleRef.current) handleRef.current.style.backgroundColor = 'rgb(199 199 199)'
      const newWidth = initialWidth + (moveEvent.clientX - initialX)
      const width = `${newWidth < 50 ? 50 : newWidth}px`
      onColumnWidthUpdated?.({ key: item.key, width, save: false })
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => onColumnWidthUpdated?.({ key: item.key, width, save: true }), debounce)
    }

    const onMouseUp = () => {
      document.body.classList.remove('select-none', 'cursor-col-resize')
      if (handleRef.current) handleRef.current.style.backgroundColor = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div
      ref={columnRef}
      className={cn('group relative flex items-center', alignClass(item.align) ?? 'justify-between')}
    >
      <div className={cn('flex items-center gap-2 truncate text-sm text-ink-gray-5', className)}>
        {prefix}
        {children ?? <div className="truncate">{item.label}</div>}
        {suffix}
      </div>
      {list.options.resizeColumn &&
        (resizer ? (
          resizer({ item })
        ) : (
          <div className="flex h-4 absolute -right-2 w-2 cursor-col-resize justify-center" onMouseDown={startResizing}>
            <div
              ref={handleRef}
              className="h-full w-[2px] rounded-full transition-all duration-300 ease-in-out group-hover:bg-gray-400"
            />
          </div>
        ))}
    </div>
  )
}
