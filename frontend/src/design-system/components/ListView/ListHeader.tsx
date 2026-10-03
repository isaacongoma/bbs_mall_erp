import type { ReactNode } from 'react'
import { useListView } from '../../hooks/useListView'
import { cn } from '../../utils/cn'
import { getGridTemplateColumns } from '../../utils/listView'
import { Checkbox } from '../Checkbox'
import { ListHeaderItem, type ColumnWidthUpdate } from './ListHeaderItem'

export interface ListHeaderProps {
  className?: string
  onColumnWidthUpdated?: (update: ColumnWidthUpdate) => void
  children?: ReactNode
}

export function ListHeader({ className, onColumnWidthUpdated, children }: ListHeaderProps) {
  const list = useListView()

  return (
    <div
      className={cn('mb-2 grid items-center gap-4 rounded bg-surface-gray-2 p-2', className)}
      style={{ gridTemplateColumns: getGridTemplateColumns(list.columns, list.options.selectable) }}
    >
      {list.options.selectable && (
        <Checkbox
          className="cursor-pointer duration-300"
          value={list.allRowsSelected}
          onChange={() => undefined}
          onClick={(event) => {
            event.stopPropagation()
            list.toggleAllRows(true)
          }}
        />
      )}
      {children ??
        list.columns.map((column) => (
          <ListHeaderItem key={column.key} item={column} onColumnWidthUpdated={onColumnWidthUpdated} />
        ))}
    </div>
  )
}
