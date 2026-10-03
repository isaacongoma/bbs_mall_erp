import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import type { DragContainerData, DragItemData, DragKind } from '../../utils/fieldLayoutEditor'

export interface DropContainerProps {
  containerId: string
  accepts: DragKind[]
  itemIds: string[]
  horizontal?: boolean
  className?: string
  children?: ReactNode
}

export function DropContainer({
  containerId,
  accepts,
  itemIds,
  horizontal = false,
  className,
  children,
}: DropContainerProps) {
  const data: DragContainerData = { role: 'container', accepts, containerId }
  const { setNodeRef } = useDroppable({ id: containerId, data })
  return (
    <SortableContext
      items={itemIds}
      strategy={horizontal ? horizontalListSortingStrategy : verticalListSortingStrategy}
    >
      <div ref={setNodeRef} className={className}>
        {children}
      </div>
    </SortableContext>
  )
}

export interface DragNodeApi {
  isDragging: boolean
  handleProps: HTMLAttributes<HTMLElement>
}

export interface DragNodeProps {
  kind: DragKind
  containerId: string
  itemId: string
  useHandle?: boolean
  className?: string
  children: (api: DragNodeApi) => ReactNode
}

export function DragNode({ kind, containerId, itemId, useHandle = false, className, children }: DragNodeProps) {
  const data: DragItemData = { role: 'item', kind, containerId, itemId }
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${kind}:${itemId}`,
    data,
  })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  }
  const handleProps = { ...attributes, ...listeners } as HTMLAttributes<HTMLElement>

  return (
    <div ref={setNodeRef} style={style} className={className} {...(useHandle ? {} : handleProps)}>
      {children({ isDragging, handleProps })}
    </div>
  )
}
