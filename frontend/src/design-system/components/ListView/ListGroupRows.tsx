import type { ReactNode } from 'react'
import { useListView } from '../../hooks/useListView'
import type { ListGroupData } from '../../types/listView'
import { ListRow } from './ListRow'

export interface ListGroupRowsProps {
  group: ListGroupData
  children?: ReactNode
}

export function ListGroupRows({ group, children }: ListGroupRowsProps) {
  const list = useListView()
  if (list.isGroupCollapsed(group)) return null

  return (
    <div className="mb-5 mt-2">
      {children ?? (
        <>
          {group.rows.map((row) => (
            <ListRow key={row[list.rowKey]} row={row} />
          ))}
          {list.renderers.groupEmpty && group.rows.length === 0 && list.renderers.groupEmpty({ group })}
        </>
      )}
    </div>
  )
}
