import type { ReactNode, Ref } from 'react'
import { useListView } from '../../hooks/useListView'
import { cn } from '../../utils/cn'
import { ListRow } from './ListRow'

export interface ListRowsProps {
  className?: string
  containerRef?: Ref<HTMLDivElement>
  children?: ReactNode
}

export function ListRows({ className, containerRef, children }: ListRowsProps) {
  const list = useListView()
  return (
    <div ref={containerRef} className={cn('h-full overflow-y-auto', className)}>
      {children ?? list.rows.map((row) => <ListRow key={row[list.rowKey]} row={row} />)}
    </div>
  )
}
