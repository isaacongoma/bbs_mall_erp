import { useState } from 'react'
import { LucideIcon } from '../../icons'
import { cn } from '../../utils/cn'
import { clampColumns } from '../extensions/image-group/image-group-utils'
import type { ImageItem } from '../types/imageGroup'
import { ImageGroupGridCell } from './ImageGroupGridCell'

export interface ImageGroupGridProps {
  images: ImageItem[]
  columns: number
  onRemove: (index: number) => void
  onRetry: (index: number) => void
  onUpdateCaption: (payload: { index: number; caption: string }) => void
  onReorder: (payload: { from: number; to: number }) => void
}

export function ImageGroupGrid({
  images,
  columns,
  onRemove,
  onRetry,
  onUpdateCaption,
  onReorder,
}: ImageGroupGridProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const isDropTarget = (index: number) => overIndex === index && draggedIndex !== null && draggedIndex !== index

  return (
    <div
      className="mb-4 grid gap-2"
      style={{ gridTemplateColumns: `repeat(${clampColumns(columns)}, minmax(0, 1fr))` }}
    >
      {images.map((item, index) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => setDraggedIndex(index)}
          onDragOver={(event) => {
            event.preventDefault()
            setOverIndex(index)
          }}
          onDrop={() => {
            if (draggedIndex !== null && draggedIndex !== index) onReorder({ from: draggedIndex, to: index })
            setDraggedIndex(null)
            setOverIndex(null)
          }}
          onDragEnd={() => {
            setDraggedIndex(null)
            setOverIndex(null)
          }}
          onDragLeave={() => {
            if (overIndex === index) setOverIndex(null)
          }}
          className={cn(
            'group cursor-grab rounded transition-opacity active:cursor-grabbing',
            isDropTarget(index) && 'z-10 ring-2 ring-outline-gray-4 ring-offset-1',
            draggedIndex === index && 'opacity-50',
          )}
        >
          <div className="relative">
            <div
              className="absolute left-1 top-1 z-10 rounded bg-white/80 p-1 text-ink-gray-6 opacity-100 shadow-sm sm:opacity-0 sm:group-hover:opacity-100"
              aria-hidden="true"
            >
              <LucideIcon name="lucide-grip" className="size-3" />
            </div>
            <ImageGroupGridCell
              item={item}
              onRemove={() => onRemove(index)}
              onRetry={() => onRetry(index)}
              onUpdateCaption={(caption) => onUpdateCaption({ index, caption })}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
