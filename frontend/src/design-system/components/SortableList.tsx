import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { cn } from '../utils/cn'

export interface SortableHandleProps {
  attributes: HTMLAttributes<HTMLElement>
  listeners: Record<string, unknown> | undefined
}

export interface SortableItemState {
  index: number
  isDragging: boolean
  handle: SortableHandleProps
}

export interface SortableListProps<T> {
  items: T[]
  itemKey: keyof T | ((item: T) => string)
  onChange?: (items: T[]) => void
  onEnd?: (items: T[]) => void
  direction?: 'vertical' | 'horizontal'
  touchDelay?: number
  useHandle?: boolean
  disabled?: boolean
  className?: string
  itemClassName?: string | ((item: T, index: number) => string)
  renderItem: (item: T, state: SortableItemState) => ReactNode
}

function keyOf<T>(item: T, itemKey: SortableListProps<T>['itemKey']): string {
  return typeof itemKey === 'function' ? itemKey(item) : String(item[itemKey])
}

interface SortableRowProps {
  id: string
  index: number
  useHandle: boolean
  disabled: boolean
  className?: string
  children: (state: SortableItemState) => ReactNode
}

function SortableRow({ id, index, useHandle, disabled, className, children }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
  }
  const handle: SortableHandleProps = {
    attributes: attributes as unknown as HTMLAttributes<HTMLElement>,
    listeners: listeners as Record<string, unknown> | undefined,
  }
  const rootProps = useHandle ? {} : { ...attributes, ...listeners }

  return (
    <div ref={setNodeRef} style={style} className={className} {...rootProps}>
      {children({ index, isDragging, handle })}
    </div>
  )
}

export function SortableList<T>({
  items,
  itemKey,
  onChange,
  onEnd,
  direction = 'vertical',
  touchDelay = 200,
  useHandle = false,
  disabled = false,
  className,
  itemClassName,
  renderItem,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: touchDelay, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = items.map((item) => keyOf(item, itemKey))

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    const next = arrayMove(items, from, to)
    onChange?.(next)
    onEnd?.(next)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={ids}
        strategy={direction === 'horizontal' ? horizontalListSortingStrategy : verticalListSortingStrategy}
      >
        <div className={cn(direction === 'horizontal' && 'flex', className)}>
          {items.map((item, index) => (
            <SortableRow
              key={ids[index]}
              id={ids[index]!}
              index={index}
              useHandle={useHandle}
              disabled={disabled}
              className={typeof itemClassName === 'function' ? itemClassName(item, index) : itemClassName}
            >
              {(state) => renderItem(item, state)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
