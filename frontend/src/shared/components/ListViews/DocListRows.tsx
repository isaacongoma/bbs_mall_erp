import { useEffect, useEffectEvent, useState, type ReactNode } from 'react'
import { __ } from '@/core/i18n'
import {
  ListGroupHeader,
  ListGroupRows,
  ListRow,
  ListRows,
  type ListGroupData,
  type ListRowData,
} from '@/design-system'
import { useLocalStorage } from '@/design-system'
import { useVisitedRecords } from '../../hooks/useVisitedRecords'

export interface DocCellContext {
  idx: number
  column: any
  item: any
  row: ListRowData
  isVisited: boolean
}

export interface DocListRowsProps {
  rows: ListRowData[]
  doctype?: string
  renderCell: (context: DocCellContext) => ReactNode
  className?: string
}

function restoreScroll(element: HTMLElement, top: number): void {
  element.scrollTop = top
}

export function DocListRows({ rows, doctype = 'CRM Lead', renderCell, className }: DocListRowsProps) {
  const [scrollPosition, setScrollPosition] = useLocalStorage<number>(`scrollPosition${doctype}`, 0)
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const { isVisited } = useVisitedRecords(doctype)

  const showGroupedRows = rows.every((row) => row.group && Array.isArray(row.rows))

  const restore = useEffectEvent((element: HTMLElement) => restoreScroll(element, scrollPosition))
  const save = useEffectEvent((element: HTMLElement) => setScrollPosition(element.scrollTop))

  useEffect(() => {
    if (!container) return
    restore(container)
    const onScroll = () => save(container)
    container.addEventListener('scroll', onScroll)
    return () => container.removeEventListener('scroll', onScroll)
  }, [container, showGroupedRows])

  const renderRow = (row: ListRowData) => (
    <ListRow key={row.name} row={row}>
      {({ idx, column, item }) => renderCell({ idx, column, item, row, isVisited: isVisited(row._seen) })}
    </ListRow>
  )

  if (showGroupedRows) {
    return (
      <div ref={setContainer} className="mx-3 mt-2 h-full overflow-y-auto sm:mx-5">
        {(rows as ListGroupData[]).map((group) => (
          <div key={group.group}>
            <ListGroupHeader group={group}>
              <div className="my-2 flex items-center gap-2 text-base-medium text-ink-gray-8">
                <div>{__(group.label)} -</div>
                <div className="flex items-center gap-1">
                  {group.icon && <GroupIcon icon={group.icon} />}
                  {group.group === ' ' ? (
                    <div className="text-ink-gray-4">{__('Empty')}</div>
                  ) : (
                    <div>{group.group}</div>
                  )}
                </div>
              </div>
            </ListGroupHeader>
            <ListGroupRows group={group}>{group.rows.map(renderRow)}</ListGroupRows>
          </div>
        ))}
      </div>
    )
  }

  return (
    <ListRows containerRef={setContainer} className={`mx-3 sm:mx-5 ${className ?? ''}`}>
      {rows.map(renderRow)}
    </ListRows>
  )
}

function GroupIcon({ icon: Icon }: { icon: React.ComponentType }) {
  return <Icon />
}
