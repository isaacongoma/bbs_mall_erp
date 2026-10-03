import type { ReactNode } from 'react'
import { useListView } from '../../hooks/useListView'
import type { ListGroupData } from '../../types/listView'
import { ListGroupHeader } from './ListGroupHeader'
import { ListGroupRows } from './ListGroupRows'

export interface ListGroupsProps {
  groupHeader?: (context: { group: ListGroupData }) => ReactNode
  children?: (context: { group: ListGroupData }) => ReactNode
}

export function ListGroups({ groupHeader, children }: ListGroupsProps) {
  const list = useListView()
  const groups = list.rows as ListGroupData[]

  return (
    <div className="h-full overflow-y-auto">
      {groups.map((group) => (
        <div key={group.group}>
          {children ? (
            children({ group })
          ) : (
            <>
              <ListGroupHeader group={group}>{groupHeader?.({ group })}</ListGroupHeader>
              <ListGroupRows group={group} />
            </>
          )}
        </div>
      ))}
    </div>
  )
}
